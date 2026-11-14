/** Fake League client states for the demo mode, shaped like the Rust side's `ClientState` */
import type { ClientState } from '../types'

const mayhem = { id: 2400, name: 'ARAM: Mayhem', mode: 'mayhem' as const }
const aram = { id: 450, name: 'ARAM', mode: 'aram' as const }

export const DEMO_STATES: { label: string; state: ClientState }[] = [
	{ label: 'No client', state: { status: 'noClient' } },
	{ label: 'Lobby', state: { status: 'idle', phase: 'Lobby', queue: mayhem } },
	{
		label: 'Mayhem select',
		state: {
			status: 'champSelect',
			queue: mayhem,
			// Aatrox, Ahri, Akali, Akshan, Vladimir; bench Annie, Teemo, Garen, Hecarim
			champSelect: { myChampionId: 166, team: [266, 103, 84, 166, 8], bench: [1, 17, 86, 120], benchEnabled: true },
		},
	},
	{
		label: 'After a reroll',
		state: {
			status: 'champSelect',
			queue: mayhem,
			champSelect: { myChampionId: 17, team: [266, 103, 84, 17, 8], bench: [1, 166, 86, 120, 412], benchEnabled: true },
		},
	},
	{
		label: 'ARAM select',
		state: {
			status: 'champSelect',
			queue: aram,
			champSelect: { myChampionId: 120, team: [120, 51, 25, 99, 54], bench: [101, 143], benchEnabled: true },
		},
	},
]
