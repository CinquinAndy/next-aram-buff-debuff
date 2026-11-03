/**
 * Service for fetching and parsing League of Legends champion data from the LoL Wiki
 * Supports all game modes (ARAM, URF, USB, etc.) and full champion stats
 * @module services/WikiDataService
 */

import { type DataSource, SOURCES_CONFIG } from '@/app/config/sources'
import { validateChampionData } from '@/app/lib/dataValidation'
import { dataRevision, patchFromDdragonVersion } from '@/app/lib/patchVersion'
import type { ChampionData } from '@/app/lib/types'
import { parseChampionData } from '@/app/lib/wikiParser'
import { after } from 'next/server'
import { HttpService } from './http'
import { ImageService } from '@/app/services/ImageService'
import {
	PocketBaseService,
	type WikiFetchResult,
} from '@/app/services/PocketBaseService'

interface WikiFetchOptions {
	forceRefresh?: boolean
	maxAge?: number
}

// Wait this long before retrying an automatic refresh that failed
const REFRESH_RETRY_DELAY = 60 * 60 * 1000 // 1 hour

export class WikiDataService {
	private static instance: WikiDataService
	private pocketbaseService: PocketBaseService
	private backgroundRefresh: Promise<void> | null = null
	private lastFailedRefreshAt = 0

	private constructor() {
		console.info('WikiDataService: Initializing service')
		this.pocketbaseService = PocketBaseService.getInstance()
	}

	public static getInstance(): WikiDataService {
		if (!WikiDataService.instance) {
			WikiDataService.instance = new WikiDataService()
		}
		return WikiDataService.instance
	}

	/**
	 * Ensure champion images are available and add image paths to champion data
	 */
	private async ensureChampionImages(
		championData: ChampionData
	): Promise<void> {
		const imageService = ImageService.getInstance()
		const championNames = Object.values(championData).map(champion => {
			if (champion.name == 'GnarBig') {
				champion.name = 'Gnar'
			}
			if (champion.name == 'MonkeyKing') {
				champion.name = 'Wukong'
			}
			return champion.name
		})

		try {
			const imagePaths = await imageService.ensureChampionImages(championNames)

			// Add image paths to champion data
			Object.values(championData).forEach(champion => {
				const imagePath = imagePaths.get(champion.name)
				if (imagePath) {
					champion.splashArt = imagePath
				}
			})

			console.info(
				'WikiDataService: Successfully added splash art paths to champion data'
			)
		} catch (error) {
			console.error('WikiDataService: Error ensuring champion images:', error)
		}
	}

	/**
	 * Get data from PocketBase ONLY (no scraping)
	 * This is used by the main application to read cached data
	 * @throws Error if no data available in PocketBase
	 */
	public async getDataFromCache(): Promise<WikiFetchResult> {
		console.info('WikiDataService: Reading data from PocketBase cache')

		// Use noCache=true to always get fresh data from PocketBase
		const pbData = await this.pocketbaseService.getData(true)

		if (!pbData) {
			throw new Error(
				'No data available in PocketBase. Please call /api/refresh to populate the cache.'
			)
		}

		console.info('WikiDataService: Returning PocketBase data', {
			age: Date.now() - pbData.timestamp,
			patchVersion: pbData.patchVersion,
			championsCount: Object.keys(pbData.data).length,
		})

		if (this.isCacheStale(pbData.timestamp, SOURCES_CONFIG.CACHE.DEFAULT_MAX_AGE)) {
			this.scheduleBackgroundRefresh()
		}

		await this.ensureChampionImages(pbData.data)
		return pbData
	}

	/**
	 * Refresh stale data from the wiki after the response is sent (stale-while-revalidate).
	 * Nothing else refreshes the cache on its own, so without this the page keeps the data
	 * of the last manual refresh forever. One refresh at a time, and a pause after a failure
	 * so a broken scrape does not run on every page view.
	 */
	private scheduleBackgroundRefresh(): void {
		if (this.backgroundRefresh) return
		if (Date.now() - this.lastFailedRefreshAt < REFRESH_RETRY_DELAY) return

		const refresh = async () => {
			try {
				const result = await this.getData({ forceRefresh: true })
				if (result.fromCache) {
					// getData fell back to the stale PocketBase data: the scrape failed
					this.lastFailedRefreshAt = Date.now()
					console.warn('WikiDataService: Background refresh failed, keeping stale data')
				} else {
					console.info('WikiDataService: Background refresh done', {
						patchVersion: result.patchVersion,
					})
				}
			} catch (error) {
				this.lastFailedRefreshAt = Date.now()
				console.error('WikiDataService: Background refresh failed', error)
			} finally {
				this.backgroundRefresh = null
			}
		}

		this.backgroundRefresh = Promise.resolve().then(refresh)
		const pending = this.backgroundRefresh
		try {
			after(() => pending)
		} catch {
			// Outside a request scope (scripts): the promise still runs on its own
		}
	}

	/**
	 * Force refresh data from the sources (fetch + validate + save to PocketBase).
	 * Sources are tried in order; the first one whose data passes validation wins.
	 * When none does, the last good data stored in PocketBase is returned with fromCache: true,
	 * and PocketBase is left untouched.
	 */
	public async getData(options: WikiFetchOptions = {}): Promise<WikiFetchResult> {
		const { forceRefresh = false, maxAge = SOURCES_CONFIG.CACHE.DEFAULT_MAX_AGE } = options

		console.info('WikiDataService: Getting champion data', { forceRefresh, maxAge })

		const stored = await this.pocketbaseService.getData()

		if (!forceRefresh && stored && !this.isCacheStale(stored.timestamp, maxAge)) {
			console.info('WikiDataService: Returning fresh PocketBase data', {
				age: Date.now() - stored.timestamp,
				patchVersion: stored.patchVersion,
			})
			await this.ensureChampionImages(stored.data)
			return stored
		}

		const errors: string[] = []
		for (const source of SOURCES_CONFIG.DATA_SOURCES) {
			try {
				const result = await this.fetchFromSource(source, stored?.data)
				const saved = await this.pocketbaseService.saveData(result)
				if (!saved) {
					// Not persisted: wait before trying again instead of refetching on every view
					this.lastFailedRefreshAt = Date.now()
				}
				console.info('WikiDataService: Fresh data fetched', {
					source: source.name,
					saved,
					championsCount: Object.keys(result.data).length,
					patchVersion: result.patchVersion,
					dataRevision: result.dataRevision,
				})
				await this.ensureChampionImages(result.data)
				return result
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				errors.push(`${source.name}: ${message}`)
				console.warn(`WikiDataService: Source ${source.name} rejected`, message)
			}
		}

		console.error('WikiDataService: No source gave valid data', errors)
		if (stored) {
			console.warn('WikiDataService: Keeping the last good PocketBase data')
			await this.ensureChampionImages(stored.data)
			return { ...stored, fromCache: true }
		}

		throw new Error(`No source gave valid data (${errors.join('; ')})`)
	}

	/**
	 * Fetch, parse and validate one source. Throws when the data must not be saved.
	 */
	private async fetchFromSource(source: DataSource, previous?: ChampionData): Promise<WikiFetchResult> {
		const { text, lastModified } = await HttpService.fetchText(source.url)
		const data = parseChampionData(text)

		const validation = validateChampionData(data, previous)
		if (!validation.ok) {
			throw new Error(`invalid data: ${validation.errors.join('; ')}`)
		}

		const revision = dataRevision(data)
		return {
			data,
			fromCache: false,
			timestamp: Date.now(),
			patchVersion: (await this.fetchCurrentPatch()) ?? revision,
			dataRevision: revision,
			source: source.name,
			sourceUpdatedAt: lastModified ? new Date(lastModified).toISOString() : undefined,
		}
	}

	/**
	 * Current game patch from Data Dragon ("16.21.1" → "V26.21"), undefined if unreachable.
	 */
	private async fetchCurrentPatch(): Promise<string | undefined> {
		try {
			const { text } = await HttpService.fetchText(SOURCES_CONFIG.DDRAGON_VERSIONS_URL, 'application/json')
			const versions: unknown = JSON.parse(text)
			if (Array.isArray(versions) && typeof versions[0] === 'string') {
				return patchFromDdragonVersion(versions[0])
			}
		} catch (error) {
			console.warn('WikiDataService: Could not read the current patch from Data Dragon', error)
		}
		return undefined
	}

	private isCacheStale(timestamp: number, maxAge: number): boolean {
		return Date.now() - timestamp > maxAge
	}
}
