/**
 * Service for fetching and parsing League of Legends ARAM data from the LoL Wiki
 * @module services/WikiDataService
 */

import { ChampionData, AramStats, Champion } from '@/app/lib/types'

/**
 * Configuration options for the WikiDataService
 */
interface WikiFetchOptions {
	/** Force refresh cache regardless of age */
	forceRefresh?: boolean
	/** Maximum age of cached data in milliseconds */
	maxAge?: number
}

/**
 * Result object returned from wiki data fetches
 */
interface WikiFetchResult {
	/** The parsed champion data */
	data: ChampionData
	/** Whether the data came from cache */
	fromCache: boolean
	/** Timestamp when data was fetched/cached */
	timestamp: number
	/** Current patch version */
	patchVersion?: string
}

/**
 * Service responsible for fetching, caching, and parsing ARAM data from the LoL Wiki
 */
export class WikiDataService {
	private static instance: WikiDataService
	private static readonly CACHE_KEY = 'wiki_champion_data'
	private static readonly DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours
	private static readonly WIKI_URL =
		'https://leagueoflegends.fandom.com/wiki/Module:ChampionData/data?action=edit'

	private constructor() {
		console.info('WikiDataService: Initializing service')
	}

	/**
	 * Gets singleton instance of WikiDataService
	 */
	public static getInstance(): WikiDataService {
		if (!WikiDataService.instance) {
			WikiDataService.instance = new WikiDataService()
		}
		return WikiDataService.instance
	}

	/**
	 * Fetches ARAM data either from cache or LoL Wiki
	 * @param options - Configuration options for the fetch
	 */
	public async getData(
		options: WikiFetchOptions = {}
	): Promise<WikiFetchResult> {
		const { forceRefresh = false, maxAge = WikiDataService.DEFAULT_MAX_AGE } =
			options

		console.info('WikiDataService: Getting ARAM data', { forceRefresh, maxAge })

		// Check cache first
		const cachedData = this.getFromCache()
		if (
			!forceRefresh &&
			cachedData &&
			!this.isCacheStale(cachedData.timestamp, maxAge)
		) {
			console.info('WikiDataService: Returning cached data', {
				age: Date.now() - cachedData.timestamp,
				patchVersion: cachedData.patchVersion,
			})
			return cachedData
		}

		// Fetch fresh data
		try {
			console.info('WikiDataService: Fetching fresh data from wiki')
			const freshData = await this.fetchFromWiki()
			const patchVersion = this.extractPatchVersion(freshData)

			// Parse the raw wiki data
			const parsedData = this.parseWikiData(freshData)

			// Cache the results
			const result = {
				data: parsedData,
				fromCache: false,
				timestamp: Date.now(),
				patchVersion,
			}

			this.saveToCache(result)
			console.info('WikiDataService: Fresh data fetched and cached', {
				championsCount: Object.keys(parsedData).length,
				patchVersion,
			})

			return result
		} catch (error) {
			console.error('WikiDataService: Error fetching data', error)

			// Fallback to cached data if available
			if (cachedData) {
				console.warn('WikiDataService: Using stale cache due to fetch error')
				return {
					...cachedData,
					fromCache: true,
				}
			}

			throw error
		}
	}

	/**
	 * Extracts patch version from wiki content
	 */
	private extractPatchVersion(content: string): string | undefined {
		const patchMatch = content.match(/\["changes"\]\s*=\s*"(V\d+\.\d+)"/)
		return patchMatch?.[1]
	}

	/**
	 * Fetches raw data from LoL Wiki
	 */
	private async fetchFromWiki(): Promise<string> {
		const response = await fetch(WikiDataService.WIKI_URL)
		if (!response.ok) {
			throw new Error(`Failed to fetch wiki data: ${response.status}`)
		}

		const html = await response.text()
		const match = html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i)

		if (!match) {
			throw new Error('No data found in wiki response')
		}

		return match[1]
	}

	/**
	 * Parses raw wiki Lua data into structured champion data
	 */
	private parseWikiData(raw: string): ChampionData {
		console.info('WikiDataService: Parsing wiki data')
		const data: ChampionData = {}

		// TODO: Implement Lua parsing logic
		// This will need to parse the Lua table format and extract ARAM stats

		return data
	}

	/**
	 * Retrieves cached data from localStorage
	 */
	private getFromCache(): WikiFetchResult | null {
		try {
			const cached = localStorage.getItem(WikiDataService.CACHE_KEY)
			return cached ? JSON.parse(cached) : null
		} catch (error) {
			console.warn('WikiDataService: Cache read error', error)
			return null
		}
	}

	/**
	 * Saves data to localStorage cache
	 */
	private saveToCache(data: WikiFetchResult): void {
		try {
			localStorage.setItem(WikiDataService.CACHE_KEY, JSON.stringify(data))
		} catch (error) {
			console.warn('WikiDataService: Cache write error', error)
		}
	}

	/**
	 * Checks if cached data has exceeded maxAge
	 */
	private isCacheStale(timestamp: number, maxAge: number): boolean {
		return Date.now() - timestamp > maxAge
	}
}
