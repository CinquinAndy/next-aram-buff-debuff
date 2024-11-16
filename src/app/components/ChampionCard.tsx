'use client'

import { Champion } from '@/app/lib/types'
import { motion } from 'framer-motion'
import {
	ArrowUpNarrowWide,
	Droplet,
	Heart,
	Shield,
	ShieldPlus,
	Sword,
	Zap,
} from 'lucide-react'
import { calculateModificationScore } from '@/app/utils/aramUtils'
import { ChampionStatusBadges } from '@/app/components/ChampionStatusBadges'
import { StatDisplay } from '@/app/components/StatDisplay'

/**
 * Enhanced champion card with modification score display
 */
export const ChampionCard: React.FC<{ champion: Champion; rank?: number }> = ({
	champion,
	rank,
}) => {
	const score = calculateModificationScore(champion)
	const hasModifications = Object.values(champion.aram).some(v => v !== 1)
	if (!hasModifications) return null

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0 }}
			className="group relative overflow-hidden rounded-xl bg-white shadow-md shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.05]"
		>
			{/* Champion image and header */}
			<div className="relative h-48">
				<img
					src="/api/placeholder/400/300"
					alt={champion.name}
					className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>

				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-[2px]" />

				{/* Champion info */}
				<div className="absolute bottom-0 left-0 right-0 p-4">
					<h3 className="text-2xl font-bold text-white">{champion.name}</h3>

					{/* Using the new ChampionStatusBadges component */}
					<ChampionStatusBadges champion={champion} />
				</div>

				{/* New rank indicator */}
				{rank && (
					<div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white backdrop-blur-sm">
						#{rank}
					</div>
				)}

				<div className="absolute bottom-0 left-0 right-0 p-4">
					<div className="flex items-baseline justify-between">
						<h3 className="text-2xl font-bold text-white">{champion.name}</h3>
						<div className="text-sm text-white/80">
							Score: {score.total.toFixed(1)}
						</div>
					</div>

					<ChampionStatusBadges champion={champion} />
				</div>
			</div>

			{/* Stats section */}
			<div className="space-y-3 p-4">
				{Object.entries(champion.aram).map(([key, value]) => {
					if (value === 1) return null

					const statConfig = {
						dmg_dealt: { icon: Sword, label: 'Damage Dealt' },
						dmg_taken: { icon: Shield, label: 'Damage Taken' },
						healing: { icon: Heart, label: 'Healing' },
						shielding: { icon: ShieldPlus, label: 'Shielding' },
						ability_haste: { icon: Zap, label: 'Ability Haste' },
						attack_speed: { icon: ArrowUpNarrowWide, label: 'Attack Speed' },
						energy_regen: { icon: Droplet, label: 'Energy Regen' },
					}[key]

					if (!statConfig) return null

					return (
						<StatDisplay
							key={key}
							icon={statConfig.icon}
							label={statConfig.label}
							value={value}
							statKey={key}
						/>
					)
				})}
			</div>
		</motion.div>
	)
}
