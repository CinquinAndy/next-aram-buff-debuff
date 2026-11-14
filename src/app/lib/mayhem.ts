/**
 * ARAM: Mayhem values from the ARAM data and the overrides of the wiki's Mayhem page.
 * Mayhem keeps every ARAM override and adds its own layer on top (wiki, "List of mode overrides").
 * @module lib/mayhem
 */

import type { AramStats, Champion, ChampionData, ChampionMayhem, MayhemChampionOverride, MayhemData } from './types'

/** The page has a few dozen champions with overrides; far fewer means the table was not read */
export const MIN_MAYHEM_CHAMPIONS = 30

/** Lowercase letters only: "Cho'Gath" → "chogath", "Nunu & Willump" → "nunuwillump" */
export function championKey(name: string): string {
	return name.toLowerCase().replace(/[^a-z]/g, '')
}

/** Names the page uses that match neither the wiki module's key nor the apiname of older data */
const NAME_ALIASES: Record<string, string> = {
	wukong: 'monkeyking',
	nunuwillump: 'nunu',
	renataglasc: 'renata',
}

/** Find the champion a Mayhem row belongs to, by wiki name first, then by apiname */
export function findChampion(data: ChampionData, pageName: string): Champion | undefined {
	const key = championKey(pageName)
	const champions = Object.values(data)
	return (
		champions.find(champion => champion.displayName && championKey(champion.displayName) === key) ??
		champions.find(champion => championKey(champion.name) === (NAME_ALIASES[key] ?? key))
	)
}

/** Mayhem values of one champion: its ARAM stats with the overrides applied */
export function mayhemForChampion(aram: AramStats, override?: MayhemChampionOverride): ChampionMayhem {
	const stats: AramStats = { ...aram }
	for (const change of override?.stats ?? []) stats[change.stat] = change.value
	return {
		stats,
		overridden: override?.stats.map(change => change.stat) ?? [],
		abilities: override?.abilities ?? [],
	}
}

/**
 * Copy of the data where every champion has its Mayhem values.
 * Without Mayhem data, Mayhem values are the ARAM ones.
 */
export function applyMayhem(data: ChampionData, mayhem?: MayhemData): ChampionData {
	const overrides = new Map<string, MayhemChampionOverride>()
	for (const override of mayhem?.champions ?? []) {
		const champion = findChampion(data, override.name)
		if (champion) overrides.set(champion.id, override)
	}

	const result: ChampionData = {}
	for (const [id, champion] of Object.entries(data)) {
		result[id] = { ...champion, mayhem: mayhemForChampion(champion.aram, overrides.get(champion.id)) }
	}
	return result
}

/** Rows of the Mayhem page that match no champion of the data */
export function unmatchedMayhemChampions(data: ChampionData, mayhem: MayhemData): string[] {
	return mayhem.champions.filter(override => !findChampion(data, override.name)).map(override => override.name)
}

export interface WikiConflict {
	champion: string
	stat: keyof AramStats
	/** ARAM value of the wiki module (ChampionData) */
	module: number
	/** ARAM value the Mayhem page says it starts from */
	mayhemPageFrom: number
}

/**
 * Stats where the two wiki pages disagree on the ARAM value: the module says one thing,
 * the Mayhem page's "changed to X from Y" says Y. One of them is out of date.
 */
export function findWikiConflicts(data: ChampionData, mayhem: MayhemData): WikiConflict[] {
	const conflicts: WikiConflict[] = []
	for (const override of mayhem.champions) {
		const champion = findChampion(data, override.name)
		if (!champion) continue
		for (const change of override.stats) {
			if (change.from === undefined) continue
			const moduleValue = champion.aram[change.stat] ?? 1
			if (Math.abs(moduleValue - change.from) > 1e-6) {
				conflicts.push({ champion: override.name, stat: change.stat, module: moduleValue, mayhemPageFrom: change.from })
			}
		}
	}
	return conflicts
}

/** A champion released after the module was last copied may be missing; more than this means names broke */
export const MAX_UNMATCHED_MAYHEM = 3

export interface MayhemValidation {
	ok: boolean
	errors: string[]
	/** Rows matching no champion: their overrides are not shown */
	unmatched: string[]
}

/** Checks before Mayhem data may replace the stored copy */
export function validateMayhemData(mayhem: MayhemData, data: ChampionData): MayhemValidation {
	const errors: string[] = []
	if (mayhem.champions.length < MIN_MAYHEM_CHAMPIONS) {
		errors.push(`only ${mayhem.champions.length} champions in the Mayhem table (minimum ${MIN_MAYHEM_CHAMPIONS})`)
	}
	const unmatched = unmatchedMayhemChampions(data, mayhem)
	if (unmatched.length > MAX_UNMATCHED_MAYHEM) {
		errors.push(`${unmatched.length} unknown champions in the Mayhem table: ${unmatched.join(', ')}`)
	}
	if (mayhem.globalChanges.length === 0) errors.push('no "Global stat changes" in the Mayhem page')
	return { ok: errors.length === 0, errors, unmatched }
}
