/**
 * Service for fetching and parsing League of Legends champion data from the LoL Wiki
 * Supports all game modes (ARAM, URF, USB, etc.) and full champion stats
 * @module services/WikiDataService
 */

import {
	ChampionData,
	FullChampionData,
	GameModeStats,
	GameModeModifiers,
	ChampionBaseStats,
	AramStats,
} from '@/app/lib/types'
import { PROXY_CONFIG } from '@/app/config/proxy'
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

// Known game modes in the wiki data
const GAME_MODES = ['aram', 'urf', 'usb', 'ofa', 'nb', 'ar'] as const

export class WikiDataService {
	private static instance: WikiDataService
	private pocketbaseService: PocketBaseService

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

		const pbData = await this.pocketbaseService.getData()

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

		await this.ensureChampionImages(pbData.data)
		return pbData
	}

	/**
	 * Force refresh data from wiki (scraping + save to PocketBase)
	 * This should ONLY be called by /api/refresh endpoint
	 * @param options Fetch options
	 */
	public async getData(
		options: WikiFetchOptions = {}
	): Promise<WikiFetchResult> {
		const {
			forceRefresh = false,
			maxAge = PROXY_CONFIG.CACHE.DEFAULT_MAX_AGE,
		} = options

		console.info('WikiDataService: Getting champion data', {
			forceRefresh,
			maxAge,
		})

		// Check PocketBase first if not forcing refresh
		if (!forceRefresh) {
			const pbData = await this.pocketbaseService.getData()
			if (pbData && !this.isCacheStale(pbData.timestamp, maxAge)) {
				console.info('WikiDataService: Returning fresh PocketBase data', {
					age: Date.now() - pbData.timestamp,
					patchVersion: pbData.patchVersion,
				})
				await this.ensureChampionImages(pbData.data)
				return pbData
			}
		}

		// Fetch fresh data from wiki
		try {
			console.info('WikiDataService: Fetching fresh data from wiki')
			const freshData = await HttpService.fetchWithProxy(PROXY_CONFIG.WIKI_URL)
			const patchVersion = this.extractPatchVersion(freshData)

			// Parse the raw wiki data
			console.info('WikiDataService: Parsing wiki data')
			const parsedData = this.parseWikiData(freshData)

			// Save to PocketBase
			const result: WikiFetchResult = {
				data: parsedData,
				fromCache: false,
				timestamp: Date.now(),
				patchVersion,
			}

			await this.pocketbaseService.saveData(result)
			console.info('WikiDataService: Fresh data fetched and saved', {
				championsCount: Object.keys(parsedData).length,
				patchVersion,
			})

			await this.ensureChampionImages(parsedData)

			return result
		} catch (error) {
			console.error('WikiDataService: Error fetching data', error)

			// Try to return stale data as fallback
			const pbData = await this.pocketbaseService.getData()
			if (pbData) {
				console.warn(
					'WikiDataService: Using stale PocketBase data due to fetch error'
				)
				await this.ensureChampionImages(pbData.data)
				return {
					...pbData,
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

	private isCacheStale(timestamp: number, maxAge: number): boolean {
		return Date.now() - timestamp > maxAge
	}

	/**
	 * Extract a string value from a Lua block
	 */
	private extractString(block: string, key: string): string | undefined {
		const regex = new RegExp(`\\["${key}"\\]\\s*=\\s*"([^"]*)"`)
		const match = block.match(regex)
		return match?.[1]
	}

	/**
	 * Extract a number value from a Lua block
	 */
	private extractNumber(block: string, key: string): number | undefined {
		const regex = new RegExp(`\\["${key}"\\]\\s*=\\s*([+-]?\\d*\\.?\\d+)`)
		const match = block.match(regex)
		return match ? parseFloat(match[1]) : undefined
	}

	/**
	 * Extract an array of strings from a Lua block (e.g., roles, positions)
	 */
	private extractStringArray(block: string, key: string): string[] | undefined {
		const regex = new RegExp(`\\["${key}"\\]\\s*=\\s*\\{([^}]*)\\}`)
		const match = block.match(regex)
		if (!match) return undefined

		const items: string[] = []
		const itemRegex = /"([^"]+)"/g
		let itemMatch
		while ((itemMatch = itemRegex.exec(match[1])) !== null) {
			items.push(itemMatch[1])
		}
		return items.length > 0 ? items : undefined
	}

	/**
	 * Extract the full stats block content from a champion block
	 */
	private extractStatsBlock(championBlock: string): string | null {
		// Match the stats block which can have nested objects
		const statsStart = championBlock.indexOf('["stats"]')
		if (statsStart === -1) return null

		let depth = 0
		let start = -1
		let end = -1

		for (let i = statsStart; i < championBlock.length; i++) {
			if (championBlock[i] === '{') {
				if (start === -1) start = i
				depth++
			} else if (championBlock[i] === '}') {
				depth--
				if (depth === 0) {
					end = i + 1
					break
				}
			}
		}

		if (start !== -1 && end !== -1) {
			return championBlock.substring(start, end)
		}
		return null
	}

	/**
	 * Extract base stats from the stats block
	 */
	private extractBaseStats(statsBlock: string): Partial<ChampionBaseStats> {
		const stats: Partial<ChampionBaseStats> = {}

		const statKeys: (keyof ChampionBaseStats)[] = [
			'hp_base',
			'hp_lvl',
			'mp_base',
			'mp_lvl',
			'arm_base',
			'arm_lvl',
			'mr_base',
			'mr_lvl',
			'hp5_base',
			'hp5_lvl',
			'mp5_base',
			'mp5_lvl',
			'dam_base',
			'dam_lvl',
			'as_base',
			'as_lvl',
			'range',
			'ms',
			'acquisition_radius',
			'selection_height',
			'selection_radius',
			'pathing_radius',
			'as_ratio',
			'attack_cast_time',
			'attack_total_time',
			'attack_delay_offset',
			'missile_speed',
		]

		for (const key of statKeys) {
			const value = this.extractNumber(statsBlock, key)
			if (value !== undefined) {
				stats[key] = value
			}
		}

		return stats
	}

	/**
	 * Extract game mode modifiers from the stats block
	 */
	private extractGameModeStats(
		statsBlock: string,
		mode: string
	): GameModeStats | undefined {
		// Find the mode block within stats
		const modeRegex = new RegExp(`\\["${mode}"\\]\\s*=\\s*\\{([^}]+)\\}`)
		const match = statsBlock.match(modeRegex)
		if (!match) return undefined

		const modeBlock = match[1]
		const stats: GameModeStats = {}

		// Known stat modifiers for game modes
		const modifierKeys = [
			'dmg_dealt',
			'dmg_taken',
			'healing',
			'shielding',
			'ability_haste',
			'attack_speed',
			'energy_regen',
			'tenacity',
		]

		const statRegex = /\["?([^"\]]+)"?\]\s*=\s*([+-]?\d*\.?\d+)/g
		let statMatch

		while ((statMatch = statRegex.exec(modeBlock)) !== null) {
			const key = statMatch[1].trim().toLowerCase()
			const value = parseFloat(statMatch[2])

			if (!isNaN(value) && modifierKeys.includes(key)) {
				stats[key as keyof GameModeStats] = value
			}
		}

		return Object.keys(stats).length > 0 ? stats : undefined
	}

	/**
	 * Extract all game mode modifiers
	 */
	private extractAllGameModes(statsBlock: string): GameModeModifiers {
		const modes: GameModeModifiers = {}

		for (const mode of GAME_MODES) {
			const modeStats = this.extractGameModeStats(statsBlock, mode)
			if (modeStats) {
				modes[mode] = modeStats
			}
		}

		return modes
	}

	/**
	 * Convert game mode stats to legacy AramStats format for backward compatibility
	 */
	private gameModeToAramStats(modeStats?: GameModeStats): AramStats {
		const defaultStats: AramStats = {
			dmg_dealt: 1,
			dmg_taken: 1,
			healing: 1,
			shielding: 1,
			ability_haste: 1,
			attack_speed: 1,
			energy_regen: 1,
		}

		if (!modeStats) return defaultStats

		return {
			dmg_dealt: modeStats.dmg_dealt ?? 1,
			dmg_taken: modeStats.dmg_taken ?? 1,
			healing: modeStats.healing ?? 1,
			shielding: modeStats.shielding ?? 1,
			ability_haste: modeStats.ability_haste ?? 1,
			attack_speed: modeStats.attack_speed ?? 1,
			energy_regen: modeStats.energy_regen ?? 1,
		}
	}

	/**
	 * Extract skills from champion block
	 */
	private extractSkills(block: string): Record<string, string[]> | undefined {
		const skills: Record<string, string[]> = {}
		const skillKeys = ['skill_i', 'skill_q', 'skill_w', 'skill_e', 'skill_r']

		for (const key of skillKeys) {
			const skillArray = this.extractStringArray(block, key)
			if (skillArray) {
				skills[key] = skillArray
			}
		}

		// Also extract the 'skills' array
		const mainSkills = this.extractStringArray(block, 'skills')
		if (mainSkills) {
			skills.skills = mainSkills
		}

		return Object.keys(skills).length > 0 ? skills : undefined
	}

	/**
	 * Parse a single champion block and extract all data
	 */
	private parseChampionBlock(block: string): FullChampionData | null {
		// Extract basic info
		const id = this.extractNumber(block, 'id')
		const apiname = this.extractString(block, 'apiname')

		if (!id || !apiname) {
			return null
		}

		const fullData: FullChampionData = {
			id,
			apiname,
			title: this.extractString(block, 'title'),
			difficulty: this.extractNumber(block, 'difficulty'),
			herotype: this.extractString(block, 'herotype'),
			alttype: this.extractString(block, 'alttype'),
			resource: this.extractString(block, 'resource'),
			rangetype: this.extractString(block, 'rangetype'),
			date: this.extractString(block, 'date'),
			patch: this.extractString(block, 'patch'),
			changes: this.extractString(block, 'changes'),
			adaptivetype: this.extractString(block, 'adaptivetype'),
			damage: this.extractNumber(block, 'damage'),
			toughness: this.extractNumber(block, 'toughness'),
			control: this.extractNumber(block, 'control'),
			mobility: this.extractNumber(block, 'mobility'),
			utility: this.extractNumber(block, 'utility'),
			style: this.extractNumber(block, 'style'),
			be: this.extractNumber(block, 'be'),
			rp: this.extractNumber(block, 'rp'),
			role: this.extractStringArray(block, 'role'),
			client_positions: this.extractStringArray(block, 'client_positions'),
			external_positions: this.extractStringArray(block, 'external_positions'),
		}

		// Extract stats block
		const statsBlock = this.extractStatsBlock(block)
		if (statsBlock) {
			// Extract base stats
			const baseStats = this.extractBaseStats(statsBlock)
			if (Object.keys(baseStats).length > 0) {
				fullData.stats = baseStats as ChampionBaseStats
			}

			// Extract all game mode modifiers
			const gameModes = this.extractAllGameModes(statsBlock)
			if (Object.keys(gameModes).length > 0) {
				fullData.gameModes = gameModes
			}
		}

		// Extract skills
		const skills = this.extractSkills(block)
		if (skills) {
			fullData.skills = skills
		}

		return fullData
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

			console.debug(
				'First 1500 chars of Lua data:',
				luaData.substring(0, 1500)
			)

			// Improved regex to match champion blocks with nested structures
			const championRegex =
				/\["([^"]+)"\]\s*=\s*\{((?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*)\}/g
			let match

			let championsWithModifications = 0
			const modeStats: Record<string, number> = {}

			while ((match = championRegex.exec(luaData)) !== null) {
				const [_, championKey, block] = match

				const fullData = this.parseChampionBlock(block)
				if (!fullData) {
					console.debug(
						`Skipping champion ${championKey} - missing basic info`
					)
					continue
				}

				const id = fullData.id.toString()
				const aramStats = this.gameModeToAramStats(fullData.gameModes?.aram)

				// Check if this champion has any game mode modifications
				if (fullData.gameModes) {
					const hasMods = Object.values(fullData.gameModes).some(
						mode => mode && Object.keys(mode).length > 0
					)
					if (hasMods) {
						championsWithModifications++
						// Track which modes have data
						for (const mode of Object.keys(fullData.gameModes)) {
							modeStats[mode] = (modeStats[mode] || 0) + 1
						}
					}
				}

				championData[id] = {
					id,
					name: fullData.apiname,
					aram: aramStats,
					fullData,
				}

				// Log detailed info if ARAM modifications found
				if (Object.values(aramStats).some(value => value !== 1)) {
					console.debug(`Found ARAM modifications for ${fullData.apiname}:`, {
						id,
						aram: aramStats,
					})
				}
			}

			const totalChampions = Object.keys(championData).length
			const aramModifiedChampions = Object.values(championData).filter(champ =>
				Object.values(champ.aram).some(value => value !== 1)
			).length

			console.info(
				`WikiDataService: Successfully parsed ${totalChampions} champions`
			)
			console.info(
				`WikiDataService: Found ${championsWithModifications} champions with game mode modifications`
			)
			console.info(
				`WikiDataService: Found ${aramModifiedChampions} champions with ARAM modifications`
			)
			console.info('WikiDataService: Game mode statistics:', modeStats)

			if (aramModifiedChampions === 0) {
				console.warn(
					'No ARAM modifications found. This might indicate a parsing issue.'
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
