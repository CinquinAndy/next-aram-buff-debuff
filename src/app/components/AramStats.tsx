'use client'

import { useMemo, useState } from 'react'
import { Champion, AramStats } from '@/app/lib/types'
import { Header } from '@/app/components/Header'
import { ChampionCard } from '@/app/components/ChampionCard'
import {
	calculateModificationScoreForMode,
	getAvailableGameModes,
	getGameModeStats,
} from '@/app/utils/aramUtils'
import {
	GameModeSelector,
	type GameMode,
} from '@/app/components/GameModeSelector'
import Link from 'next/link'
import { ModificationScore } from '@/app/lib/types'

interface ChampionWithScore extends Champion {
	score: ModificationScore
	currentModeStats: AramStats
}

export default function AramGrid({
	championsData,
	patchInfos,
}: {
	championsData: Record<string, Champion>
	patchInfos: {
		patchDate: Date
		patchVersion: string
	}
}) {
	const [searchTerm, setSearchTerm] = useState('')
	const [sortBy, setSortBy] = useState('name')
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
	const [selectedMode, setSelectedMode] = useState<GameMode>('aram')

	// Get available game modes based on champion data
	const availableModes = useMemo(
		() => getAvailableGameModes(championsData),
		[championsData]
	)

	// Base list of champions (sorted by name by default, stable order)
	const baseChampionsList = useMemo(() => {
		return Object.entries(championsData)
			.map(([id, data]) => ({
				...data,
				id,
			}))
			.sort((a, b) => a.name.localeCompare(b.name)) // Always alphabetical base
	}, [championsData])

	// Filter and sort based on user preferences
	const sortedChampions = useMemo(() => {
		// Filter by search term
		const filtered = baseChampionsList.filter(champion =>
			champion.name.toLowerCase().includes(searchTerm.toLowerCase())
		)

		// Add mode-specific stats for display
		const withStats = filtered.map(champion => ({
			...champion,
			score: calculateModificationScoreForMode(champion, selectedMode),
			currentModeStats: getGameModeStats(champion, selectedMode),
		}))

		// Sort based on user selection
		if (sortBy === 'name') {
			// Already sorted alphabetically, just apply direction
			return sortDirection === 'desc' ? [...withStats].reverse() : withStats
		}

		// Sort by score-based criteria
		return withStats.sort((a, b) => {
			let comparison = 0
			switch (sortBy) {
				case 'totalImpact':
					comparison = Math.abs(b.score.total) - Math.abs(a.score.total)
					break
				case 'buffPower':
					comparison = b.score.buffs - a.score.buffs
					break
				case 'nerfPower':
					comparison = b.score.nerfs - a.score.nerfs
					break
				default:
					return 0
			}
			return sortDirection === 'asc' ? comparison : -comparison
		})
	}, [baseChampionsList, searchTerm, sortBy, sortDirection, selectedMode])

	return (
		<div className="h-full min-h-screen bg-gradient-to-br from-[#0a1528] from-20% to-[#73551a]">
			<Header
				searchTerm={searchTerm}
				onSearch={setSearchTerm}
				sortBy={sortBy}
				onSort={setSortBy}
				sortDirection={sortDirection}
				onToggleDirection={() =>
					setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
				}
			>
				<GameModeSelector
					selectedMode={selectedMode}
					onModeChange={setSelectedMode}
					availableModes={availableModes}
				/>
			</Header>

			<main className="mx-auto max-w-7xl px-4 py-6">
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{sortedChampions.map((champion, index) => (
						<ChampionCard
							key={`${champion.id}-${selectedMode}`}
							champion={champion}
							rank={index + 1}
							gameMode={selectedMode}
							gameModeStats={champion.currentModeStats}
						/>
					))}
				</div>
			</main>

			<Link
				href={'https://www.leagueoflegends.com/en-us/news/tags/patch-notes/'}
				className={
					'fixed left-0 top-[150px] rounded-3xl rounded-l bg-white/10 p-3 text-xs text-white md:top-[100px]'
				}
			>
				Last patch : {patchInfos.patchVersion}
			</Link>
		</div>
	)
}
