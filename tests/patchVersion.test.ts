import { describe, expect, it } from 'vitest'
import { checkFreshness } from '@/app/lib/dataValidation'
import { latestPatchVersion, patchDistance, patchFromDdragonVersion } from '@/app/lib/patchVersion'

describe('patchFromDdragonVersion', () => {
	it('maps Data Dragon 15+ to year-named patches', () => {
		expect(patchFromDdragonVersion('16.21.1')).toBe('V26.21')
		expect(patchFromDdragonVersion('15.1.1')).toBe('V25.1')
	})

	it('keeps older versions as they are', () => {
		expect(patchFromDdragonVersion('14.24.1')).toBe('V14.24')
	})

	it('returns undefined on garbage', () => {
		expect(patchFromDdragonVersion('lolpatch_7.20')).toBeUndefined()
	})
})

describe('latestPatchVersion', () => {
	it('compares patches numerically', () => {
		expect(latestPatchVersion('["changes"] = "V26.9", ["changes"] = "V26.10", ["changes"] = "V25.24"')).toBe('V26.10')
	})
})

describe('checkFreshness', () => {
	it('accepts data one or two patches behind', () => {
		expect(checkFreshness('V26.21', 'V26.21').ok).toBe(true)
		expect(checkFreshness('V26.19', 'V26.21').ok).toBe(true)
	})

	it('rejects old data, like the V25.23 shown for a year', () => {
		const result = checkFreshness('V25.23', 'V26.21')
		expect(result.ok).toBe(false)
		expect(result.lag).toBe(patchDistance({ season: 25, patch: 23 }, { season: 26, patch: 21 }))
	})

	it('rejects missing values', () => {
		expect(checkFreshness(undefined, 'V26.21').ok).toBe(false)
		expect(checkFreshness('V26.21', undefined).ok).toBe(false)
	})
})
