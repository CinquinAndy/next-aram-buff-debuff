'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Champion } from '@/app/lib/types'
import { Header } from '@/app/components/Header'
import { ChampionCard } from '@/app/components/ChampionCard'
import { calculateModificationScore } from '@/app/utils/aramUtils'
import Link from 'next/link'

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

	const sortedChampions = useMemo(() => {
		const champions = Object.entries(championsData)
			.map(([id, data]) => ({
				...data,
				id,
				score: calculateModificationScore(data),
			}))
			.filter(champion => {
				const matchesSearch = champion.name
					.toLowerCase()
					.includes(searchTerm.toLowerCase())
				return matchesSearch
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
			/>

			<main className="mx-auto max-w-7xl px-4 py-6">
				<AnimatePresence mode="popLayout">
					<motion.div className="columns-1 gap-6 space-y-6 md:columns-3">
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
