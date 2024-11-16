'use client'

import { Champion } from '@/app/lib/types'
import { ArrowDownCircle, Sparkles, Equal } from 'lucide-react'
import { analyzeChampionStats } from '@/app/utils/aramUtils'

/**
 * Status badges component for champion card
 */
export const ChampionStatusBadges = ({ champion }: { champion: Champion }) => {
	const { hasBuffs, hasNerfs, buffCount, nerfCount } = analyzeChampionStats(
		champion.aram
	)

	return (
		<div className="mt-2 flex gap-2">
			{hasBuffs && (
				<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100 backdrop-blur-sm">
					<Sparkles className="h-3 w-3" />
					{buffCount} Buffs
				</span>
			)}
			{hasNerfs && (
				<span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-100 backdrop-blur-sm">
					<ArrowDownCircle className="h-3 w-3" />
					{nerfCount} Nerfs
				</span>
			)}
			{!hasBuffs && !hasNerfs && (
				<span className="inline-flex items-center gap-1 rounded-full bg-gray-500/20 px-3 py-1 text-xs font-medium text-rose-100 backdrop-blur-sm">
					<Equal className="h-3 w-3" />
					Normal
				</span>
			)}
		</div>
	)
}
