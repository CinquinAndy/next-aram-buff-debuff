'use client'

import type { AramStats, Champion } from '@/app/lib/types'
import {
	Anchor,
	ArrowUpNarrowWide,
	Droplet,
	Heart,
	Shield,
	ShieldPlus,
	Sword,
	Zap,
} from 'lucide-react'
import {
	calculateModificationScoreFromStats,
	analyzeChampionStats,
	formatStatValue,
} from '@/app/utils/aramUtils'
import { ChampionStatusBadges } from '@/app/components/ChampionStatusBadges'
import { StatDisplay } from '@/app/components/StatDisplay'
import type { GameMode } from '@/app/components/GameModeSelector'
import Image from 'next/image'

const STAT_LABELS: Record<keyof AramStats, string> = {
	dmg_dealt: 'Damage Dealt',
	dmg_taken: 'Damage Taken',
	healing: 'Healing',
	shielding: 'Shielding',
	ability_haste: 'Ability Haste',
	attack_speed: 'Attack Speed',
	energy_regen: 'Energy Regen',
	tenacity: 'Tenacity',
}

interface ChampionCardProps {
	champion: Champion
	rank?: number
	gameMode?: GameMode
	gameModeStats?: AramStats
}

/**
 * Enhanced champion card with modification score display
 */
export const ChampionCard: React.FC<ChampionCardProps> = ({
	champion,
	rank,
	gameMode = 'aram',
	gameModeStats,
}) => {
	// Use provided stats or fallback to aram stats
	const stats = gameModeStats ?? champion.aram
	const score = calculateModificationScoreFromStats(stats)
	const hasModifications = Object.values(stats).some(v => v !== undefined && v !== 1)
	const analysis = analyzeChampionStats(stats)
	const mayhem = gameMode === 'mayhem' ? champion.mayhem : undefined
	// ARAM changes Mayhem sets back to neutral: invisible otherwise, the card only lists modified stats
	const removedInMayhem = (mayhem?.overridden ?? []).filter(
		key => stats[key] === 1 && champion.aram[key] !== undefined && champion.aram[key] !== 1
	)

	return (
		<div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg transition-shadow duration-300 hover:shadow-xl">
			{/* Champion image and header */}
			<div className="relative h-48 overflow-hidden">
				<Image
					height={200}
					width={300}
					src={`/images/champions/${champion.name == 'Wukong' ? 'MonkeyKing' : champion.name}_splash.jpg`}
					alt={champion.name}
					className="h-full w-full object-cover transition-all ease-in group-hover:scale-105"
				/>

				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

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

					<ChampionStatusBadges
						hasBuffs={analysis.hasBuffs}
						hasNerfs={analysis.hasNerfs}
						buffCount={analysis.buffCount}
						nerfCount={analysis.nerfCount}
					/>
				</div>
			</div>

			{/* Stats section */}
			<div className="space-y-3 p-4">
				{Object.entries(stats).map(([key, value]) => {
					if (value === undefined || value === 1) return null

					const statConfig = {
						dmg_dealt: { icon: Sword, label: 'Damage Dealt' },
						dmg_taken: { icon: Shield, label: 'Damage Taken' },
						healing: { icon: Heart, label: 'Healing' },
						shielding: { icon: ShieldPlus, label: 'Shielding' },
						ability_haste: { icon: Zap, label: 'Ability Haste' },
						attack_speed: { icon: ArrowUpNarrowWide, label: 'Attack Speed' },
						energy_regen: { icon: Droplet, label: 'Energy Regen' },
						tenacity: { icon: Anchor, label: 'Tenacity' },
					}[key]

					if (!statConfig) return null

					return (
						<StatDisplay
							key={key}
							icon={statConfig.icon}
							label={statConfig.label}
							value={value}
							statKey={key}
							badge={mayhem?.overridden.includes(key as keyof AramStats) ? 'Mayhem' : undefined}
						/>
					)
				})}
				{!hasModifications && (
					<div className="rounded-lg border border-white/10 bg-white/5 p-3 py-4 text-center text-sm text-white/60">
						✨ Perfectly balanced
					</div>
				)}
				{removedInMayhem.length > 0 && (
					<p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
						Removed in Mayhem (ARAM value):{' '}
						{removedInMayhem
							.map(key => `${STAT_LABELS[key]} ${formatStatValue(key, champion.aram[key] ?? 1)}`)
							.join(', ')}
					</p>
				)}
				{mayhem && mayhem.abilities.length > 0 && (
					<div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-sm text-white/80">
						<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-200">Mayhem-only ability changes</p>
						<p className="mb-2 text-xs text-white/50">ARAM ability changes also apply and are not listed yet.</p>
						<ul className="space-y-2">
							{mayhem.abilities.map(ability => (
								<li key={ability.ability}>
									<span className="font-semibold text-white">{ability.ability}</span>
									<ul className="mt-1 list-disc space-y-0.5 pl-5 text-white/70">
										{ability.changes.map(change => (
											<li key={change}>{change}</li>
										))}
									</ul>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	)
}
