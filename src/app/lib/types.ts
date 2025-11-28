/**
 * Game mode stat modifiers (ARAM, URF, USB, etc.)
 * All values default to 1 (no modification) if not specified
 */
export interface GameModeStats {
	dmg_dealt?: number
	dmg_taken?: number
	healing?: number
	shielding?: number
	ability_haste?: number
	attack_speed?: number
	energy_regen?: number
	tenacity?: number
}

/**
 * Legacy ARAM stats interface for backward compatibility
 */
export interface AramStats {
	dmg_dealt: number
	dmg_taken: number
	healing: number
	shielding: number
	ability_haste: number
	attack_speed: number
	energy_regen: number
}

/**
 * Base champion stats (hp, mana, armor, etc.)
 */
export interface ChampionBaseStats {
	hp_base: number
	hp_lvl: number
	mp_base: number
	mp_lvl: number
	arm_base: number
	arm_lvl: number
	mr_base: number
	mr_lvl: number
	hp5_base: number
	hp5_lvl: number
	mp5_base: number
	mp5_lvl: number
	dam_base: number
	dam_lvl: number
	as_base: number
	as_lvl: number
	range: number
	ms: number
	acquisition_radius?: number
	selection_height?: number
	selection_radius?: number
	pathing_radius?: number
	as_ratio?: number
	attack_cast_time?: number
	attack_total_time?: number
	attack_delay_offset?: number
	missile_speed?: number
}

/**
 * All game mode modifiers
 */
export interface GameModeModifiers {
	aram?: GameModeStats
	urf?: GameModeStats
	usb?: GameModeStats
	ofa?: GameModeStats
	nb?: GameModeStats
	ar?: GameModeStats
}

/**
 * Champion skill information
 */
export interface ChampionSkills {
	skill_i?: string[]
	skill_q?: string[]
	skill_w?: string[]
	skill_e?: string[]
	skill_r?: string[]
	skills?: string[]
}

/**
 * Full champion data from wiki
 */
export interface FullChampionData {
	// Basic info
	id: number
	apiname: string
	title?: string
	difficulty?: number
	herotype?: string
	alttype?: string
	resource?: string

	// Stats
	stats?: ChampionBaseStats

	// Game mode modifiers
	gameModes?: GameModeModifiers

	// Meta info
	rangetype?: string
	date?: string
	patch?: string
	changes?: string
	role?: string[]
	client_positions?: string[]
	external_positions?: string[]

	// Ratings
	damage?: number
	toughness?: number
	control?: number
	mobility?: number
	utility?: number
	style?: number
	adaptivetype?: string

	// Economy
	be?: number
	rp?: number

	// Skills
	skills?: ChampionSkills
}

/**
 * Legacy Champion interface for backward compatibility with UI
 */
export interface Champion {
	id: string
	name: string
	aram: AramStats
	splashArt?: string
	// Extended data (optional for backward compatibility)
	fullData?: FullChampionData
}

/**
 * Dictionary of champions by ID
 */
export interface ChampionData {
	[key: string]: Champion
}

/**
 * Full champion data dictionary (for API storage)
 */
export interface FullChampionDataMap {
	[key: string]: FullChampionData
}

export interface ChampionImage {
	loading: string
	splash: string
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
