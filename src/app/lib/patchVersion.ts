/**
 * Patch versions: current game patch (Data Dragon) and data revision (wiki module)
 * @module lib/patchVersion
 */

import type { ChampionData } from './types'

const CHANGES_REGEX = /\["changes"\]\s*=\s*"V(\d+)\.(\d+)"/g
const PATCH_REGEX = /^V?(\d+)\.(\d+)/

/**
 * Data Dragon kept the old numbering when Riot renamed patches after the year in 2025:
 * 14.24 is patch 14.24, but 15.x is patch 25.x and "16.21.1" is patch 26.21.
 */
const DDRAGON_YEAR_NAMING_FROM = 15
const DDRAGON_SEASON_OFFSET = 10

export interface Patch {
	season: number
	patch: number
}

export function parsePatch(label: string | undefined): Patch | undefined {
	const match = label?.match(PATCH_REGEX)
	if (!match) return undefined
	return { season: Number(match[1]), patch: Number(match[2]) }
}

export function formatPatch({ season, patch }: Patch): string {
	return `V${season}.${patch}`
}

/** Negative when a is older than b, 0 when equal, positive when newer */
export function comparePatches(a: Patch, b: Patch): number {
	return a.season - b.season || a.patch - b.patch
}

/**
 * Number of patches between two versions, assuming about 24 patches a season.
 * Only used to tell "a patch or two behind" from "months behind".
 */
export function patchDistance(older: Patch, newer: Patch): number {
	return (newer.season - older.season) * 24 + (newer.patch - older.patch)
}

/**
 * Turns the first entry of Data Dragon's versions.json ("16.21.1") into the game patch ("V26.21").
 */
export function patchFromDdragonVersion(version: string): string | undefined {
	const parsed = parsePatch(version)
	if (!parsed) return undefined
	const season = parsed.season >= DDRAGON_YEAR_NAMING_FROM ? parsed.season + DDRAGON_SEASON_OFFSET : parsed.season
	return formatPatch({ season, patch: parsed.patch })
}

function latest(labels: Iterable<string | undefined>): string | undefined {
	let best: Patch | undefined
	for (const label of labels) {
		const parsed = parsePatch(label)
		if (parsed && (!best || comparePatches(parsed, best) > 0)) best = parsed
	}
	return best ? formatPatch(best) : undefined
}

/**
 * Returns the most recent patch found in the champions' `["changes"]` fields (e.g. "V26.21").
 *
 * Each champion carries the last patch that changed it, so the first match is only the
 * first champion's (Aatrox) last change. The current patch is the highest one, compared
 * numerically on (season, patch) because "V26.9" must sort before "V26.10".
 */
export function latestPatchVersion(content: string): string | undefined {
	return latest(Array.from(content.matchAll(CHANGES_REGEX), m => `V${m[1]}.${m[2]}`))
}

/**
 * Same as latestPatchVersion, on parsed data: the data revision of a champion data set.
 */
export function dataRevision(data: ChampionData): string | undefined {
	return latest(Object.values(data).map(champion => champion.fullData?.changes))
}
