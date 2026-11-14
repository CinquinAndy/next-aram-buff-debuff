/**
 * Public JSON shape of the champion data, read by the desktop client (`desktop/`).
 * Bump PUBLIC_API_VERSION on a breaking change: the client refuses versions it does not know.
 * @module lib/publicApi
 */

import type { PageData } from './actions'
import type { AbilityChange, AramStats } from './types'

export const PUBLIC_API_VERSION = 1

export interface PublicChampion {
	/** Riot champion id, the one the League client uses in champion select */
	id: number
	/** Riot key ("MonkeyKing"), as in Data Dragon */
	apiName: string
	/** Name to show ("Wukong", "Cho'Gath") */
	name: string
	aram: AramStats
	mayhem: {
		stats: AramStats
		/** Stats Mayhem sets for this champion (the others are its ARAM values) */
		overridden: (keyof AramStats)[]
		/** Changes listed for Mayhem only; the ARAM ability changes also apply */
		abilities: AbilityChange[]
	}
}

export interface PublicChampionsResponse {
	version: typeof PUBLIC_API_VERSION
	patchVersion: string
	/** When the wiki data last changed */
	dataUpdatedAt: string
	mayhem: {
		available: boolean
		globalChanges: string[]
		updatedAt?: string
	}
	champions: PublicChampion[]
}

export function toPublicChampions(page: PageData): PublicChampionsResponse {
	const champions = Object.entries(page.champions)
		.map(([id, champion]): PublicChampion => {
			const apiName = champion.fullData?.apiname ?? champion.name
			return {
				id: Number(id),
				apiName,
				name: champion.displayName ?? (apiName === 'MonkeyKing' ? 'Wukong' : champion.name),
				aram: champion.aram,
				mayhem: {
					stats: champion.mayhem?.stats ?? champion.aram,
					overridden: champion.mayhem?.overridden ?? [],
					abilities: champion.mayhem?.abilities ?? [],
				},
			}
		})
		.filter(champion => Number.isInteger(champion.id))
		.sort((a, b) => a.name.localeCompare(b.name))

	return {
		version: PUBLIC_API_VERSION,
		patchVersion: page.patchInfos.patchVersion,
		dataUpdatedAt: page.patchInfos.patchDate.toISOString(),
		mayhem: page.mayhem,
		champions,
	}
}
