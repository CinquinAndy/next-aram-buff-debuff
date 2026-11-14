import { describe, expect, it } from 'vitest'
import { applyMayhem } from '@/app/lib/mayhem'
import { parseMayhemPage } from '@/app/lib/mayhemParser'
import { PUBLIC_API_VERSION, toPublicChampions } from '@/app/lib/publicApi'
import { parseChampionData } from '@/app/lib/wikiParser'
import { fixture } from './helpers'

const data = parseChampionData(fixture('module-page.html'))
const mayhem = parseMayhemPage(fixture('mayhem-page.html'))

const response = toPublicChampions({
	champions: applyMayhem(data, mayhem),
	patchInfos: { patchVersion: 'V26.22', patchDate: new Date('2026-11-06T13:27:45Z') },
	mayhem: { available: true, globalChanges: mayhem.globalChanges, updatedAt: '2026-11-14T14:54:18.000Z' },
})

function champion(apiName: string) {
	const found = response.champions.find(c => c.apiName === apiName)
	if (!found) throw new Error(`${apiName} missing`)
	return found
}

describe('toPublicChampions', () => {
	it('lists every champion by Riot id, sorted by name', () => {
		expect(response.version).toBe(PUBLIC_API_VERSION)
		expect(response.champions).toHaveLength(173)
		expect(champion('Aatrox').id).toBe(266)
		const names = response.champions.map(c => c.name)
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
	})

	it('uses the wiki name and keeps the Riot key', () => {
		expect(champion('MonkeyKing').name).toBe('Wukong')
		expect(champion('Chogath').name).toBe("Cho'Gath")
	})

	it('carries the ARAM and Mayhem values', () => {
		const akshan = champion('Akshan')
		expect(akshan.aram.dmg_dealt).toBe(1.05)
		expect(akshan.mayhem.stats.dmg_dealt).toBe(1)
		expect(akshan.mayhem.overridden).toEqual(['dmg_dealt', 'dmg_taken'])
		expect(champion('Garen').mayhem.abilities.map(a => a.ability)).toEqual(['Perseverance', 'Courage'])
	})

	it('carries the patch and the Mayhem global changes', () => {
		expect(response.patchVersion).toBe('V26.22')
		expect(response.dataUpdatedAt).toBe('2026-11-06T13:27:45.000Z')
		expect(response.mayhem.globalChanges).toContain('Attack speed cap changed to 5.0.')
	})
})
