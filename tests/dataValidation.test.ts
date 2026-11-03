import { describe, expect, it } from 'vitest'
import { validateChampionData } from '@/app/lib/dataValidation'
import type { ChampionData } from '@/app/lib/types'
import { parseChampionData } from '@/app/lib/wikiParser'
import { fixture } from './helpers'

const full = parseChampionData(fixture('module-page.html'))

function subset(data: ChampionData, count: number): ChampionData {
	return Object.fromEntries(Object.entries(data).slice(0, count))
}

describe('validateChampionData', () => {
	it('accepts the full saved page', () => {
		const result = validateChampionData(full)
		expect(result.errors).toEqual([])
		expect(result.ok).toBe(true)
	})

	it('rejects empty data', () => {
		const result = validateChampionData({})
		expect(result.ok).toBe(false)
		expect(result.errors.join(' ')).toContain('only 0 champions')
	})

	it('rejects a partial page', () => {
		expect(validateChampionData(subset(full, 60)).ok).toBe(false)
	})

	it('rejects data where no ARAM block was read', () => {
		const flattened: ChampionData = Object.fromEntries(
			Object.entries(full).map(([id, champion]) => [
				id,
				{
					...champion,
					aram: { dmg_dealt: 1, dmg_taken: 1, healing: 1, shielding: 1, ability_haste: 1, attack_speed: 1, energy_regen: 1 },
				},
			])
		)
		const result = validateChampionData(flattened)
		expect(result.ok).toBe(false)
		expect(result.errors.join(' ')).toContain('ARAM changes')
	})

	it('rejects a sharp drop against the stored data', () => {
		const smaller = subset(full, 152)
		expect(validateChampionData(smaller).ok).toBe(true)
		expect(validateChampionData(smaller, full).ok).toBe(false)
	})

	it('rejects data older than the stored data', () => {
		const older: ChampionData = Object.fromEntries(
			Object.entries(full).map(([id, champion]) => [
				id,
				{ ...champion, fullData: champion.fullData && { ...champion.fullData, changes: 'V25.23' } },
			])
		)
		const result = validateChampionData(older, full)
		expect(result.ok).toBe(false)
		expect(result.errors.join(' ')).toContain('older than the stored V26.21')
	})

	it('rejects non-numeric values', () => {
		const broken = structuredClone(full)
		const first = Object.values(broken)[0]
		first.aram.dmg_dealt = Number.NaN
		expect(validateChampionData(broken).ok).toBe(false)
	})
})
