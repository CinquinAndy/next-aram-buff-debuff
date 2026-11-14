/**
 * Pure parser for the League of Legends Wiki page "ARAM: Mayhem" (rendered HTML).
 * Reads the "Global stat changes" list and the Champions table of "List of mode overrides":
 * per champion, the special modifiers ("Damage dealt changed to 0% from +5%") and the ability changes.
 * No network, no Next.js, no PocketBase.
 * @module lib/mayhemParser
 */

import type { AbilityChange, AramStats, MayhemChampionOverride, MayhemData, MayhemStatChange } from './types'

/** Labels used on the page, mapped to the app's stat names */
const STAT_LABELS: Record<string, keyof AramStats> = {
	'damage dealt': 'dmg_dealt',
	'damage received': 'dmg_taken',
	'damage taken': 'dmg_taken',
	'healing done': 'healing',
	healing: 'healing',
	'shielding done': 'shielding',
	shielding: 'shielding',
	'ability haste': 'ability_haste',
	'attack speed': 'attack_speed',
	'total attack speed': 'attack_speed',
	tenacity: 'tenacity',
	'energy regeneration': 'energy_regen',
	'energy regen': 'energy_regen',
}

const STAT_LINE = /^(.+?) changed to ([+\-−]?\d+(?:\.\d+)?)(%?)(?: from ([+\-−]?\d+(?:\.\d+)?)%?)?\.?$/i

export class MayhemParseError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'MayhemParseError'
	}
}

/** Decode the HTML entities MediaWiki writes (named and numeric) */
function decodeEntities(text: string): string {
	return text
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&')
}

/**
 * Visible text of an HTML fragment. Keyword icons ("Melee", "Ranged") become their word,
 * inline tags join without a space ("5.<small>0</small>" → "5.0").
 */
export function htmlToText(fragment: string): string {
	const text = fragment
		.replace(/<img[^>]*alt="An icon representing the keyword ([^"]+)"[^>]*>/g, ' $1 ')
		.replace(/<img[^>]*>/g, '')
		.replace(/<\/?(?:li|ul|p|div|br|td|tr)[^>]*>/gi, ' ')
		.replace(/<[^>]+>/g, '')
	return decodeEntities(text)
		.replace(/\s+/g, ' ')
		.replace(/\s+([.,)%])/g, '$1')
		.replace(/\(\s+/g, '(')
		.trim()
}

/**
 * Text of each <li> directly in the fragment's lists. A nested list is joined into its parent:
 * "All champions gain the following stats: base health; bonus mana regeneration; …"
 */
function listItems(fragment: string): string[] {
	const items: string[] = []
	let depth = 0
	let start = -1
	for (const match of fragment.matchAll(/<(\/?)li\b[^>]*>/gi)) {
		const closing = match[1] === '/'
		if (!closing) {
			if (depth === 0) start = (match.index ?? 0) + match[0].length
			depth++
		} else if (depth > 0) {
			depth--
			if (depth === 0 && start >= 0) {
				const nested = fragment.slice(start, match.index).replace(/<\/li>\s*(?=<li\b)/gi, '; ')
				items.push(htmlToText(nested))
			}
		}
	}
	return items.filter(Boolean)
}

/** HTML between the heading with this id and the next heading of the same or a higher level */
function section(html: string, id: string): string | null {
	const at = html.indexOf(`id="${id}"`)
	if (at === -1) return null
	const level = html.slice(at - 40, at).match(/<h([1-6])[^>]*$/)?.[1] ?? '3'
	const rest = html.slice(at)
	const next = rest.slice(1).search(new RegExp(`<h[1-${level}][\\s>]`))
	return next === -1 ? rest : rest.slice(0, next + 1)
}

function toNumber(raw: string): number {
	return Number.parseFloat(raw.replace('−', '-'))
}

/** "+5" (percent) → 1.05; ability haste stays flat. 0 haste is stored as 1, the app's "unmodified" value */
function toAppUnits(stat: keyof AramStats, raw: string, isPercent: boolean): number {
	const value = toNumber(raw)
	if (stat === 'ability_haste' && !isPercent) return value === 0 ? 1 : value
	return Math.round((1 + value / 100) * 10000) / 10000
}

/** "Damage dealt changed to 0% from +5%." → { stat, value, from }, or null for an unknown label */
export function parseStatLine(line: string): MayhemStatChange | null {
	const match = line.trim().match(STAT_LINE)
	if (!match) return null
	const stat = STAT_LABELS[match[1].trim().toLowerCase()]
	if (!stat) return null
	const isPercent = match[3] === '%'
	const change: MayhemStatChange = { stat, value: toAppUnits(stat, match[2], isPercent) }
	if (match[4] !== undefined) change.from = toAppUnits(stat, match[4], isPercent)
	return change
}

/** Ability changes cell: an ability icon + name, then a list of bullets, repeated */
function parseAbilities(cell: string): AbilityChange[] {
	const abilities: AbilityChange[] = []
	const parts = cell.split(/(?=<span[^>]*class="[^"]*ability-icon)/)
	for (const part of parts) {
		const name = part.match(/data-ability="([^"]+)"/)?.[1]
		const changes = listItems(part)
		if (changes.length === 0) continue
		abilities.push({ ability: name ? decodeEntities(name) : 'General', changes })
	}
	// "General" blocks have no icon: their bullets follow a plain label
	if (abilities.length === 0) {
		const changes = listItems(cell)
		if (changes.length > 0) abilities.push({ ability: 'General', changes })
	}
	return abilities
}

function cells(row: string): string[] {
	return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match => match[1])
}

/**
 * The part of the page the parser reads, from the "Mode-Specific Changes" heading to the end of
 * the Champions table, as a small standalone page. The full page changes on every render
 * (parser report, caches); this extract only changes when the overrides do.
 * @throws MayhemParseError when the page has neither
 */
export function extractMayhemSection(html: string): string {
	const heading = html.indexOf('id="Mode-Specific_Changes"')
	const tabStart = html.indexOf('data-title="Champions"')
	const tableEnd = tabStart === -1 ? -1 : html.indexOf('</table>', tabStart)
	if (heading === -1 || tableEnd === -1) throw new MayhemParseError('No mode-specific changes in the page')
	const start = html.lastIndexOf('<div', heading)
	return `<!DOCTYPE html>\n<html><body>\n${html.slice(start, tableEnd + '</table>'.length)}\n</div></div>\n</body></html>\n`
}

/**
 * Parse the ARAM: Mayhem page.
 * @throws MayhemParseError when the champions table or a stat line cannot be read
 */
export function parseMayhemPage(html: string): MayhemData {
	const global = section(html, 'Global_stat_changes')
	const globalChanges = global ? listItems(global) : []

	const tabStart = html.indexOf('data-title="Champions"')
	if (tabStart === -1) throw new MayhemParseError('No Champions tab in the page')
	const tableEnd = html.indexOf('</table>', tabStart)
	if (tableEnd === -1) throw new MayhemParseError('Champions table is not closed')
	const table = html.slice(tabStart, tableEnd)

	const champions: MayhemChampionOverride[] = []
	const unreadable: string[] = []

	for (const row of table.split(/<tr[^>]*>/).slice(1)) {
		const name = row.match(/data-champion="([^"]+)"/)?.[1]
		const [, general = '', abilityCell = ''] = cells(row)
		if (!name) continue

		const stats: MayhemStatChange[] = []
		for (const line of listItems(general)) {
			const change = parseStatLine(line)
			if (change) stats.push(change)
			else unreadable.push(`${decodeEntities(name)}: "${line}"`)
		}

		champions.push({ name: decodeEntities(name), stats, abilities: parseAbilities(abilityCell) })
	}

	if (unreadable.length > 0) {
		throw new MayhemParseError(`Unreadable stat lines: ${unreadable.join('; ')}`)
	}

	return { champions, globalChanges }
}
