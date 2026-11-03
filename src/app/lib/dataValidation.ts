/**
 * Checks run on freshly parsed wiki data before it may replace the cached copy.
 * A broken page, a Cloudflare challenge or a partial response must never overwrite good data.
 * @module lib/dataValidation
 */

import { comparePatches, dataRevision, parsePatch, patchDistance } from './patchVersion'
import type { ChampionData } from './types'
import { hasAramChanges } from './wikiParser'

/** The game has about 170 champions; far fewer means the page was cut or not parsed */
export const MIN_CHAMPIONS = 150
/** About 130 champions have ARAM changes; a handful means the mode blocks were not read */
export const MIN_ARAM_CHANGED = 50
/** A new data set may not lose more than this share of the champions of the stored one */
export const MAX_CHAMPION_DROP = 0.1

export interface ValidationResult {
	ok: boolean
	errors: string[]
	championsCount: number
	aramChangedCount: number
	revision?: string
}

/**
 * Validate parsed champion data, optionally against the data currently stored.
 */
export function validateChampionData(data: ChampionData, previous?: ChampionData): ValidationResult {
	const champions = Object.values(data)
	const championsCount = champions.length
	const aramChangedCount = champions.filter(champion => hasAramChanges(champion.aram)).length
	const revision = dataRevision(data)
	const errors: string[] = []

	if (championsCount < MIN_CHAMPIONS) {
		errors.push(`only ${championsCount} champions (minimum ${MIN_CHAMPIONS})`)
	}
	if (aramChangedCount < MIN_ARAM_CHANGED) {
		errors.push(`only ${aramChangedCount} champions with ARAM changes (minimum ${MIN_ARAM_CHANGED})`)
	}

	const invalid = champions.filter(
		champion =>
			!champion.name || Object.values(champion.aram).some(value => value !== undefined && !Number.isFinite(value))
	)
	if (invalid.length > 0) {
		errors.push(`invalid values for ${invalid.map(champion => champion.name || champion.id).join(', ')}`)
	}

	if (!revision) errors.push('no patch found in the "changes" fields')

	if (previous) {
		const previousCount = Object.keys(previous).length
		if (championsCount < previousCount * (1 - MAX_CHAMPION_DROP)) {
			errors.push(`champion count dropped from ${previousCount} to ${championsCount}`)
		}

		const newPatch = parsePatch(revision)
		const previousPatch = parsePatch(dataRevision(previous))
		if (newPatch && previousPatch && comparePatches(newPatch, previousPatch) < 0) {
			errors.push(`data revision ${revision} is older than the stored ${dataRevision(previous)}`)
		}
	}

	return { ok: errors.length === 0, errors, championsCount, aramChangedCount, revision }
}

/**
 * The wiki updates the module within a few days of a patch; more than this many patches
 * between the data revision and the game patch means the data is out of date.
 */
export const MAX_PATCH_LAG = 2

/**
 * Tell whether the data revision (latest "changes" patch) is close enough to the current game patch.
 */
export function checkFreshness(
	revision: string | undefined,
	currentPatch: string | undefined
): { ok: boolean; lag?: number; error?: string } {
	const data = parsePatch(revision)
	const current = parsePatch(currentPatch)
	if (!data) return { ok: false, error: `no data revision (${revision})` }
	if (!current) return { ok: false, error: `no current patch (${currentPatch})` }

	const lag = patchDistance(data, current)
	if (lag > MAX_PATCH_LAG) {
		return { ok: false, lag, error: `data revision ${revision} is ${lag} patches behind ${currentPatch}` }
	}
	return { ok: true, lag }
}
