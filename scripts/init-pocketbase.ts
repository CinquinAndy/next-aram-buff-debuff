/**
 * Script to initialize PocketBase with ARAM data
 * Reads the html_exemple.html file, parses it, and uploads to PocketBase
 */

import fs from 'fs'
import path from 'path'

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://lol.andy-cinquin.fr'
const POCKETBASE_TOKEN =
	process.env.POCKETBASE_TOKEN ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MzE3NDM5ODI2NiwiaWQiOiJzYWdtZHhtd2cxc3drYnQiLCJyZWZyZXNoYWJsZSI6ZmFsc2UsInR5cGUiOiJhdXRoIn0.DkIgBpEc6_LX3DRXUWCev_hUHRaQU-aMutPion9QgN0'

interface AramStats {
	dmg_dealt: number
	dmg_taken: number
	healing: number
	shielding: number
	ability_haste: number
	attack_speed: number
	energy_regen: number
}

interface Champion {
	id: string
	name: string
	aram: AramStats
}

interface ChampionData {
	[key: string]: Champion
}

/**
 * Extract Lua data from HTML
 */
function extractLuaFromHtml(html: string): string | null {
	try {
		const decoded = html
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&amp;/g, '&')
			.replace(/&#39;/g, "'")

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

		return null
	} catch (error) {
		console.error('Error extracting Lua data:', error)
		return null
	}
}

/**
 * Parse Lua data into structured format
 */
function parseWikiData(html: string): ChampionData {
	const championData: ChampionData = {}

	try {
		const luaData = extractLuaFromHtml(html)
		if (!luaData) {
			throw new Error('No Lua data found in wiki page')
		}

		console.log('First 500 chars of Lua data:', luaData.substring(0, 500))

		const championMatches = luaData.matchAll(
			/\[\"([^"]+)\"\]\s*=\s*{((?:[^{}]|{(?:[^{}]|{[^{}]*})*})*?)}/g
		)

		for (const match of championMatches) {
			const [_, championKey, block] = match

			const idMatch = block.match(/\["id"\]\s*=\s*(\d+)/)
			const nameMatch = block.match(/\["apiname"\]\s*=\s*"([^"]+)"/)

			if (!idMatch || !nameMatch) {
				continue
			}

			const id = idMatch[1]
			const championName = nameMatch[1]

			const aramStats = extractAramStats(block)

			championData[id] = {
				id: id,
				name: championName,
				aram: aramStats,
			}
		}

		console.log(`Parsed ${Object.keys(championData).length} champions`)
		return championData
	} catch (error) {
		console.error('Error parsing wiki data:', error)
		throw error
	}
}

/**
 * Extract ARAM stats from champion block
 */
function extractAramStats(championBlock: string): AramStats {
	const defaultStats: AramStats = {
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
			return defaultStats
		}

		const statsBlock = statsBlockMatch[1]
		const aramBlockMatch = statsBlock.match(/\["aram"\]\s*=\s*{([^}]+)/)
		if (!aramBlockMatch) {
			return defaultStats
		}

		const aramBlock = aramBlockMatch[1]
		const stats = { ...defaultStats }

		const statRegex = /\["?([^"\]]+)"?\]\s*=\s*([+-]?\d*\.?\d+)/g
		let match

		while ((match = statRegex.exec(aramBlock)) !== null) {
			const [_, key, value] = match
			const normalizedKey = key.trim().toLowerCase()
			const mappedKey = mapStatKey(normalizedKey)

			if (mappedKey && mappedKey in stats) {
				const parsedValue = parseFloat(value)
				if (!isNaN(parsedValue)) {
					stats[mappedKey as keyof typeof stats] = parsedValue
				}
			}
		}

		return stats
	} catch (error) {
		console.error('Error extracting ARAM stats:', error)
		return defaultStats
	}
}

/**
 * Map stat keys to standard format
 */
function mapStatKey(key: string): string | null {
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
 * Extract patch version from HTML
 */
function extractPatchVersion(content: string): string | undefined {
	const patchMatch = content.match(/\["changes"\]\s*=\s*"(V\d+\.\d+)"/)
	return patchMatch?.[1]
}

/**
 * Upload data to PocketBase
 */
async function uploadToPocketBase(data: ChampionData, patchVersion?: string) {
	const content = {
		data,
		patchVersion,
		timestamp: Date.now(),
	}

	const url = `${POCKETBASE_URL}/api/collections/data/records`

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: POCKETBASE_TOKEN,
			},
			body: JSON.stringify({
				id: 'latestaramdata1',
				content,
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`Failed to upload to PocketBase: ${response.status} ${errorText}`
			)
		}

		console.log('Successfully uploaded data to PocketBase')
		return true
	} catch (error) {
		console.error('Error uploading to PocketBase:', error)
		return false
	}
}

/**
 * Main execution
 */
async function main() {
	console.log('Starting PocketBase initialization...')

	// Read HTML file
	const htmlPath = path.join(process.cwd(), 'html_exemple.html')
	if (!fs.existsSync(htmlPath)) {
		console.error('html_exemple.html not found')
		process.exit(1)
	}

	const html = fs.readFileSync(htmlPath, 'utf-8')
	console.log('HTML file loaded')

	// Parse data
	const championData = parseWikiData(html)
	const patchVersion = extractPatchVersion(html)

	console.log('Parsed champions:', Object.keys(championData).length)
	console.log('Patch version:', patchVersion)

	// Upload to PocketBase
	const success = await uploadToPocketBase(championData, patchVersion)

	if (success) {
		console.log('✓ PocketBase initialized successfully')
		process.exit(0)
	} else {
		console.log('✗ Failed to initialize PocketBase')
		process.exit(1)
	}
}

main()
