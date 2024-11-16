'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Champion } from '@/app/lib/types'
import { Header } from '@/app/components/Header'
import { ChampionCard } from '@/app/components/ChampionCard'
import { calculateModificationScore } from '@/app/utils/aramUtils'

export default function AramGrid({
	championsData,
}: {
	championsData: Record<string, Champion>
}) {
	const [searchTerm, setSearchTerm] = useState('')
	const [sortBy, setSortBy] = useState('name')
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

	const sortedChampions = useMemo(() => {
		const champions = Object.entries(championsData)
			.map(([id, data]) => ({
				...data,
				id,
				score: calculateModificationScore(data),
			}))
			.filter(champion => {
				const hasModifications = Object.values(champion.aram).some(v => v !== 1)
				const matchesSearch = champion.name
					.toLowerCase()
					.includes(searchTerm.toLowerCase())
				return hasModifications && matchesSearch
			})

		return champions.sort((a, b) => {
			let comparison = 0
			switch (sortBy) {
				case 'name':
					comparison = a.name.localeCompare(b.name)
					break
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
	}, [championsData, searchTerm, sortBy, sortDirection])

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
			<Header
				searchTerm={searchTerm}
				onSearch={setSearchTerm}
				sortBy={sortBy}
				onSort={setSortBy}
				sortDirection={sortDirection}
				onToggleDirection={() =>
					setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
				}
			/>

			<main className="mx-auto max-w-7xl px-4 py-6">
				<AnimatePresence mode="popLayout">
					<motion.div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{sortedChampions.map((champion, index) => (
							<ChampionCard
								key={champion.id}
								champion={champion}
								rank={index + 1}
							/>
						))}
					</motion.div>
				</AnimatePresence>
			</main>
		</div>
	)
}
