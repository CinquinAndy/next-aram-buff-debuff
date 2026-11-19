/**
 * POST /api/refresh: closed without REFRESH_SECRET, Bearer header compared in constant time.
 * The services are mocked: a refused request must never reach the scrape or PocketBase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRefreshAuth } from '@/app/lib/refreshAuth'

const getData = vi.fn()
const getStored = vi.fn()

vi.mock('@/app/services/WikiDataService', () => ({
	WikiDataService: { getInstance: () => ({ getData }) },
}))
vi.mock('@/app/services/PocketBaseService', () => ({
	PocketBaseService: { getInstance: () => ({ getData: getStored }) },
}))

const SECRET = 'secret-de-test-0123456789'

function post(authorization?: string): Request {
	return new Request('http://localhost/api/refresh', {
		method: 'POST',
		headers: authorization === undefined ? {} : { authorization },
	})
}

describe('checkRefreshAuth', () => {
	it('refuses everything when the secret is not set', () => {
		expect(checkRefreshAuth(null, undefined)).toBe('not-configured')
		expect(checkRefreshAuth('Bearer ', '')).toBe('not-configured')
		expect(checkRefreshAuth('Bearer undefined', undefined)).toBe('not-configured')
	})

	it('accepts only the exact Bearer header', () => {
		expect(checkRefreshAuth(`Bearer ${SECRET}`, SECRET)).toBe('ok')
		expect(checkRefreshAuth(null, SECRET)).toBe('unauthorized')
		expect(checkRefreshAuth(SECRET, SECRET)).toBe('unauthorized')
		expect(checkRefreshAuth(`Bearer ${SECRET}x`, SECRET)).toBe('unauthorized')
		expect(checkRefreshAuth(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe('unauthorized')
		// Different lengths do not throw (timingSafeEqual needs equal lengths)
		expect(checkRefreshAuth('Bearer x'.repeat(100), SECRET)).toBe('unauthorized')
	})
})

describe('POST /api/refresh', () => {
	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})
		getStored.mockResolvedValue(null)
		getData.mockResolvedValue({
			patchVersion: 'V26.21',
			dataRevision: 'V26.21',
			source: 'wiki',
			timestamp: 0,
			data: { Ahri: {} },
			fromCache: false,
		})
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
		getData.mockReset()
		getStored.mockReset()
	})

	it('answers 503 and does not scrape when REFRESH_SECRET is not set', async () => {
		vi.stubEnv('REFRESH_SECRET', '')
		const { POST } = await import('@/app/api/refresh/route')
		const response = await POST(post())
		expect(response.status).toBe(503)
		expect(getData).not.toHaveBeenCalled()
		expect(getStored).not.toHaveBeenCalled()
	})

	it('answers 401 and does not scrape with a missing or wrong header', async () => {
		vi.stubEnv('REFRESH_SECRET', SECRET)
		const { POST } = await import('@/app/api/refresh/route')
		for (const header of [undefined, 'Bearer nope', SECRET]) {
			expect((await POST(post(header))).status).toBe(401)
		}
		expect(getData).not.toHaveBeenCalled()
	})

	it('refreshes with the right Bearer header', async () => {
		vi.stubEnv('REFRESH_SECRET', SECRET)
		const { POST } = await import('@/app/api/refresh/route')
		const response = await POST(post(`Bearer ${SECRET}`))
		expect(response.status).toBe(200)
		expect(getData).toHaveBeenCalledWith({ forceRefresh: true })
	})
})
