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
	 * @param html - Raw HTML from wiki page
	 * @returns Structured champion data
	 */
	private parseWikiData(html: string): ChampionData {
		console.info('WikiDataService: Starting to parse wiki data')
		const championData: ChampionData = {}

		try {
			// First extract and decode Lua data from HTML
			const luaData = this.extractLuaFromHtml(html)
			if (!luaData) {
				throw new Error('No Lua data found in wiki page')
			}

			// Find individual champion entries with a more lenient pattern
			const championBlocks = luaData.split(/\["[A-Za-z\s'\.]+"\]\s*=\s*{/)
			championBlocks.shift() // Remove the initial empty piece

			console.info(
				`WikiDataService: Found ${championBlocks.length} potential champion entries`
			)

			for (let block of championBlocks) {
				// Complete the block
				block = '{' + block.split(/\},?\s*\["/)[0] + '}'

				// Extract champion name
				const nameMatch = block.match(/\["apiname"\]\s*=\s*"([^"]+)"/)
				if (!nameMatch) {
					console.debug(
						'WikiDataService: Skipping block - No champion name found'
					)
					continue
				}
				const championName = nameMatch[1]

				// Extract champion ID with a more precise pattern
				const idMatch = block.match(/\["id"\]\s*=\s*(\d+)/)
				if (!idMatch) {
					console.debug(
						`WikiDataService: Skipping ${championName} - No ID found`
					)
					continue
				}
				const id = idMatch[1]

				// Initialize default ARAM stats
				const aramStats = {
					dmg_dealt: 1,
					dmg_taken: 1,
					healing: 1,
					shielding: 1,
					ability_haste: 1,
					attack_speed: 1,
					energy_regen: 1,
				}

				// Try to find ARAM data block
				const aramMatch = block.match(/\["aram"\]\s*=\s*{([^}]+)}/)
				if (aramMatch) {
					const aramBlock = aramMatch[1]
					// Extract numerical values including decimals and negative numbers
					const statMatches = aramBlock.matchAll(
						/\["?([a-z_]+)"?\]\s*=\s*([-+]?[0-9]*\.?[0-9]+)/g
					)

					for (const match of Array.from(statMatches)) {
						const [_, key, value] = match
						if (key in aramStats) {
							aramStats[key as keyof typeof aramStats] = parseFloat(value)
						}
					}
				}

				// Add champion to collection
				console.info(
					`WikiDataService: Successfully parsed champion ${championName} (ID: ${id})`
				)

				// Log ARAM stats if they differ from defaults
				const hasModifications = Object.entries(aramStats).some(
					([_, value]) => value !== 1
				)
				if (hasModifications) {
					console.info(
						`WikiDataService: ARAM modifications found for ${championName}:`,
						aramStats
					)
				}

				championData[id] = {
					name: championName,
					aram: aramStats,
				}
			}

			const championCount = Object.keys(championData).length
			console.info(
				`WikiDataService: Successfully parsed ${championCount} champions`
			)

			if (championCount > 0) {
				const sample = Object.values(championData)[0]
				console.info('WikiDataService: Sample champion data:', {
					name: sample.name,
					stats: sample.aram,
				})
			} else {
				console.warn('WikiDataService: No champions were successfully parsed')
			}

			// Debug output of raw data
			if (championCount === 0) {
				console.debug(
					'WikiDataService: Raw Lua sample for debugging:',
					luaData.substring(0, 1000)
				)
			}

			return championData
		} catch (error) {
			console.error('WikiDataService: Error parsing wiki data:', error)
			throw new Error(
				`Failed to parse wiki data: ${error instanceof Error ? error.message : 'Unknown error'}`
			)
		}
	}

	/**
	 * Extracts and decodes Lua table data from the wiki HTML page
	 */
	private extractLuaFromHtml(html: string): string | null {
		try {
			// Decode HTML entities
			const decoded = html
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"')
				.replace(/&amp;/g, '&')
				.replace(/&#39;/g, "'")

			// Extract Lua table with more flexible pattern
			let match = decoded.match(/return\s*({[\s\S]*?})(?:\s*--|$)/)
			if (!match) {
				console.warn('WikiDataService: No Lua table found in HTML')
				return null
			}

			const luaTable = match[1].trim()
			console.info('WikiDataService: Successfully extracted Lua data')

			// Log a sample for debugging
			console.debug(
				'WikiDataService: Lua data sample:',
				luaTable.substring(0, 500)
			)

			return luaTable
		} catch (error) {
			console.error('WikiDataService: Error extracting Lua data:', error)
			return null
		}
	}
}
