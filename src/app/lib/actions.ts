/**
 * Server actions for fetching and managing ARAM data
 * @module lib/actions
 */

import { ChampionData } from '@/app/lib/types'
import { WikiDataService } from '@/app/services/WikiDataService'

/**
 * Fetches ARAM champion data from PocketBase cache ONLY
 * Does NOT trigger wiki scraping - use /api/refresh for that
 * Returns structured champion data with ARAM modifications
 */
export async function fetchAramData(): Promise<ChampionData> {
	console.info('Action: Fetching ARAM data from PocketBase cache')

	try {
		const wikiService = WikiDataService.getInstance()
		const { data, patchVersion, timestamp } =
			await wikiService.getDataFromCache()

		const championsCount = Object.keys(data).length

		// Log detailed information about the data retrieval
		console.info('Action: ARAM data retrieved from cache', {
			patchVersion,
			championsCount,
			dataAge: Date.now() - timestamp,
		})

		if (championsCount === 0) {
			console.error('Action: No champion data found in PocketBase')
			throw new Error(
				'No champion data found in PocketBase. Please call /api/refresh to populate the cache.'
			)
		}

		return data
	} catch (error) {
		console.error('Action: Failed to fetch ARAM data:', error)

		// Provide helpful error message if PocketBase is empty
		if (
			error instanceof Error &&
			error.message.includes('No data available')
		) {
			throw new Error(
				'PocketBase cache is empty. Please call POST /api/refresh to populate data from the wiki.'
			)
		}

		throw new Error(
			`Failed to fetch ARAM data: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}

/**
 * Retrieves information about the latest patch version and its timestamp
 * Reads from PocketBase cache only
 * @returns Object containing the patch version and its date
 */
export async function getPatchInfos(): Promise<{
	patchVersion: string
	patchDate: Date
}> {
	console.info('Action: Fetching patch information from cache')

	try {
		const wikiService = WikiDataService.getInstance()
		const { patchVersion, timestamp } = await wikiService.getDataFromCache()

		if (!patchVersion || !timestamp) {
			console.error('Action: Patch information is missing in PocketBase')
			throw new Error(
				'Patch information not found in PocketBase. Call /api/refresh to populate.'
			)
		}

		// TODO : trouver le vraie patchdate dans le scrap, ca c'est pas la vraie date <3
		const patchDate = new Date(timestamp)

		console.info('Action: Patch information retrieved from cache', {
			patchVersion,
			patchDate,
		})

		return { patchVersion, patchDate }
	} catch (error) {
		console.error('Action: Failed to fetch patch information:', error)
		throw new Error(
			`Failed to fetch patch information: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`
		)
	}
}
