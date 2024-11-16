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
import Image from 'next/image'

/**
 * Enhanced champion card with modification score display
 */
export const ChampionCard: React.FC<{ champion: Champion; rank?: number }> = ({
	champion,
	rank,
}) => {
	const score = calculateModificationScore(champion)
	const hasModifications = Object.values(champion.aram).some(v => v !== 1)
	//if (!hasModifications) return null

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0 }}
			className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg"
		>
			{/* Champion image and header */}
			<div className="relative h-48 overflow-hidden">
				<Image
					height={200}
					width={300}
					src={`/images/champions/${champion.name}_splash.jpg`}
					alt={champion.name}
					className="h-full w-full object-cover transition-all ease-in group-hover:scale-105"
				/>

				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

				{/* Champion info */}
				<div className="absolute bottom-0 left-0 right-0 p-4">
					<h3 className="text-2xl font-bold text-white">{champion.name}</h3>

					{/* Using the new ChampionStatusBadges component */}
					<ChampionStatusBadges champion={champion} />
				</div>

				{score && (
					<div
						className={
							'absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full p-2 text-sm font-bold text-white backdrop-blur-sm ' +
							`${score.total == 0 ? 'bg-gray-500/50' : score.total > 0 ? 'bg-green-500/50' : 'bg-red-500/50'}`
						}
					>
						<span className={`text-xs italic`}>{score.total.toFixed(1)}</span>
					</div>
				)}

				<div className="absolute bottom-0 left-0 right-0 p-4">
					<div className="flex items-baseline justify-between">
						<h3 className="text-2xl font-bold text-white">{champion.name}</h3>
						<div className="text-sm text-white/80"></div>
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
				{!hasModifications && (
					<div className="group relative overflow-hidden rounded-xl border border-slate-200/10 bg-gradient-to-r from-gray-50 to-white p-3">
						this champion seem to be perfectly balanced, has everything should
						be...
					</div>
				)}
			</div>
		</motion.div>
	)
}
