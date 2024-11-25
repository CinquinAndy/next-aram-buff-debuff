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

		const championsCount = Object.keys(data).length

		// Log detailed information about the data retrieval
		console.info('Action: ARAM data retrieved', {
			source: fromCache ? 'cache' : 'wiki',
			patchVersion,
			championsCount,
			dataAge: Date.now() - timestamp,
		})

		if (championsCount === 0) {
			console.error('Action: No champion data found in the response')
			throw new Error(
				'No champion data found in the parsed response. Check the wiki data format.'
			)
		}

		return data
	} catch (error) {
		console.error('Action: Failed to fetch ARAM data:', error)
		throw new Error(
			`Failed to fetch ARAM data: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}

/**
 * Retrieves information about the latest patch version and its timestamp
 * @returns Object containing the patch version and its date
 */
export async function getPatchInfos(): Promise<{
	patchVersion: string
	patchDate: Date
}> {
	console.info('Action: Fetching patch information')

	try {
		const wikiService = WikiDataService.getInstance()
		const { patchVersion, timestamp } = await wikiService.getData({
			maxAge: 12 * 60 * 60 * 1000, // 12 hours
		})

		if (!patchVersion || !timestamp) {
			console.error('Action: Patch information is missing in the response')
			throw new Error(
				'Patch information not found in the response. Verify the wiki data source.'
			)
		}

		// TODO : trouver le vraie patchdate dans le scrap, ca c'est pas la vraie date <3
		const patchDate = new Date(timestamp)

		console.info('Action: Patch information retrieved', {
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
