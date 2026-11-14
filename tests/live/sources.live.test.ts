/**
 * Live checks against the real sources. They fail when the data is empty, refused or old:
 * - the wiki module page parses into a valid data set,
 * - its data revision is at most MAX_PATCH_LAG patches behind the current game patch,
 * - with PROD_URL set, the production site serves the current patch and fresh data.
 * Run by the scheduled `donnees-wiki` workflow, not on pull requests.
 */
import { describe, expect, it } from 'vitest'
import { SOURCES_CONFIG } from '@/app/config/sources'
import { checkFreshness, MIN_CHAMPIONS, validateChampionData } from '@/app/lib/dataValidation'
import { MIN_MAYHEM_CHAMPIONS, validateMayhemData } from '@/app/lib/mayhem'
import { parseMayhemPage } from '@/app/lib/mayhemParser'
import { dataRevision, patchFromDdragonVersion } from '@/app/lib/patchVersion'
import { parseChampionData } from '@/app/lib/wikiParser'
import { HttpService } from '@/app/services/http'

async function currentPatch(): Promise<string | undefined> {
	const { text } = await HttpService.fetchText(SOURCES_CONFIG.DDRAGON_VERSIONS_URL, 'application/json')
	return patchFromDdragonVersion(JSON.parse(text)[0])
}

describe('wiki module page', () => {
	it('parses into a valid, up-to-date data set', async () => {
		const { text } = await HttpService.fetchText(SOURCES_CONFIG.DATA_SOURCES[0].url)
		const data = parseChampionData(text)

		const validation = validateChampionData(data)
		expect(validation.errors).toEqual([])

		const freshness = checkFreshness(dataRevision(data), await currentPatch())
		expect(freshness.error).toBeUndefined()
	})
})

describe('ARAM: Mayhem page', () => {
	it('parses into overrides that match the champions of the module', async () => {
		const module = await HttpService.fetchText(SOURCES_CONFIG.DATA_SOURCES[0].url)
		const page = await HttpService.fetchText(SOURCES_CONFIG.MAYHEM_SOURCES[0].url)

		const validation = validateMayhemData(parseMayhemPage(page.text), parseChampionData(module.text))
		expect(validation.errors).toEqual([])
	})
})

describe.runIf(process.env.PROD_URL)('production site', () => {
	it('serves the current patch and recent data', async () => {
		const response = await fetch(`${process.env.PROD_URL}/api/refresh/info`, { cache: 'no-store' })
		expect(response.status).toBe(200)
		const info = await response.json()

		expect(info.championsCount).toBeGreaterThanOrEqual(MIN_CHAMPIONS)
		const patch = await currentPatch()
		expect(info.patchVersion).toBe(patch)
		expect(checkFreshness(info.dataRevision, patch).error).toBeUndefined()
		expect(info.mayhem?.championsCount).toBeGreaterThanOrEqual(MIN_MAYHEM_CHAMPIONS)
	})
})
