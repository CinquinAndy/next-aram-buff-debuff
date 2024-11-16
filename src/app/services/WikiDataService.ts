/**
 * Service for fetching and parsing League of Legends ARAM data from the LoL Wiki
 * @module services/WikiDataService
 */

import fs from 'fs'
import path from 'path'
import { ChampionData } from '@/app/lib/types'
import { PROXY_CONFIG } from '@/app/config/proxy'
import { HttpService } from './http'

interface WikiFetchOptions {
	forceRefresh?: boolean
	maxAge?: number
}

interface WikiFetchResult {
	data: ChampionData
	fromCache: boolean
	timestamp: number
	patchVersion?: string
}

export class WikiDataService {
	private static instance: WikiDataService
	private static readonly CACHE_DIR = path.join(process.cwd(), '.cache')
	private static readonly CACHE_FILE = path.join(
		WikiDataService.CACHE_DIR,
		'wiki_data.json'
	)

	private constructor() {
		console.info('WikiDataService: Initializing service')
		this.initCacheDir()
	}

	public static getInstance(): WikiDataService {
		if (!WikiDataService.instance) {
			WikiDataService.instance = new WikiDataService()
		}
		return WikiDataService.instance
	}

	/**
	 * Initialize cache directory if it doesn't exist
	 */
	private initCacheDir(): void {
		try {
			if (!fs.existsSync(WikiDataService.CACHE_DIR)) {
				fs.mkdirSync(WikiDataService.CACHE_DIR, { recursive: true })
				console.info('WikiDataService: Cache directory created')
			}
		} catch (error) {
			console.warn('WikiDataService: Failed to create cache directory', error)
		}
	}

	public async getData(
		options: WikiFetchOptions = {}
	): Promise<WikiFetchResult> {
		const {
			forceRefresh = false,
			maxAge = PROXY_CONFIG.CACHE.DEFAULT_MAX_AGE,
		} = options

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
			const freshData = await HttpService.fetchWithProxy(PROXY_CONFIG.WIKI_URL)
			const patchVersion = this.extractPatchVersion(freshData)

			// Parse the raw wiki data
			console.info('WikiDataService: Parsing wiki data')
			const parsedData = this.parseWikiData(freshData)

			// Cache the results
			const result: WikiFetchResult = {
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

	private extractPatchVersion(content: string): string | undefined {
		const patchMatch = content.match(/\["changes"\]\s*=\s*"(V\d+\.\d+)"/)
		return patchMatch?.[1]
	}

	private getFromCache(): WikiFetchResult | null {
		try {
			if (!fs.existsSync(WikiDataService.CACHE_FILE)) {
				return null
			}

			const fileContent = fs.readFileSync(WikiDataService.CACHE_FILE, 'utf-8')
			return JSON.parse(fileContent) as WikiFetchResult
		} catch (error) {
			console.warn('WikiDataService: Cache read error', error)
			return null
		}
	}

	private saveToCache(data: WikiFetchResult): void {
		try {
			fs.writeFileSync(
				WikiDataService.CACHE_FILE,
				JSON.stringify(data, null, 2),
				'utf-8'
			)
		} catch (error) {
			console.warn('WikiDataService: Cache write error', error)
		}
	}

	private isCacheStale(timestamp: number, maxAge: number): boolean {
		return Date.now() - timestamp > maxAge
	}

	/**
	 * Parses raw wiki Lua data into structured champion data
	 * @param raw - Raw Lua table data from wiki
	 * @returns Structured champion data
	 */
	private parseWikiData(raw: string): ChampionData {
		console.info('WikiDataService: Starting to parse wiki data')
		const championData: ChampionData = {}

		try {
			// Trouver tous les blocs de champions
			const championBlocks = raw.match(/\[\d+]\s*=\s*{[^}]+}/g) || []
			console.info(
				`WikiDataService: Found ${championBlocks.length} champion blocks`
			)

			for (const block of championBlocks) {
				// Extraire l'ID du champion
				const idMatch = block.match(/\[(\d+)]/)
				if (!idMatch) continue

				// Extraire les données ARAM
				const aramMatch = block.match(/aram\s*=\s*{([^}]+)}/)
				if (!aramMatch) continue

				// Extraire le nom du champion
				const nameMatch = block.match(/apiname\s*=\s*"([^"]+)"/)
				if (!nameMatch) continue

				const id = idMatch[1]
				const aramData = aramMatch[1]
				const name = nameMatch[1]

				// Parser les stats ARAM
				const aramStats: any = {}
				const statsMatches = aramData.matchAll(/([a-z_]+)\s*=\s*([\d.]+)/g)
				for (const match of statsMatches) {
					const [_, key, value] = match
					aramStats[key] = parseFloat(value)
				}

				// Vérifier si nous avons des données ARAM valides
				if (Object.keys(aramStats).length > 0) {
					championData[id] = {
						name,
						aram: {
							dmg_dealt: aramStats.dmg_dealt || 1,
							dmg_taken: aramStats.dmg_taken || 1,
							healing: aramStats.healing || 1,
							shielding: aramStats.shielding || 1,
							ability_haste: aramStats.ability_haste || 1,
							attack_speed: aramStats.attack_speed || 1,
							energy_regen: aramStats.energy_regen || 1,
						},
					}
				}
			}

			console.info(
				`WikiDataService: Successfully parsed ${Object.keys(championData).length} champions`
			)

			// Log un exemple pour debugging
			const firstChampion = Object.values(championData)[0]
			if (firstChampion) {
				console.info('WikiDataService: First champion parsed:', {
					name: firstChampion.name,
					stats: firstChampion.aram,
				})
			}

			return championData
		} catch (error) {
			console.error('WikiDataService: Error parsing wiki data:', error)
			throw new Error(
				`Failed to parse wiki data: ${error instanceof Error ? error.message : 'Unknown error'}`
			)
		}
	}
}
