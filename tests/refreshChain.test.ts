/**
 * Integration test of the whole refresh chain with the network mocked at the fetch level:
 * sources (wiki, GitHub snapshot) → parse → validation → PocketBase, and the background refresh.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChampionData } from '@/app/lib/types'
import type { WikiFetchResult } from '@/app/services/PocketBaseService'
import { fixture } from './helpers'

vi.mock('@/app/services/ImageService', () => ({
	ImageService: { getInstance: () => ({ ensureChampionImages: async () => new Map<string, string>() }) },
}))

const WIKI = 'https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data'
const SNAPSHOT = 'https://raw.githubusercontent.com/CinquinAndy/next-aram-buff-debuff/donnees-wiki/ChampionData.lua'
const DDRAGON = 'https://ddragon.leagueoflegends.com/api/versions.json'
const PB_RECORD = 'https://lol.andy-cinquin.fr/api/collections/data/records/latestaramdata1'

const page = fixture('module-page.html')

type Responder = (init?: RequestInit) => Response

interface FakeNetwork {
	routes: Map<string, Responder>
	saved: WikiFetchResult[]
	requests: { url: string; init?: RequestInit }[]
}

function text(body: string, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(body, { status, headers })
}

/** Stored record as PocketBase returns it */
function pbRecord(content: Partial<WikiFetchResult> & { data: ChampionData; timestamp: number }): Response {
	return text(JSON.stringify({ id: 'latestaramdata1', content }), 200, { 'content-type': 'application/json' })
}

function installNetwork(stored?: Partial<WikiFetchResult> & { data: ChampionData; timestamp: number }): FakeNetwork {
	const network: FakeNetwork = { routes: new Map(), saved: [], requests: [] }
	network.routes.set(WIKI, () => text(page, 200, { 'last-modified': 'Thu, 22 Oct 2026 06:00:04 GMT' }))
	network.routes.set(SNAPSHOT, () => text('404: Not Found', 404))
	network.routes.set(DDRAGON, () => text(JSON.stringify(['16.21.1', '16.20.1'])))
	network.routes.set(PB_RECORD, init => {
		if (init?.method === 'PATCH') {
			network.saved.push(JSON.parse(String(init.body)).content)
			return text('{}')
		}
		return stored ? pbRecord(stored) : text('{"message":"not found"}', 404)
	})

	vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
		network.requests.push({ url, init })
		const route = network.routes.get(url)
		if (!route) throw new Error(`unexpected request to ${url}`)
		return route(init)
	})
	return network
}

/** The services are singletons: load fresh modules for every test */
async function loadService() {
	vi.resetModules()
	const { WikiDataService } = await import('@/app/services/WikiDataService')
	return WikiDataService.getInstance()
}

async function storedV2523(): Promise<{ data: ChampionData; timestamp: number; patchVersion: string }> {
	const { parseChampionData } = await import('@/app/lib/wikiParser')
	const data = parseChampionData(page)
	for (const champion of Object.values(data)) {
		if (champion.fullData) champion.fullData.changes = 'V25.23'
	}
	return { data, timestamp: Date.now() - 340 * 24 * 3600 * 1000, patchVersion: 'V25.23' }
}

beforeEach(() => {
	vi.spyOn(console, 'info').mockImplementation(() => {})
	vi.spyOn(console, 'warn').mockImplementation(() => {})
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('refresh chain', () => {
	it('fetches the wiki page, validates it and saves it with the current patch', async () => {
		const network = installNetwork(await storedV2523())
		const service = await loadService()

		const result = await service.getData({ forceRefresh: true })

		expect(result.fromCache).toBe(false)
		expect(result.source).toBe('wiki')
		expect(result.patchVersion).toBe('V26.21')
		expect(result.dataRevision).toBe('V26.21')
		expect(result.sourceUpdatedAt).toBe('2026-10-22T06:00:04.000Z')
		expect(Object.keys(result.data)).toHaveLength(173)

		expect(network.saved).toHaveLength(1)
		expect(network.saved[0].patchVersion).toBe('V26.21')
		expect(Object.keys(network.saved[0].data)).toHaveLength(173)

		const wikiRequest = network.requests.find(request => request.url === WIKI)
		const headers = new Headers(wikiRequest?.init?.headers)
		expect(headers.get('user-agent')).toMatch(/^AramBalancesChecker\//)
		expect(headers.get('cookie')).toBeNull()
	})

	it('falls back to the GitHub snapshot when the wiki answers 403', async () => {
		const network = installNetwork(await storedV2523())
		network.routes.set(WIKI, () => text('<title>Just a moment...</title>', 403, { 'cf-mitigated': 'challenge' }))
		network.routes.set(SNAPSHOT, () => text(fixture('module-page.html')))
		const service = await loadService()

		const result = await service.getData({ forceRefresh: true })

		expect(result.fromCache).toBe(false)
		expect(result.source).toBe('github-snapshot')
		expect(network.saved).toHaveLength(1)
	})

	it('keeps the stored data, untouched, when every source fails', async () => {
		const stored = await storedV2523()
		const network = installNetwork(stored)
		network.routes.set(WIKI, () => text('<title>Just a moment...</title>', 403))
		const service = await loadService()

		const result = await service.getData({ forceRefresh: true })

		expect(result.fromCache).toBe(true)
		expect(result.patchVersion).toBe('V25.23')
		expect(network.saved).toHaveLength(0)
	})

	it('never saves an empty or partial page', async () => {
		const network = installNetwork(await storedV2523())
		const truncated = page.slice(0, Math.floor(page.length / 3)) + '\n}\n-- </pre>'
		network.routes.set(WIKI, () => text(truncated))
		network.routes.set(SNAPSHOT, () => text('<pre>-- &lt;pre&gt;\nreturn {\n}\n-- &lt;/pre&gt;</pre>'))
		const service = await loadService()

		const result = await service.getData({ forceRefresh: true })

		expect(result.fromCache).toBe(true)
		expect(network.saved).toHaveLength(0)
	})

	it('throws when nothing is stored and every source fails', async () => {
		const network = installNetwork()
		network.routes.set(WIKI, () => text('', 500))
		const service = await loadService()

		await expect(service.getData({ forceRefresh: true })).rejects.toThrow(/No source gave valid data/)
		expect(network.saved).toHaveLength(0)
	})

	it('falls back to the data revision when Data Dragon is unreachable', async () => {
		const network = installNetwork(await storedV2523())
		network.routes.set(DDRAGON, () => text('', 503))
		const service = await loadService()

		const result = await service.getData({ forceRefresh: true })
		expect(result.patchVersion).toBe('V26.21')
	})

	it('refreshes stale data in the background when the page reads the cache', async () => {
		const network = installNetwork(await storedV2523())
		const service = await loadService()

		const cached = await service.getDataFromCache()
		expect(cached.patchVersion).toBe('V25.23')

		await vi.waitFor(() => expect(network.saved).toHaveLength(1))
		expect(network.saved[0].patchVersion).toBe('V26.21')
	})
})
