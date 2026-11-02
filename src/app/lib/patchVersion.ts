/**
 * Patch version detection from the wiki's Module:ChampionData
 * @module lib/patchVersion
 */

const CHANGES_REGEX = /\["changes"\]\s*=\s*"V(\d+)\.(\d+)"/g

/**
 * Returns the most recent patch found in the champions' `["changes"]` fields (e.g. "V26.21").
 *
 * Each champion carries the last patch that changed it, so the first match is only the
 * first champion's (Aatrox) last change. The current patch is the highest one, compared
 * numerically on (season, patch) because "V26.9" must sort before "V26.10".
 */
export function latestPatchVersion(content: string): string | undefined {
	let best: { season: number; patch: number; label: string } | undefined

	for (const match of content.matchAll(CHANGES_REGEX)) {
		const season = Number(match[1])
		const patch = Number(match[2])
		if (!best || season > best.season || (season === best.season && patch > best.patch)) {
			best = { season, patch, label: `V${match[1]}.${match[2]}` }
		}
	}

	return best?.label
}
