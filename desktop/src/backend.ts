/**
 * Where the data comes from: the Rust side inside the app, or a demo in a plain browser
 * (`pnpm dev` on Linux, without a League client).
 */
import { DEMO_STATES } from './demo/states'
import type { ChampionsPayload, ChampionsResponse, ClientState } from './types'

export interface Backend {
	demo: boolean
	loadChampions(): Promise<ChampionsPayload>
	/** Calls back with the current state, then on every change. Returns a function that stops listening. */
	watchClient(onState: (state: ClientState) => void): Promise<() => void>
}

export function isTauri(): boolean {
	return '__TAURI_INTERNALS__' in window
}

async function tauriBackend(): Promise<Backend> {
	const { invoke } = await import('@tauri-apps/api/core')
	const { listen } = await import('@tauri-apps/api/event')
	return {
		demo: false,
		loadChampions: () => invoke<ChampionsPayload>('load_champions'),
		async watchClient(onState) {
			const unlisten = await listen<ClientState>('client-state', event => onState(event.payload))
			const current = await invoke<ClientState | null>('client_state')
			if (current) onState(current)
			return unlisten
		},
	}
}

const DEMO_CHAMPIONS_URL = import.meta.env.VITE_CHAMPIONS_URL ?? 'https://aram-balances-checker.forhives.fr/api/champions'

/** Demo: real champion data, fake client states switched from the demo bar (see main.ts) */
function demoBackend(): Backend & { setDemoState(index: number): void } {
	let listener: ((state: ClientState) => void) | null = null
	return {
		demo: true,
		async loadChampions() {
			const response = await fetch(DEMO_CHAMPIONS_URL)
			if (!response.ok) throw new Error(`${DEMO_CHAMPIONS_URL} answered ${response.status}`)
			return { data: (await response.json()) as ChampionsResponse, fromCache: false, error: null }
		},
		async watchClient(onState) {
			listener = onState
			onState(DEMO_STATES[0].state)
			return () => {
				listener = null
			}
		},
		setDemoState(index) {
			listener?.(DEMO_STATES[index].state)
		},
	}
}

export type DemoBackend = ReturnType<typeof demoBackend>

export async function createBackend(): Promise<Backend | DemoBackend> {
	return isTauri() ? tauriBackend() : demoBackend()
}
