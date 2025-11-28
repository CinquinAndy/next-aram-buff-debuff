import {
	Champion,
	ModificationScore,
	STAT_WEIGHTS,
	GameModeStats,
	AramStats,
} from '@/app/lib/types'
import type { GameMode } from '@/app/components/GameModeSelector'

/**
 * Default stats when no modifications exist
 */
export const DEFAULT_GAME_MODE_STATS: AramStats = {
	dmg_dealt: 1,
	dmg_taken: 1,
	healing: 1,
	shielding: 1,
	ability_haste: 1,
	attack_speed: 1,
	energy_regen: 1,
}

/**
 * Get stats for a specific game mode from champion data
 */
export const getGameModeStats = (
	champion: Champion,
	mode: GameMode
): AramStats => {
	// For ARAM, use the legacy aram field for backward compatibility
	if (mode === 'aram') {
		return champion.aram
	}

	// For other modes, get from fullData.gameModes
	const modeStats = champion.fullData?.gameModes?.[mode]
	if (!modeStats) {
		return { ...DEFAULT_GAME_MODE_STATS }
	}

	// Convert GameModeStats to AramStats format (filling defaults)
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
 * Check if a champion has any modifications for a specific game mode
 */
export const hasGameModeModifications = (
	champion: Champion,
	mode: GameMode
): boolean => {
	const stats = getGameModeStats(champion, mode)
	return Object.values(stats).some(value => value !== 1)
}

/**
 * Get all available game modes that have data for any champion
 */
export const getAvailableGameModes = (
	champions: Record<string, Champion>
): GameMode[] => {
	const modes = new Set<GameMode>()

	// ARAM is always available
	modes.add('aram')

	Object.values(champions).forEach(champion => {
		if (champion.fullData?.gameModes) {
			Object.keys(champion.fullData.gameModes).forEach(mode => {
				modes.add(mode as GameMode)
			})
		}
	})

	return Array.from(modes)
}

/**
 * Helper functions to analyze champion stats
 */
export const analyzeChampionStats = (stats: AramStats | GameModeStats) => {
	let buffs = 0
	let nerfs = 0

	Object.entries(stats).forEach(([key, value]) => {
		if (value === undefined || value === 1) return // Skip unmodified stats

		// Special handling for damage taken where reduction is a buff
		if (key === 'dmg_taken') {
			value < 1 ? buffs++ : nerfs++
		} else {
			value > 1 ? buffs++ : nerfs++
		}
	})

	return {
		hasBuffs: buffs > 0,
		hasNerfs: nerfs > 0,
		buffCount: buffs,
		nerfCount: nerfs,
	}
}

/**
 * Format stat value based on its type
 * Ability haste uses absolute values while other stats use percentages
 */
export const formatStatValue = (statKey: string, value: number): string => {
	// Special case: ability haste uses flat values
	if (statKey === 'ability_haste') {
		const absoluteValue = Math.round(value)
		return `${absoluteValue > 0 ? '+' : ''}${absoluteValue}`
	}

	// Other stats: calculate percentage
	const percentage = ((value - 1) * 100).toFixed(1)
	return `${(percentage as unknown as number) > 0 ? '+' : ''}${percentage}%`
}

/**
 * Calculate modification score for given stats
 */
export const calculateModificationScoreFromStats = (
	stats: AramStats | GameModeStats
): ModificationScore => {
	let total = 0
	let buffs = 0
	let nerfs = 0
	let buffCount = 0
	let nerfCount = 0
	let highestBuff = 0
	let lowestNerf = 0

	Object.entries(stats).forEach(([key, value]) => {
		if (value === undefined || value === 1) return

		const statWeight = STAT_WEIGHTS[key as keyof typeof STAT_WEIGHTS] ?? 1
		const isPositive = isStatPositive(key, value)

		let magnitude
		if (key === 'ability_haste') {
			magnitude = Math.abs(value - 1) * statWeight
		} else {
			magnitude = Math.abs(value - 1) * 100 * statWeight
		}

		if (isPositive) {
			buffs += magnitude
			buffCount++
			highestBuff = Math.max(highestBuff, magnitude)
		} else {
			nerfs += magnitude
			nerfCount++
			lowestNerf = Math.min(lowestNerf || magnitude, magnitude)
		}

		total += isPositive ? magnitude : -magnitude
	})

	return {
		total,
		buffs,
		nerfs: Math.abs(nerfs),
		buffCount,
		nerfCount,
		highestBuff,
		lowestNerf: Math.abs(lowestNerf),
	}
}

/**
 * Calculate modification score for a champion (legacy, uses ARAM stats)
 */
export const calculateModificationScore = (
	champion: Champion
): ModificationScore => {
	return calculateModificationScoreFromStats(champion.aram)
}

/**
 * Calculate modification score for a champion in a specific game mode
 */
export const calculateModificationScoreForMode = (
	champion: Champion,
	mode: GameMode
): ModificationScore => {
	const stats = getGameModeStats(champion, mode)
	return calculateModificationScoreFromStats(stats)
}

/**
 * Utility function to determine if a stat change is positive
 * Special case for damage taken where reduction is considered positive
 */
export const isStatPositive = (statKey: string, value: number): boolean => {
	if (statKey === 'dmg_taken') {
		return value < 1 // Damage reduction is positive
	}
	if (statKey === 'ability_haste') {
		return value > 0 // Ability haste use absolute values
	}
	return value > 1
}
