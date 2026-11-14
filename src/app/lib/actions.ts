/**
 * Server-side data loading for the page
 * @module lib/actions
 */

import { applyMayhem } from '@/app/lib/mayhem'
import type { ChampionData } from '@/app/lib/types'
import { WikiDataService } from '@/app/services/WikiDataService'

export interface PageData {
	champions: ChampionData
	patchInfos: {
		patchVersion: string
		/** When the wiki data last changed (Last-Modified of the page); fetch time for older records */
		patchDate: Date
	}
	mayhem: {
		/** False until a refresh has read the Mayhem page: the Mayhem tab then shows ARAM values */
		available: boolean
		/** "Global stat changes" of the Mayhem page (bonus health, armor, attack speed cap…) */
		globalChanges: string[]
		/** When the Mayhem page last changed, when known */
		updatedAt?: string
	}
}

/**
 * Reads the stored data once (PocketBase only, no scraping: /api/refresh does that)
 * and adds each champion's ARAM: Mayhem values.
 */
export async function fetchPageData(): Promise<PageData> {
	const wikiService = WikiDataService.getInstance()
	const { data, patchVersion, timestamp, sourceUpdatedAt, mayhem } = await wikiService.getDataFromCache()

	const championsCount = Object.keys(data).length
	console.info('Action: Data read from cache', {
		patchVersion,
		championsCount,
		mayhemChampions: mayhem?.champions.length ?? 0,
		dataAge: Date.now() - timestamp,
	})

	if (championsCount === 0) {
		throw new Error('No champion data found in PocketBase. Please call /api/refresh to populate the cache.')
	}

	return {
		champions: applyMayhem(data, mayhem),
		patchInfos: {
			patchVersion: patchVersion ?? 'unknown',
			patchDate: new Date(sourceUpdatedAt ?? timestamp),
		},
		mayhem: {
			available: Boolean(mayhem),
			globalChanges: mayhem?.globalChanges ?? [],
			updatedAt: mayhem?.sourceUpdatedAt,
		},
	}
}
