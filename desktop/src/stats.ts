/**
 * Reading the balance values. Same conventions as the site (`src/app/utils/aramUtils.ts`):
 * 1 means "unmodified" for every stat; ability haste is flat (+10), the others are multipliers (1.05 = +5%);
 * less damage taken is good.
 */
import type { Champion, Mode, StatKey, Stats } from './types'

export const STAT_LABELS: Record<StatKey, string> = {
	dmg_dealt: 'Damage dealt',
	dmg_taken: 'Damage taken',
	healing: 'Healing',
	shielding: 'Shielding',
	ability_haste: 'Ability haste',
	attack_speed: 'Attack speed',
	energy_regen: 'Energy regen',
	tenacity: 'Tenacity',
}

const STAT_ORDER = Object.keys(STAT_LABELS) as StatKey[]

/** Weights of the site's power score */
const WEIGHTS: Record<StatKey, number> = {
	dmg_dealt: 1.2,
	dmg_taken: 1.2,
	healing: 1,
	shielding: 1,
	ability_haste: 0.8,
	attack_speed: 0.8,
	energy_regen: 0.6,
	tenacity: 0.6,
}

export function isModified(value: number | undefined): value is number {
	return value !== undefined && value !== 1
}

export function isBuff(stat: StatKey, value: number): boolean {
	if (stat === 'dmg_taken') return value < 1
	if (stat === 'ability_haste') return value > 0
	return value > 1
}

/** "+5%", "-10%", or "+10" for ability haste */
export function formatStat(stat: StatKey, value: number): string {
	if (stat === 'ability_haste') {
		const flat = Math.round(value)
		return `${flat > 0 ? '+' : ''}${flat}`
	}
	const percent = Math.round((value - 1) * 1000) / 10
	return `${percent > 0 ? '+' : ''}${percent}%`
}

export interface StatLine {
	stat: StatKey
	label: string
	value: number
	text: string
	buff: boolean
	/** Set by Mayhem (not inherited from ARAM) */
	mayhem: boolean
}

export function statsFor(champion: Champion, mode: Mode): Stats {
	return mode === 'mayhem' ? champion.mayhem.stats : champion.aram
}

/** Modified stats of a champion in a mode, in a fixed order */
export function statLines(champion: Champion, mode: Mode): StatLine[] {
	const stats = statsFor(champion, mode)
	return STAT_ORDER.filter(stat => isModified(stats[stat])).map(stat => {
		const value = stats[stat] as number
		return {
			stat,
			label: STAT_LABELS[stat],
			value,
			text: formatStat(stat, value),
			buff: isBuff(stat, value),
			mayhem: mode === 'mayhem' && champion.mayhem.overridden.includes(stat),
		}
	})
}

/** ARAM changes that Mayhem sets back to neutral, shown so "no change" is not mistaken for missing data */
export function removedInMayhem(champion: Champion): StatLine[] {
	return champion.mayhem.overridden
		.filter(stat => !isModified(champion.mayhem.stats[stat]) && isModified(champion.aram[stat]))
		.map(stat => {
			const value = champion.aram[stat] as number
			return { stat, label: STAT_LABELS[stat], value, text: formatStat(stat, value), buff: isBuff(stat, value), mayhem: true }
		})
}

/** Weighted sum of buffs minus nerfs, as on the site: positive means the champion is helped overall */
export function powerScore(champion: Champion, mode: Mode): number {
	let total = 0
	for (const line of statLines(champion, mode)) {
		const magnitude = line.stat === 'ability_haste' ? Math.abs(line.value) : Math.abs(line.value - 1) * 100
		total += (line.buff ? 1 : -1) * magnitude * WEIGHTS[line.stat]
	}
	return Math.round(total * 10) / 10
}
