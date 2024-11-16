import { Champion, ModificationScore, STAT_WEIGHTS } from '@/app/lib/types'

/**
 * Helper functions to analyze champion stats
 */
export const analyzeChampionStats = (aram: Champion['aram']) => {
	let buffs = 0
	let nerfs = 0

	Object.entries(aram).forEach(([key, value]) => {
		if (value === 1) return // Skip unmodified stats

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
		const absoluteValue = Math.round((value - 1) * 100)
		return `${absoluteValue > 0 ? '+' : ''}${absoluteValue}`
	}

	// Other stats: calculate percentage
	const percentage = ((value - 1) * 100).toFixed(1)
	return `${(percentage as unknown as number) > 0 ? '+' : ''}${percentage}%`
}

/**
 * Calculate modification score for a champion
 */
export const calculateModificationScore = (
	champion: Champion
): ModificationScore => {
	let total = 0
	let buffs = 0
	let nerfs = 0
	let buffCount = 0
	let nerfCount = 0
	let highestBuff = 0
	let lowestNerf = 0

	Object.entries(champion.aram).forEach(([key, value]) => {
		if (value === 1) return

		const statWeight = STAT_WEIGHTS[key as keyof typeof STAT_WEIGHTS]
		const isPositive = key === 'dmg_taken' ? value < 1 : value > 1
		const magnitude = Math.abs(value - 1) * 100 * statWeight

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
 * Utility function to determine if a stat change is positive
 * Special case for damage taken where reduction is considered positive
 */
export const isStatPositive = (statKey: string, value: number): boolean => {
	if (statKey === 'dmg_taken') {
		return value < 1 // Damage reduction is positive
	}
	return value > 1
}
