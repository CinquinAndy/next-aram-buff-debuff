/** Shapes shared with the site (`src/app/lib/publicApi.ts`) and the Rust side (`lcu/src/state.rs`) */

export type StatKey =
	| 'dmg_dealt'
	| 'dmg_taken'
	| 'healing'
	| 'shielding'
	| 'ability_haste'
	| 'attack_speed'
	| 'energy_regen'
	| 'tenacity'

export type Stats = Partial<Record<StatKey, number>>

export interface AbilityChange {
	ability: string
	changes: string[]
}

export interface Champion {
	id: number
	apiName: string
	name: string
	aram: Stats
	mayhem: {
		stats: Stats
		overridden: StatKey[]
		abilities: AbilityChange[]
	}
}

/** Version of the site's JSON this app understands */
export const SUPPORTED_API_VERSION = 1

export interface ChampionsResponse {
	version: number
	patchVersion: string
	dataUpdatedAt: string
	mayhem: { available: boolean; globalChanges: string[]; updatedAt?: string }
	champions: Champion[]
}

export interface ChampionsPayload {
	data: ChampionsResponse
	/** The site could not be reached: this is the last saved copy */
	fromCache: boolean
	error: string | null
}

export type Mode = 'aram' | 'mayhem'

export interface Queue {
	id: number | null
	name: string | null
	mode: Mode | 'other'
}

export interface ChampSelect {
	myChampionId: number | null
	team: number[]
	bench: number[]
	benchEnabled: boolean
}

export type ClientState =
	| { status: 'noClient' }
	| { status: 'unreachable'; reason: string }
	| { status: 'idle'; phase: string; queue: Queue | null }
	| { status: 'champSelect'; queue: Queue | null; champSelect: ChampSelect }
