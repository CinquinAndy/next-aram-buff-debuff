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
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name)
				case 'totalImpact':
					return Math.abs(b.score.total) - Math.abs(a.score.total)
				case 'buffPower':
					return b.score.buffs - a.score.buffs
				case 'nerfPower':
					return b.score.nerfs - a.score.nerfs
				default:
					return 0
			}
		})
	}, [championsData, searchTerm, sortBy])

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
			<Header
				searchTerm={searchTerm}
				onSearch={setSearchTerm}
				sortBy={sortBy}
				onSort={setSortBy}
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
