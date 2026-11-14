/** DOM for the champion cards. Text goes through textContent only: the data comes from the network. */
import { powerScore, removedInMayhem, statLines } from './stats'
import type { Champion, Mode } from './types'
import type { Group } from './view'

const ICON_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag)
	if (className) node.className = className
	if (text !== undefined) node.textContent = text
	return node
}

export function championCard(champion: Champion, mode: Mode): HTMLElement {
	const card = el('article', 'card')

	const header = el('header', 'card-header')
	const icon = el('img', 'card-icon')
	icon.src = `${ICON_URL}/${champion.id}.png`
	icon.alt = ''
	icon.loading = 'lazy'
	const score = powerScore(champion, mode)
	const scoreBadge = el('span', `score ${score > 0 ? 'buff' : score < 0 ? 'nerf' : 'neutral'}`, score.toFixed(1))
	scoreBadge.title = 'Weighted sum of buffs minus nerfs'
	header.append(icon, el('h3', 'card-name', champion.name), scoreBadge)
	card.append(header)

	const lines = statLines(champion, mode)
	const list = el('ul', 'stats')
	for (const line of lines) {
		const item = el('li', `stat ${line.buff ? 'buff' : 'nerf'}`)
		const label = el('span', 'stat-label', line.label)
		if (line.mayhem) label.append(el('span', 'tag', 'Mayhem'))
		item.append(label, el('span', 'stat-value', line.text))
		list.append(item)
	}
	if (lines.length === 0) list.append(el('li', 'stat neutral', 'No changes'))
	card.append(list)

	if (mode === 'mayhem') {
		const removed = removedInMayhem(champion)
		if (removed.length > 0) {
			card.append(
				el('p', 'note', `Removed in Mayhem (ARAM value): ${removed.map(r => `${r.label} ${r.text}`).join(', ')}`)
			)
		}
		if (champion.mayhem.abilities.length > 0) {
			const abilities = el('details', 'abilities')
			abilities.append(el('summary', undefined, `Mayhem ability changes (${champion.mayhem.abilities.length})`))
			for (const ability of champion.mayhem.abilities) {
				abilities.append(el('p', 'ability-name', ability.ability))
				const changes = el('ul')
				for (const change of ability.changes) changes.append(el('li', undefined, change))
				abilities.append(changes)
			}
			card.append(abilities)
		}
	}
	return card
}

export function renderGroups(container: HTMLElement, groups: Group[], mode: Mode): void {
	container.replaceChildren()
	for (const group of groups) {
		const section = el('section', `group group-${group.id}`)
		section.append(el('h2', 'group-title', group.label))
		const grid = el('div', 'grid')
		for (const champion of group.champions) grid.append(championCard(champion, mode))
		if (group.champions.length === 0) grid.append(el('p', 'empty', 'Nothing here yet'))
		section.append(grid)
		container.append(section)
	}
}
