/**
 * Service for fetching and parsing League of Legends ARAM data from the LoL Wiki
 * @module services/WikiDataService
 */

import fs from 'fs'
import path from 'path'
import { ChampionData } from '@/app/lib/types'
import { PROXY_CONFIG } from '@/app/config/proxy'
import { HttpService } from './http'
import { ImageService } from '@/app/services/ImageService'

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

	/**
	 * Ensure champion images are available and add image paths to champion data
	 */
	private async ensureChampionImages(
		championData: ChampionData
	): Promise<void> {
		const imageService = ImageService.getInstance()
		const championNames = Object.values(championData).map(
			champion => champion.name
		)

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

			await this.ensureChampionImages(parsedData)

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
	 * Extracts ARAM stats from a champion's data block
	 */
	private extractAramStats(championBlock: string): any {
		const defaultStats = {
			dmg_dealt: 1,
			dmg_taken: 1,
			healing: 1,
			shielding: 1,
			ability_haste: 1,
			attack_speed: 1,
			energy_regen: 1,
		}

		try {
			const statsBlockMatch = championBlock.match(/\["stats"\]\s*=\s*{([^}]+)}/)
			if (!statsBlockMatch) {
				console.debug('No stats block found')
				return defaultStats
			}

			const statsBlock = statsBlockMatch[1]

			console.debug('Stats block found --:', statsBlock.substring(0, 2500))

			const aramBlockMatch = statsBlock.match(/\["aram"\]\s*=\s*{([^}]+)/)
			if (!aramBlockMatch) {
				console.debug('No ARAM block found in stats')
				return defaultStats
			}

			const aramBlock = aramBlockMatch[1]
			console.debug('ARAM block found:', aramBlock)

			const stats = { ...defaultStats }

			const statRegex = /\["?([^"\]]+)"?\]\s*=\s*([+-]?\d*\.?\d+)/g
			let match

			while ((match = statRegex.exec(aramBlock)) !== null) {
				const [_, key, value] = match
				console.debug('Found stat:', key, value)

				const normalizedKey = key.trim().toLowerCase()
				const mappedKey = this.mapStatKey(normalizedKey)

				if (mappedKey && mappedKey in stats) {
					const parsedValue = parseFloat(value)
					if (!isNaN(parsedValue)) {
						stats[mappedKey as keyof typeof stats] = parsedValue
					}
				}
			}

			const hasModifications = Object.entries(stats).some(
				([key, value]) => value !== 1
			)
			if (hasModifications) {
				console.debug('Found modifications:', stats)
			}

			return stats
		} catch (error) {
			console.error('Error extracting ARAM stats:', error)
			return defaultStats
		}
	}

	/**
	 * Maps various stat key formats to standardized keys
	 */
	private mapStatKey(key: string): string | null {
		const keyMap: { [key: string]: string } = {
			dmg_dealt: 'dmg_dealt',
			damage_dealt: 'dmg_dealt',
			dmg_taken: 'dmg_taken',
			damage_taken: 'dmg_taken',
			healing: 'healing',
			heal_power: 'healing',
			shield_power: 'shielding',
			shielding: 'shielding',
			ability_haste: 'ability_haste',
			attack_speed: 'attack_speed',
			energy_regen: 'energy_regen',
			// Ajout de variations possibles
			dealt: 'dmg_dealt',
			taken: 'dmg_taken',
			heal: 'healing',
			shield: 'shielding',
			haste: 'ability_haste',
			as: 'attack_speed',
		}

		return keyMap[key] || null
	}

	/**
	 * Parses raw wiki Lua data into structured champion data
	 */
	private parseWikiData(html: string): ChampionData {
		console.info('WikiDataService: Starting to parse wiki data')
		const championData: ChampionData = {}

		try {
			const luaData = this.extractLuaFromHtml(html)
			if (!luaData) {
				throw new Error('No Lua data found in wiki page')
			}

			console.debug('First 1500 chars of Lua data:', luaData.substring(0, 1500))

			const championMatches = luaData.matchAll(
				/\[\"([^"]+)\"\]\s*=\s*{((?:[^{}]|{(?:[^{}]|{[^{}]*})*})*?)}/g
			)

			for (const match of championMatches) {
				const [_, championKey, block] = match

				// Extract basic info
				const idMatch = block.match(/\["id"\]\s*=\s*(\d+)/)
				const nameMatch = block.match(/\["apiname"\]\s*=\s*"([^"]+)"/)

				if (!idMatch || !nameMatch) {
					console.debug(`Skipping champion ${championKey} - missing basic info`)
					continue
				}

				const id = idMatch[1]
				const championName = nameMatch[1]

				console.debug(`Processing champion: ${championName} (ID: ${id})`)

				// Extract ARAM stats
				const aramStats = this.extractAramStats(block)

				championData[id] = {
					id: id,
					name: championName,
					aram: aramStats,
				}

				// Log detailed info if modifications found
				if (Object.values(aramStats).some(value => value !== 1)) {
					console.info(`Found ARAM modifications for ${championName}:`, {
						id,
						stats: aramStats,
					})
				}
			}

			const totalChampions = Object.keys(championData).length
			const modifiedChampions = Object.values(championData).filter(champ =>
				Object.values(champ.aram).some(value => value !== 1)
			).length

			console.info(
				`WikiDataService: Successfully parsed ${totalChampions} champions`
			)
			console.info(
				`WikiDataService: Found ${modifiedChampions} champions with ARAM modifications`
			)

			if (modifiedChampions === 0) {
				console.warn(
					'No ARAM modifications found. This might indicate a parsing issue.'
				)
				const firstChampId = Object.keys(championData)[0]
				if (firstChampId) {
					console.debug(
						'Example champion data:',
						championData[firstChampId],
						'Raw data sample:',
						luaData.match(
							new RegExp(
								`\\["${championData[firstChampId].name}"\\].*?stats.*?aram.*?}`,
								's'
							)
						)
					)
				}
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

			// Find the Lua data block using various patterns
			const patterns = [
				/-- <pre>\s*return\s*({[\s\S]*?})\s*--\s*<\/pre>/m,
				/return\s*({[\s\S]*?})\s*$/,
			]

			for (const pattern of patterns) {
				const match = decoded.match(pattern)
				if (match) {
					return match[1].trim()
				}
			}

			console.warn('WikiDataService: No Lua table found in HTML')
			return null
		} catch (error) {
			console.error('WikiDataService: Error extracting Lua data:', error)
			return null
		}
	}
}
