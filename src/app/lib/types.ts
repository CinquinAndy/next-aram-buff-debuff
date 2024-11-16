export interface AramStats {
	dmg_dealt: number
	dmg_taken: number
	healing: number
	shielding: number
	ability_haste: number
	attack_speed: number
	energy_regen: number
}

export interface Champion {
	id: string
	name: string
	aram: AramStats
}

export interface ChampionData {
	[key: string]: Champion
}

/**
 * Weight configuration for different stat types
 * Allows for more accurate power level calculation
 */
export const STAT_WEIGHTS = {
	dmg_dealt: 1.2, // High impact on power
	dmg_taken: 1.2, // High impact on power
	healing: 1, // Standard impact
	shielding: 1, // Standard impact
	ability_haste: 0.8, // Lower impact
	attack_speed: 0.8, // Lower impact
	energy_regen: 0.6, // Minimal impact
} as const

/**
 * Types for sorting and calculation
 */
export interface ModificationScore {
	total: number
	buffs: number
	nerfs: number
	buffCount: number
	nerfCount: number
	highestBuff: number
	lowestNerf: number
}

export type SortOption = {
	value: string
	label: string
	description: string
}

export const SORT_OPTIONS: SortOption[] = [
	{
		value: 'name',
		label: 'Champion Name',
		description: 'Sort alphabetically',
	},
	{
		value: 'totalImpact',
		label: 'Overall Impact',
		description: 'Combined buffs and nerfs',
	},
	{
		value: 'buffPower',
		label: 'Strongest Buffs',
		description: 'Highest positive modifications',
	},
	{
		value: 'nerfPower',
		label: 'Heaviest Nerfs',
		description: 'Strongest negative modifications',
	},
]

export interface StatDisplayProps {
	icon: React.ElementType
	label: string
	value: number
	statKey: string
}
