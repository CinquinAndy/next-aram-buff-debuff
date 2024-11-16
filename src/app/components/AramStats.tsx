/**
 * Modern ARAM Stats UI Implementation
 * Handles ARAM balance changes with base 1.0 multiplier format
 * @module components/AramStats
 */

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
	Heart,
	Sword,
	Shield,
	ShieldPlus,
	Zap,
	ArrowUpNarrowWide,
	Droplet,
	Search,
	SortAsc,
	ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Champion, ChampionData } from '@/app/lib/types'

interface StatInfo {
	icon: React.ReactNode
	label: string
	value: number
	key: keyof Champion['aram']
	description: string
}

/**
 * Converts a multiplier (1.x) to percentage change
 * @param multiplier - The base 1.0 multiplier (e.g., 1.10 for +10%)
 * @returns The percentage change
 */
const multiplierToPercentage = (multiplier: number): number => {
	return (multiplier - 1) * 100
}

/**
 * Stat bar component with animation and proper multiplier display
 */
const StatBar = ({
	stat,
	maxValue = 100,
}: {
	stat: StatInfo
	maxValue?: number
}) => {
	const percentageChange = multiplierToPercentage(stat.value)
	const barWidth = Math.min(Math.abs(percentageChange), maxValue)
	const isPositive = percentageChange > 0
	const gradientClass = isPositive
		? 'from-green-400 to-green-600'
		: 'from-red-400 to-red-600'

	return (
		<motion.div
			className="group relative flex items-center space-x-2 py-1"
			initial={{ opacity: 0, y: 5 }}
			animate={{ opacity: 1, y: 0 }}
			whileHover={{ scale: 1.02 }}
		>
			<div
				className={`rounded p-1.5 ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}
			>
				{stat.icon}
			</div>
			<span className="w-24 text-sm font-medium text-slate-700">
				{stat.label}
			</span>
			<div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
				<motion.div
					className={`absolute top-0 ${isPositive ? 'left-0' : 'right-0'} h-full rounded-full bg-gradient-to-r ${gradientClass}`}
					initial={{ width: 0 }}
					animate={{ width: `${barWidth}%` }}
					transition={{ duration: 0.5, ease: 'easeOut' }}
				/>
			</div>
			<span className="w-20 text-right text-sm font-semibold">
				{isPositive ? '+' : ''}
				{percentageChange.toFixed(1)}%
			</span>

			{/* Tooltip */}
			<div className="pointer-events-none absolute -top-8 left-0 w-full opacity-0 transition-opacity group-hover:opacity-100">
				<div className="rounded bg-slate-900 p-2 text-center text-xs text-white">
					{stat.description}
				</div>
			</div>
		</motion.div>
	)
}

/**
 * Stat configurations with descriptions
 */
const STAT_CONFIGS: Omit<StatInfo, 'value'>[] = [
	{
		icon: <Sword className="h-4 w-4" />,
		label: 'Damage Dealt',
		key: 'dmg_dealt',
		description: 'Multiplier for all damage dealt by the champion',
	},
	{
		icon: <Shield className="h-4 w-4" />,
		label: 'Damage Taken',
		key: 'dmg_taken',
		description: 'Multiplier for all damage received by the champion',
	},
	{
		icon: <Heart className="h-4 w-4" />,
		label: 'Healing',
		key: 'healing',
		description: 'Multiplier for all healing effects',
	},
	{
		icon: <ShieldPlus className="h-4 w-4" />,
		label: 'Shielding',
		key: 'shielding',
		description: 'Multiplier for all shield strength',
	},
	{
		icon: <Zap className="h-4 w-4" />,
		label: 'Ability Haste',
		key: 'ability_haste',
		description: 'Additional ability haste in ARAM',
	},
	{
		icon: <ArrowUpNarrowWide className="h-4 w-4" />,
		label: 'Attack Speed',
		key: 'attack_speed',
		description: 'Attack speed multiplier',
	},
	{
		icon: <Droplet className="h-4 w-4" />,
		label: 'Energy Regen',
		key: 'energy_regen',
		description: 'Energy regeneration rate multiplier',
	},
]

/**
 * Individual champion card component
 */
const ChampionCard = ({ champion }: { champion: Champion }) => {
	const stats = STAT_CONFIGS.map(stat => ({
		...stat,
		value: champion.aram[stat.key],
	})).filter(stat => stat.value !== 1) // Only show modified stats

	if (stats.length === 0) return null

	const hasBuffs = stats.some(stat => multiplierToPercentage(stat.value) > 0)
	const hasNerfs = stats.some(stat => multiplierToPercentage(stat.value) < 0)

	return (
		<motion.div
			className="h-full"
			whileHover={{ y: -4 }}
			transition={{ duration: 0.2 }}
		>
			<Card className="h-full overflow-hidden bg-white">
				<div className="relative">
					<img
						src="/api/placeholder/350/200"
						alt={champion.name}
						className="h-48 w-full object-cover"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
					<div className="absolute bottom-0 left-0 p-4">
						<h3 className="text-xl font-bold text-white">{champion.name}</h3>
						<div className="mt-1 flex gap-2">
							{hasBuffs && (
								<Badge
									variant="secondary"
									className="bg-green-500/20 text-white"
								>
									Buffed
								</Badge>
							)}
							{hasNerfs && (
								<Badge variant="secondary" className="bg-red-500/20 text-white">
									Nerfed
								</Badge>
							)}
						</div>
					</div>
				</div>
				<div className="space-y-1 p-4">
					{stats.map((stat, index) => (
						<StatBar key={index} stat={stat} />
					))}
				</div>
			</Card>
		</motion.div>
	)
}

const sortOptions = [
	{ value: 'name', label: 'Champion Name' },
	{ value: 'buffs', label: 'Strongest Buffs' },
	{ value: 'nerfs', label: 'Largest Nerfs' },
	{ value: 'changes', label: 'Most Modified' },
]

interface AramGridProps {
	championsData: ChampionData
}

export default function AramGrid({ championsData }: AramGridProps) {
	const [searchTerm, setSearchTerm] = useState('')
	const [sortBy, setSortBy] = useState('name')

	const champions = Object.entries(championsData).map(([id, data]) => ({
		id,
		...data,
	}))

	const filteredAndSortedChampions = useMemo(() => {
		return champions
			.filter(champion => {
				const hasModifications = Object.values(champion.aram).some(
					value => value !== 1
				)
				const matchesSearch = champion.name
					.toLowerCase()
					.includes(searchTerm.toLowerCase())
				return hasModifications && matchesSearch
			})
			.sort((a, b) => {
				switch (sortBy) {
					case 'name':
						return a.name.localeCompare(b.name)
					case 'buffs':
						return (
							Math.max(
								...Object.values(b.aram).map(v => multiplierToPercentage(v))
							) -
							Math.max(
								...Object.values(a.aram).map(v => multiplierToPercentage(v))
							)
						)
					case 'nerfs':
						return (
							Math.min(
								...Object.values(a.aram).map(v => multiplierToPercentage(v))
							) -
							Math.min(
								...Object.values(b.aram).map(v => multiplierToPercentage(v))
							)
						)
					case 'changes':
						return (
							Object.values(b.aram).reduce(
								(sum, val) => sum + Math.abs(multiplierToPercentage(val)),
								0
							) -
							Object.values(a.aram).reduce(
								(sum, val) => sum + Math.abs(multiplierToPercentage(val)),
								0
							)
						)
					default:
						return 0
				}
			})
	}, [champions, searchTerm, sortBy])

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
			<div className="container mx-auto px-4 py-8">
				{/* Header and search section */}
				<div className="sticky top-4 z-10 mb-8 flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<h1 className="text-4xl font-bold text-slate-900">
							League of Legends ARAM Balance Changes
						</h1>
						<p className="text-slate-600">
							Displaying all champion balance modifications for ARAM mode
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
							<Input
								type="text"
								placeholder="Search champions..."
								className="w-full bg-white/90 pl-10 pr-4 backdrop-blur-sm"
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
							/>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="flex items-center gap-2">
									<SortAsc className="h-4 w-4" />
									Sort:{' '}
									{sortOptions.find(option => option.value === sortBy)?.label}
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{sortOptions.map(option => (
									<DropdownMenuItem
										key={option.value}
										onClick={() => setSortBy(option.value)}
										className={cn(
											'cursor-pointer',
											sortBy === option.value && 'bg-accent font-medium'
										)}
									>
										{option.label}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* Champions grid with animations */}
				<AnimatePresence>
					<motion.div
						className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						{filteredAndSortedChampions.map(champion => (
							<motion.div
								key={champion.id}
								layout
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ duration: 0.3 }}
							>
								<ChampionCard champion={champion} />
							</motion.div>
						))}
					</motion.div>
				</AnimatePresence>

				{/* No results message */}
				{filteredAndSortedChampions.length === 0 && (
					<div className="py-12 text-center text-slate-600">
						No champions found matching your search criteria
					</div>
				)}
			</div>
		</div>
	)
}
