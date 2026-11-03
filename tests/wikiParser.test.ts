import { describe, expect, it } from 'vitest'
import { dataRevision, latestPatchVersion } from '@/app/lib/patchVersion'
import { type Champion, type ChampionData } from '@/app/lib/types'
import { extractLuaTable, hasAramChanges, parseChampionData, stripLuaComments } from '@/app/lib/wikiParser'
import { fixture } from './helpers'

const extract = fixture('champion-data-extrait.lua')
const page = fixture('module-page.html')

function byName(data: ChampionData, name: string): Champion[] {
	return Object.values(data).filter(champion => champion.name === name)
}

describe('stripLuaComments', () => {
	it('removes whole-line and trailing comments', () => {
		const lua = ['  ["range"] = 175,--see his passive', '  --["aram"] = { this is pointless', '  ["ms"] = 345,'].join('\n')
		expect(stripLuaComments(lua)).toBe(['  ["range"] = 175,', '  ', '  ["ms"] = 345,'].join('\n'))
	})

	it('keeps -- inside double-quoted strings', () => {
		expect(stripLuaComments('["title"] = "A -- B", -- comment')).toBe('["title"] = "A -- B", ')
	})
})

describe('extractLuaTable', () => {
	it('reads the table from the raw Lua source', () => {
		const table = extractLuaTable(extract)
		expect(table?.startsWith('{')).toBe(true)
		expect(table?.endsWith('}')).toBe(true)
	})

	it('reads the same table from the rendered module page (HTML-escaped <pre>)', () => {
		const table = extractLuaTable(page)
		expect(table).toContain('["Aatrox"]')
		expect(table).toContain(`["Kha'Zix"]`)
		expect(table).not.toContain('&quot;')
	})

	it('returns null on a page without the module (e.g. a Cloudflare challenge)', () => {
		expect(extractLuaTable('<html><title>Just a moment...</title></html>')).toBeNull()
	})
})

describe('parseChampionData on the extract', () => {
	const data = parseChampionData(extract)

	it('maps total_as to attack speed (Azir)', () => {
		const [azir] = byName(data, 'Azir')
		expect(azir.aram).toMatchObject({ dmg_dealt: 1, dmg_taken: 0.95, attack_speed: 1.025, ability_haste: 20 })
	})

	it('maps energyregen_mod to energy regen (Lee Sin) and reads tenacity (Akali)', () => {
		const [leeSin] = byName(data, 'LeeSin')
		expect(leeSin.aram).toMatchObject({
			dmg_dealt: 1.05,
			dmg_taken: 0.95,
			healing: 1.1,
			shielding: 1.2,
			energy_regen: 1.2,
		})
		const [akali] = byName(data, 'Akali')
		expect(akali.aram).toMatchObject({ dmg_taken: 0.95, energy_regen: 1.2, tenacity: 1.2 })
	})

	it('keeps a single Kled, without the commented-out "Kled & Skaarl" ARAM block', () => {
		const kleds = byName(data, 'Kled')
		expect(kleds).toHaveLength(1)
		expect(kleds[0].id).toBe('240')
		expect(kleds[0].aram).toMatchObject({ dmg_dealt: 1.05, dmg_taken: 1 })
		expect(data['240.1']).toBeUndefined()
	})

	it('skips the Mega Gnar alternate form', () => {
		expect(byName(data, 'GnarBig')).toHaveLength(0)
		expect(byName(data, 'Gnar')).toHaveLength(1)
	})

	it('treats a mode block set to 1 everywhere as unmodified (Vladimir)', () => {
		const [vladimir] = byName(data, 'Vladimir')
		expect(hasAramChanges(vladimir.aram)).toBe(false)
	})

	it('reads the newest champions (Zaahen)', () => {
		const [zaahen] = byName(data, 'Zaahen')
		expect(zaahen.aram).toMatchObject({ dmg_dealt: 0.95, dmg_taken: 1.05 })
	})

	it('defaults every stat to 1, the "unmodified" value used by the UI', () => {
		const [zaahen] = byName(data, 'Zaahen')
		expect(zaahen.aram).toMatchObject({ healing: 1, shielding: 1, ability_haste: 1, attack_speed: 1, energy_regen: 1, tenacity: 1 })
	})

	it('reads other game modes too (Azir in One for All)', () => {
		const [azir] = byName(data, 'Azir')
		expect(azir.fullData?.gameModes?.ofa).toMatchObject({ dmg_dealt: 1.08, dmg_taken: 0.9 })
	})
})

describe('parseChampionData on the full saved page', () => {
	const data = parseChampionData(page)
	const champions = Object.values(data)

	it('finds every champion once', () => {
		expect(champions.length).toBe(173)
		const names = champions.map(champion => champion.name)
		expect(new Set(names).size).toBe(names.length)
	})

	it('finds the champions with ARAM changes', () => {
		expect(champions.filter(champion => hasAramChanges(champion.aram)).length).toBeGreaterThanOrEqual(130)
	})

	it('includes Locke and Zaahen', () => {
		expect(byName(data, 'Locke')).toHaveLength(1)
		expect(byName(data, 'Zaahen')).toHaveLength(1)
	})

	it('has the data revision of the saved page', () => {
		expect(dataRevision(data)).toBe('V26.21')
		expect(latestPatchVersion(page)).toBe('V26.21')
	})
})
