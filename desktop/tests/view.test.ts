import { describe, expect, it } from 'vitest'
import { formatStat, powerScore, removedInMayhem, statLines } from '../src/stats'
import type { Champion, ClientState } from '../src/types'
import { buildView } from '../src/view'

function champion(id: number, name: string, aram: Champion['aram'], mayhem?: Partial<Champion['mayhem']>): Champion {
	return {
		id,
		apiName: name.replace(/[^A-Za-z]/g, ''),
		name,
		aram,
		mayhem: { stats: aram, overridden: [], abilities: [], ...mayhem },
	}
}

const akshan = champion(
	166,
	'Akshan',
	{ dmg_dealt: 1.05, dmg_taken: 0.95 },
	{ stats: { dmg_dealt: 1, dmg_taken: 1 }, overridden: ['dmg_dealt', 'dmg_taken'] }
)
const teemo = champion(17, 'Teemo', { dmg_dealt: 0.95, dmg_taken: 1.1, ability_haste: -15 })
const aatrox = champion(266, 'Aatrox', { dmg_dealt: 1.05 })
const annie = champion(1, 'Annie', {})
const all = [aatrox, akshan, annie, teemo]

const champSelect: ClientState = {
	status: 'champSelect',
	queue: { id: 2400, name: 'ARAM: Mayhem', mode: 'mayhem' },
	champSelect: { myChampionId: 166, team: [266, 166, 9999], bench: [1, 17], benchEnabled: true },
}

describe('stats', () => {
	it('formats percentages and flat ability haste', () => {
		expect(formatStat('dmg_dealt', 1.05)).toBe('+5%')
		expect(formatStat('dmg_taken', 0.925)).toBe('-7.5%')
		expect(formatStat('ability_haste', -15)).toBe('-15')
	})

	it('lists the modified stats with buffs and nerfs the right way round', () => {
		expect(statLines(teemo, 'aram').map(l => [l.stat, l.text, l.buff])).toEqual([
			['dmg_dealt', '-5%', false],
			['dmg_taken', '+10%', false],
			['ability_haste', '-15', false],
		])
		expect(statLines(akshan, 'aram').map(l => l.buff)).toEqual([true, true])
	})

	it('shows what Mayhem removes from ARAM', () => {
		expect(statLines(akshan, 'mayhem')).toEqual([])
		expect(removedInMayhem(akshan).map(l => `${l.label} ${l.text}`)).toEqual(['Damage dealt +5%', 'Damage taken -5%'])
	})

	it('scores like the site', () => {
		expect(powerScore(aatrox, 'aram')).toBe(6)
		expect(powerScore(teemo, 'aram')).toBe(-30)
		expect(powerScore(annie, 'aram')).toBe(0)
	})
})

describe('buildView', () => {
	it('shows your champion, your team and the bench in champion select', () => {
		const view = buildView(all, champSelect, '')
		expect(view.queueMode).toBe('mayhem')
		expect(view.status).toBe('Champion select · ARAM: Mayhem')
		expect(view.groups.map(g => [g.id, g.champions.map(c => c.name)])).toEqual([
			['mine', ['Akshan']],
			['team', ['Aatrox']],
			['bench', ['Annie', 'Teemo']],
		])
	})

	it('shows every champion outside champion select', () => {
		const view = buildView(all, { status: 'noClient' }, '')
		expect(view.queueMode).toBeNull()
		expect(view.groups).toHaveLength(1)
		expect(view.groups[0].champions).toHaveLength(4)
	})

	it('searches the whole list, even in champion select', () => {
		const view = buildView(all, champSelect, 'tee')
		expect(view.groups.map(g => g.champions.map(c => c.name))).toEqual([['Teemo']])
	})

	it('follows an ARAM queue', () => {
		const state: ClientState = { status: 'idle', phase: 'Lobby', queue: { id: 450, name: 'ARAM', mode: 'aram' } }
		expect(buildView(all, state, '').queueMode).toBe('aram')
	})
})
