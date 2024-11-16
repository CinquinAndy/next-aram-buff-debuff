/**
 * Server actions for fetching and managing ARAM data
 * @module lib/actions
 */

import { ChampionData } from '@/app/lib/types'
import { WikiDataService } from '@/app/services/WikiDataService'

/**
 * Fetches ARAM champion data from wiki or cache
 * Returns structured champion data with ARAM modifications
 */
export async function fetchAramData(): Promise<ChampionData> {
	console.info('Action: Fetching ARAM data')

	try {
		const wikiService = WikiDataService.getInstance()
		const { data, fromCache, patchVersion, timestamp } =
			await wikiService.getData({
				maxAge: 12 * 60 * 60 * 1000, // 12 hours
			})

		// Log detailed information about the data retrieval
		console.info('Action: ARAM data retrieved', {
			source: fromCache ? 'cache' : 'wiki',
			patchVersion,
			championsCount: Object.keys(data).length,
			dataAge: Date.now() - timestamp,
		})

		if (Object.keys(data).length === 0) {
			throw new Error('No champion data found')
		}

		return data
	} catch (error) {
		console.error('Action: Failed to fetch ARAM data:', error)
		throw new Error(
			`Failed to fetch ARAM data: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}
