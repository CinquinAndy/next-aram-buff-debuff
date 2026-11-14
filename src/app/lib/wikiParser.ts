/**
 * Pure parser for the League of Legends Wiki `Module:ChampionData/data` Lua table.
 * No network, no Next.js, no PocketBase: it takes the page text and returns champion data.
 * Accepts the rendered module page (HTML, Lua inside a <pre>) or the bare Lua source.
 * @module lib/wikiParser
 */

import type {
	AramStats,
	ChampionBaseStats,
	ChampionData,
	FullChampionData,
	GameModeModifiers,
	GameModeStats,
} from './types'

/** Game modes found in the module's `stats` block */
export const GAME_MODES = ['aram', 'urf', 'usb', 'ofa', 'nb', 'ar'] as const

/**
 * Wiki keys read inside a game mode block, mapped to the app's stat names.
 * The wiki renamed some keys over time (`total_as`, `energyregen_mod`): both spellings are kept.
 */
const MODE_KEY_ALIASES: Record<string, keyof GameModeStats> = {
	dmg_dealt: 'dmg_dealt',
	dmg_taken: 'dmg_taken',
	healing: 'healing',
	shielding: 'shielding',
	ability_haste: 'ability_haste',
	attack_speed: 'attack_speed',
	total_as: 'attack_speed',
	energy_regen: 'energy_regen',
	energyregen_mod: 'energy_regen',
	tenacity: 'tenacity',
}

const BASE_STAT_KEYS: (keyof ChampionBaseStats)[] = [
	'hp_base',
	'hp_lvl',
	'mp_base',
	'mp_lvl',
	'arm_base',
	'arm_lvl',
	'mr_base',
	'mr_lvl',
	'hp5_base',
	'hp5_lvl',
	'mp5_base',
	'mp5_lvl',
	'dam_base',
	'dam_lvl',
	'as_base',
	'as_lvl',
	'range',
	'ms',
	'acquisition_radius',
	'selection_height',
	'selection_radius',
	'pathing_radius',
	'as_ratio',
	'attack_cast_time',
	'attack_total_time',
	'attack_delay_offset',
	'missile_speed',
]

/**
 * Decode the HTML entities MediaWiki uses inside a <pre> (named and numeric).
 */
export function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&')
}

/**
 * Extract the Lua table (`{ ... }` after `return`) from the page or the raw source.
 * Must run before comment stripping: the `-- <pre>` marker is itself a Lua comment.
 */
export function extractLuaTable(content: string): string | null {
	const decoded = decodeHtmlEntities(content)
	const patterns = [/-- <pre>\s*return\s*({[\s\S]*?})\s*--\s*<\/pre>/m, /return\s*({[\s\S]*})\s*$/]

	for (const pattern of patterns) {
		const match = decoded.match(pattern)
		if (match) return match[1].trim()
	}
	return null
}

/**
 * Remove Lua line comments (`-- ...`), ignoring `--` inside double-quoted strings.
 * The wiki comments out whole blocks this way (e.g. Kled & Skaarl's ARAM block).
 */
export function stripLuaComments(lua: string): string {
	return lua
		.split('\n')
		.map(line => {
			let inString = false
			for (let i = 0; i < line.length; i++) {
				const char = line[i]
				if (char === '\\' && inString) {
					i++
					continue
				}
				if (char === '"') inString = !inString
				else if (!inString && char === '-' && line[i + 1] === '-') return line.slice(0, i)
			}
			return line
		})
		.join('\n')
}

function extractString(block: string, key: string): string | undefined {
	const match = block.match(new RegExp(`\\["${key}"\\]\\s*=\\s*"([^"]*)"`))
	return match?.[1]
}

function extractNumber(block: string, key: string): number | undefined {
	const match = block.match(new RegExp(`\\["${key}"\\]\\s*=\\s*([+-]?\\d*\\.?\\d+)`))
	return match ? Number.parseFloat(match[1]) : undefined
}

function extractStringArray(block: string, key: string): string[] | undefined {
	const match = block.match(new RegExp(`\\["${key}"\\]\\s*=\\s*\\{([^}]*)\\}`))
	if (!match) return undefined
	const items = [...match[1].matchAll(/"([^"]+)"/g)].map(m => m[1])
	return items.length > 0 ? items : undefined
}

function extractStatsBlock(championBlock: string): string | null {
	const statsStart = championBlock.indexOf('["stats"]')
	if (statsStart === -1) return null

	let depth = 0
	let start = -1
	for (let i = statsStart; i < championBlock.length; i++) {
		if (championBlock[i] === '{') {
			if (start === -1) start = i
			depth++
		} else if (championBlock[i] === '}') {
			depth--
			if (depth === 0) return championBlock.substring(start, i + 1)
		}
	}
	return null
}

function extractBaseStats(statsBlock: string): Partial<ChampionBaseStats> {
	const stats: Partial<ChampionBaseStats> = {}
	for (const key of BASE_STAT_KEYS) {
		const value = extractNumber(statsBlock, key)
		if (value !== undefined) stats[key] = value
	}
	return stats
}

function extractGameModeStats(statsBlock: string, mode: string): GameModeStats | undefined {
	const match = statsBlock.match(new RegExp(`\\["${mode}"\\]\\s*=\\s*\\{([^}]+)\\}`))
	if (!match) return undefined

	const stats: GameModeStats = {}
	for (const statMatch of match[1].matchAll(/\["?([^"\]]+)"?\]\s*=\s*([+-]?\d*\.?\d+)/g)) {
		const key = MODE_KEY_ALIASES[statMatch[1].trim().toLowerCase()]
		const value = Number.parseFloat(statMatch[2])
		if (key && !Number.isNaN(value)) stats[key] = value
	}
	return Object.keys(stats).length > 0 ? stats : undefined
}

function extractAllGameModes(statsBlock: string): GameModeModifiers {
	const modes: GameModeModifiers = {}
	for (const mode of GAME_MODES) {
		const modeStats = extractGameModeStats(statsBlock, mode)
		if (modeStats) modes[mode] = modeStats
	}
	return modes
}

/**
 * ARAM stats with 1 as the "unmodified" value for every stat.
 * The UI treats 1 as "no change" everywhere, ability haste included, so the default stays 1.
 */
export function toAramStats(modeStats?: GameModeStats): AramStats {
	return {
		dmg_dealt: modeStats?.dmg_dealt ?? 1,
		dmg_taken: modeStats?.dmg_taken ?? 1,
		healing: modeStats?.healing ?? 1,
		shielding: modeStats?.shielding ?? 1,
		ability_haste: modeStats?.ability_haste ?? 1,
		attack_speed: modeStats?.attack_speed ?? 1,
		energy_regen: modeStats?.energy_regen ?? 1,
		tenacity: modeStats?.tenacity ?? 1,
	}
}

function extractSkills(block: string): Record<string, string[]> | undefined {
	const skills: Record<string, string[]> = {}
	for (const key of ['skill_i', 'skill_q', 'skill_w', 'skill_e', 'skill_r', 'skills']) {
		const values = extractStringArray(block, key)
		if (values) skills[key] = values
	}
	return Object.keys(skills).length > 0 ? skills : undefined
}

function parseChampionBlock(block: string): FullChampionData | null {
	const id = extractNumber(block, 'id')
	const apiname = extractString(block, 'apiname')
	if (!id || !apiname) return null

	const fullData: FullChampionData = {
		id,
		apiname,
		title: extractString(block, 'title'),
		difficulty: extractNumber(block, 'difficulty'),
		herotype: extractString(block, 'herotype'),
		alttype: extractString(block, 'alttype'),
		resource: extractString(block, 'resource'),
		rangetype: extractString(block, 'rangetype'),
		date: extractString(block, 'date'),
		patch: extractString(block, 'patch'),
		changes: extractString(block, 'changes'),
		adaptivetype: extractString(block, 'adaptivetype'),
		damage: extractNumber(block, 'damage'),
		toughness: extractNumber(block, 'toughness'),
		control: extractNumber(block, 'control'),
		mobility: extractNumber(block, 'mobility'),
		utility: extractNumber(block, 'utility'),
		style: extractNumber(block, 'style'),
		be: extractNumber(block, 'be'),
		rp: extractNumber(block, 'rp'),
		role: extractStringArray(block, 'role'),
		client_positions: extractStringArray(block, 'client_positions'),
		external_positions: extractStringArray(block, 'external_positions'),
	}

	const statsBlock = extractStatsBlock(block)
	if (statsBlock) {
		const baseStats = extractBaseStats(statsBlock)
		if (Object.keys(baseStats).length > 0) fullData.stats = baseStats as ChampionBaseStats
		const gameModes = extractAllGameModes(statsBlock)
		if (Object.keys(gameModes).length > 0) fullData.gameModes = gameModes
	}

	const skills = extractSkills(block)
	if (skills) fullData.skills = skills

	return fullData
}

/**
 * Parse the module page (HTML or raw Lua) into champion data keyed by champion id.
 * Alternate forms with a fractional id (GnarBig 150.2, "Kled & Skaarl" 240.1) are skipped:
 * they are the same champion as the integer id and would show up as duplicate cards.
 * @throws Error when no Lua table is found
 */
export function parseChampionData(content: string): ChampionData {
	const table = extractLuaTable(content)
	if (!table) throw new Error('No Lua table found in the wiki page')

	const lua = stripLuaComments(table)
	const championData: ChampionData = {}
	const championRegex = /\["([^"]+)"\]\s*=\s*\{((?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*)\}/g

	for (const match of lua.matchAll(championRegex)) {
		const fullData = parseChampionBlock(match[2])
		if (!fullData || !Number.isInteger(fullData.id)) continue

		const id = fullData.id.toString()
		championData[id] = {
			id,
			name: fullData.apiname,
			displayName: match[1],
			aram: toAramStats(fullData.gameModes?.aram),
			fullData,
		}
	}

	return championData
}

/** True when at least one ARAM stat differs from the "unmodified" value 1 */
export function hasAramChanges(stats: AramStats): boolean {
	return Object.values(stats).some(value => value !== undefined && value !== 1)
}
