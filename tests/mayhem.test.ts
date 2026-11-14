import { describe, expect, it } from 'vitest'
import {
	applyMayhem,
	findChampion,
	findWikiConflicts,
	mayhemForChampion,
	validateMayhemData,
} from '@/app/lib/mayhem'
import {
	extractMayhemSection,
	htmlToText,
	MayhemParseError,
	parseMayhemPage,
	parseStatLine,
} from '@/app/lib/mayhemParser'
import type { AramStats, MayhemData } from '@/app/lib/types'
import { parseChampionData } from '@/app/lib/wikiParser'
import { fixture } from './helpers'

const mayhemPage = fixture('mayhem-page.html')
const modulePage = fixture('module-page.html')

const neutral: AramStats = {
	dmg_dealt: 1,
	dmg_taken: 1,
	healing: 1,
	shielding: 1,
	ability_haste: 1,
	attack_speed: 1,
	energy_regen: 1,
	tenacity: 1,
}

function override(mayhem: MayhemData, name: string) {
	const found = mayhem.champions.find(champion => champion.name === name)
	if (!found) throw new Error(`${name} not in the Mayhem table`)
	return found
}

describe('parseStatLine', () => {
	it('turns percentages into multipliers, both the new and the old value', () => {
		expect(parseStatLine('Damage dealt changed to 0% from +5%.')).toEqual({ stat: 'dmg_dealt', value: 1, from: 1.05 })
		expect(parseStatLine('Damage received changed to -5% from +10%.')).toEqual({
			stat: 'dmg_taken',
			value: 0.95,
			from: 1.1,
		})
		expect(parseStatLine('Total attack speed changed to 0% from +3%.')).toEqual({
			stat: 'attack_speed',
			value: 1,
			from: 1.03,
		})
	})

	it('keeps ability haste flat, with 0 stored as the "unmodified" value 1', () => {
		expect(parseStatLine('Ability haste changed to 0 from 10.')).toEqual({ stat: 'ability_haste', value: 1, from: 10 })
		expect(parseStatLine('Ability haste changed to 0 from -10')).toEqual({ stat: 'ability_haste', value: 1, from: -10 })
	})

	it('reads lines without an old value and the typographic minus', () => {
		expect(parseStatLine('Tenacity changed to +20%.')).toEqual({ stat: 'tenacity', value: 1.2 })
		expect(parseStatLine('Damage dealt changed to −10% from −13%.')).toEqual({
			stat: 'dmg_dealt',
			value: 0.9,
			from: 0.87,
		})
	})

	it('returns null for a label it does not know', () => {
		expect(parseStatLine('Movement speed changed to +5% from 0%.')).toBeNull()
	})
})

describe('htmlToText', () => {
	it('joins inline tags and keeps keyword icons as words', () => {
		expect(htmlToText('Attack speed cap changed to 5.<small>0</small>.')).toBe('Attack speed cap changed to 5.0.')
		expect(htmlToText('(<img alt="An icon representing the keyword Melee" src="x"> 20 – 600)')).toBe('(Melee 20 – 600)')
	})
})

describe('parseMayhemPage', () => {
	const mayhem = parseMayhemPage(mayhemPage)

	it('reads every row of the champions table', () => {
		expect(mayhem.champions).toHaveLength(71)
		expect(mayhem.champions.map(champion => champion.name)).toEqual(
			expect.arrayContaining(["Cho'Gath", "Kai'Sa", 'Renata Glasc', 'Zaahen', 'Locke'])
		)
	})

	it('reads the special modifiers of a champion', () => {
		expect(override(mayhem, 'Akshan').stats).toEqual([
			{ stat: 'dmg_dealt', value: 1, from: 1.05 },
			{ stat: 'dmg_taken', value: 1, from: 0.95 },
		])
		expect(override(mayhem, 'Locke').stats).toEqual([
			{ stat: 'dmg_dealt', value: 1.05, from: 1 },
			{ stat: 'dmg_taken', value: 0.95, from: 1 },
			{ stat: 'tenacity', value: 1.2, from: 1 },
		])
		expect(override(mayhem, 'Hecarim').stats).toEqual([{ stat: 'ability_haste', value: 1, from: 10 }])
	})

	it('reads the ability changes, grouped by ability', () => {
		const garen = override(mayhem, 'Garen')
		expect(garen.stats).toEqual([])
		expect(garen.abilities.map(ability => ability.ability)).toEqual(['Perseverance', 'Courage'])
		expect(garen.abilities[1].changes).toContain('Cooldown changed to 18 / 16.5 / 15 / 13.5 / 12 seconds.')

		expect(override(mayhem, 'Teemo').abilities).toEqual([
			{ ability: 'Noxious Trap', changes: ['Damage dealt to minions increased to 100% from 66%.'] },
		])
		expect(override(mayhem, 'Hwei').abilities).toEqual([
			{ ability: 'General', changes: ["Abilities' damage to minions increased to 100% from 60%."] },
		])
	})

	it('reads the global stat changes', () => {
		expect(mayhem.globalChanges).toContain('Attack speed cap changed to 5.0.')
		expect(mayhem.globalChanges.join(' ')).toMatch(/Melee 20 – 600/)
	})

	it('refuses a page without the champions table', () => {
		expect(() => parseMayhemPage('<html><title>Just a moment...</title></html>')).toThrow(MayhemParseError)
	})

	it('refuses a stat line it cannot read instead of dropping it', () => {
		const changed = mayhemPage.replace('Healing done changed to 0% from -10%.', 'Healing done is now 0%.')
		expect(() => parseMayhemPage(changed)).toThrow(/Ahri: "Healing done is now 0%."/)
	})
})

describe('Mayhem values', () => {
	const data = parseChampionData(modulePage)
	const mayhem = parseMayhemPage(mayhemPage)

	it('finds champions by wiki name, including names that differ from the apiname', () => {
		expect(findChampion(data, "Cho'Gath")?.name).toBe('Chogath')
		expect(findChampion(data, 'Renata Glasc')?.name).toBe('Renata')
		expect(findChampion(data, 'Wukong')?.name).toBe('MonkeyKing')
		expect(findChampion(data, 'Nunu & Willump')?.name).toBe('Nunu')
	})

	it('applies the overrides on top of the ARAM values and keeps the rest', () => {
		const aram = { ...neutral, dmg_dealt: 1.05, dmg_taken: 0.95, healing: 0.9 }
		const result = mayhemForChampion(aram, {
			name: 'Test',
			stats: [{ stat: 'dmg_dealt', value: 1, from: 1.05 }],
			abilities: [],
		})
		expect(result.stats).toEqual({ ...aram, dmg_dealt: 1 })
		expect(result.overridden).toEqual(['dmg_dealt'])
	})

	it('gives every champion Mayhem values, equal to ARAM when the page lists nothing', () => {
		const withMayhem = applyMayhem(data, mayhem)
		const akshan = Object.values(withMayhem).find(champion => champion.name === 'Akshan')
		expect(akshan?.mayhem?.stats.dmg_dealt).toBe(1)
		expect(akshan?.mayhem?.stats.dmg_taken).toBe(1)

		const aatrox = Object.values(withMayhem).find(champion => champion.name === 'Aatrox')
		expect(aatrox?.mayhem?.stats).toEqual(aatrox?.aram)
		expect(aatrox?.mayhem?.overridden).toEqual([])

		const withoutPage = Object.values(applyMayhem(data))
		expect(withoutPage.every(champion => JSON.stringify(champion.mayhem?.stats) === JSON.stringify(champion.aram))).toBe(
			true
		)
	})

	it('lists where the module and the Mayhem page disagree on the ARAM value', () => {
		const conflicts = findWikiConflicts(data, mayhem)
		expect(conflicts.length).toBeGreaterThan(0)
		expect(conflicts).toContainEqual({ champion: 'Vladimir', stat: 'healing', module: 1, mayhemPageFrom: 0.9 })
	})

	it('validates the table against the champions of the module', () => {
		expect(validateMayhemData(mayhem, data)).toEqual({ ok: true, errors: [], unmatched: [] })
		expect(validateMayhemData({ champions: mayhem.champions.slice(0, 5), globalChanges: [] }, data).ok).toBe(false)
	})
})

describe('extractMayhemSection', () => {
	it('keeps everything the parser reads', () => {
		const extract = extractMayhemSection(mayhemPage)
		expect(extract.length).toBeLessThan(mayhemPage.length + 100)
		expect(parseMayhemPage(extract)).toEqual(parseMayhemPage(mayhemPage))
	})

	it('refuses a page without the overrides', () => {
		expect(() => extractMayhemSection('<html></html>')).toThrow(MayhemParseError)
	})
})
