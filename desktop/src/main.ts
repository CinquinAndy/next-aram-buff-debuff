import './styles.css'
import { createBackend, type DemoBackend } from './backend'
import { DEMO_STATES } from './demo/states'
import { renderGroups } from './render'
import { type ChampionsPayload, type ClientState, type Mode, SUPPORTED_API_VERSION } from './types'
import { checkForUpdate } from './updates'
import { buildView } from './view'

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T

const ui = {
	status: $<HTMLSpanElement>('#client-status'),
	data: $<HTMLSpanElement>('#data-status'),
	search: $<HTMLInputElement>('#search'),
	modeButtons: [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')],
	auto: $<HTMLButtonElement>('#mode-auto'),
	globals: $<HTMLDetailsElement>('#mayhem-globals'),
	content: $<HTMLElement>('#content'),
	error: $<HTMLDivElement>('#error'),
	demoBar: $<HTMLDivElement>('#demo-bar'),
	update: $<HTMLDivElement>('#update'),
}

let payload: ChampionsPayload | null = null
let clientState: ClientState = { status: 'noClient' }
/** null: follow the queue of the client (Mayhem by default) */
let chosenMode: Mode | null = null

function showError(message: string | null): void {
	ui.error.hidden = message === null
	ui.error.textContent = message ?? ''
}

function render(): void {
	if (!payload) return
	const view = buildView(payload.data.champions, clientState, ui.search.value)
	const mode: Mode = chosenMode ?? view.queueMode ?? 'mayhem'

	ui.status.textContent = view.status
	ui.status.dataset.status = clientState.status
	for (const button of ui.modeButtons) button.classList.toggle('active', button.dataset.mode === mode)
	ui.auto.classList.toggle('active', chosenMode === null)
	ui.auto.textContent = chosenMode === null && view.queueMode ? `Auto (${view.queueMode})` : 'Auto'

	const globals = payload.data.mayhem.globalChanges
	ui.globals.hidden = mode !== 'mayhem' || globals.length === 0
	ui.globals.querySelector('ul')?.replaceChildren(
		...globals.map(change => {
			const item = document.createElement('li')
			item.textContent = change
			return item
		})
	)

	renderGroups(ui.content, view.groups, mode)
}

function describeData(data: ChampionsPayload): string {
	const updated = data.data.dataUpdatedAt.slice(0, 10)
	return `Patch ${data.data.patchVersion} · wiki data ${updated}${data.fromCache ? ' · offline copy' : ''}`
}

async function loadChampions(load: () => Promise<ChampionsPayload>): Promise<void> {
	try {
		const loaded = await load()
		if (loaded.data.version !== SUPPORTED_API_VERSION) {
			showError('This version of the app is too old for the site data: install the latest release.')
			return
		}
		payload = loaded
		ui.data.textContent = describeData(loaded)
		showError(loaded.fromCache ? `Site unreachable, showing the last saved data (${loaded.error})` : null)
		render()
	} catch (error) {
		showError(`Could not load the champion data: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function setUpDemoBar(backend: DemoBackend): void {
	ui.demoBar.hidden = false
	DEMO_STATES.forEach((demo, index) => {
		const button = document.createElement('button')
		button.textContent = demo.label
		button.addEventListener('click', () => backend.setDemoState(index))
		ui.demoBar.append(button)
	})
}

async function main(): Promise<void> {
	const backend = await createBackend()

	ui.search.addEventListener('input', render)
	for (const button of ui.modeButtons) {
		button.addEventListener('click', () => {
			chosenMode = button.dataset.mode as Mode
			render()
		})
	}
	ui.auto.addEventListener('click', () => {
		chosenMode = null
		render()
	})

	if (backend.demo) setUpDemoBar(backend as DemoBackend)
	await backend.watchClient(state => {
		clientState = state
		render()
	})
	await loadChampions(() => backend.loadChampions())
	// Refresh the balance every hour; the site follows the wiki
	setInterval(() => loadChampions(() => backend.loadChampions()), 60 * 60 * 1000)

	if (!backend.demo) checkForUpdate(ui.update)
}

main()
