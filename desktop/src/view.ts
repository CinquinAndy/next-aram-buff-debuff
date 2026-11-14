/**
 * What the window shows for a client state: which champions, in which groups, under which title.
 * Pure: no DOM, no Tauri.
 */
import type { Champion, ClientState, Mode } from './types'

export interface Group {
	id: 'mine' | 'team' | 'bench' | 'all'
	label: string
	champions: Champion[]
}

export interface View {
	status: string
	groups: Group[]
	/** Mode the queue asks for, when the client says (null outside ARAM queues) */
	queueMode: Mode | null
}

function byIds(ids: number[], champions: Map<number, Champion>): Champion[] {
	return ids.map(id => champions.get(id)).filter((c): c is Champion => c !== undefined)
}

function matches(champion: Champion, search: string): boolean {
	const query = search.trim().toLowerCase()
	return query === '' || champion.name.toLowerCase().includes(query) || champion.apiName.toLowerCase().includes(query)
}

function queueMode(state: ClientState): Mode | null {
	if (state.status !== 'idle' && state.status !== 'champSelect') return null
	const mode = state.queue?.mode
	return mode === 'aram' || mode === 'mayhem' ? mode : null
}

function statusText(state: ClientState): string {
	switch (state.status) {
		case 'noClient':
			return 'League client not running'
		case 'unreachable':
			return 'League client starting…'
		case 'idle':
			return state.queue?.name ? `${state.queue.name} · ${state.phase}` : `Client: ${state.phase}`
		case 'champSelect':
			return `Champion select${state.queue?.name ? ` · ${state.queue.name}` : ''}`
	}
}

export function buildView(champions: Champion[], state: ClientState, search: string): View {
	const index = new Map(champions.map(champion => [champion.id, champion]))
	const all: Group = { id: 'all', label: 'All champions', champions: champions.filter(c => matches(c, search)) }
	const base = { status: statusText(state), queueMode: queueMode(state) }

	// Searching shows the full list, whatever the client does
	if (state.status !== 'champSelect' || search.trim() !== '') return { ...base, groups: [all] }

	const { myChampionId, team, bench, benchEnabled } = state.champSelect
	const groups: Group[] = []
	const mine = myChampionId !== null ? index.get(myChampionId) : undefined
	if (mine) groups.push({ id: 'mine', label: 'Your champion', champions: [mine] })

	const teammates = byIds(
		team.filter(id => id !== myChampionId),
		index
	)
	if (teammates.length > 0) groups.push({ id: 'team', label: 'Your team', champions: teammates })

	if (benchEnabled || bench.length > 0) {
		groups.push({ id: 'bench', label: `Bench (${bench.length})`, champions: byIds(bench, index) })
	}
	return { ...base, groups }
}
