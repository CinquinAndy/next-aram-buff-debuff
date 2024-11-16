'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
	Sword,
	Shield,
	Heart,
	ShieldPlus,
	Zap,
	ArrowUpNarrowWide,
	Droplet,
	Search,
	SortAsc,
	ChevronDown,
	ArrowRight,
	Sparkles,
	ArrowUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Champion } from '@/app/lib/types'

interface StatDisplayProps {
	icon: React.ElementType
	label: string
	value: number
	isPositive: boolean
}

/**
 * Utility function to determine if a stat change is positive
 * Special case for damage taken where reduction is considered positive
 */
const isStatPositive = (statKey: string, value: number): boolean => {
	if (statKey === 'dmg_taken') {
		return value < 1 // Damage reduction is positive
	}
	return value > 1
}

/**
 * Format stat value based on its type
 * Ability haste uses absolute values while other stats use percentages
 */
const formatStatValue = (statKey: string, value: number): string => {
	// Special case: ability haste uses flat values
	if (statKey === 'ability_haste') {
		const absoluteValue = Math.round((value - 1) * 100)
		return `${absoluteValue > 0 ? '+' : ''}${absoluteValue}`
	}

	// Other stats: calculate percentage
	const percentage = ((value - 1) * 100).toFixed(1)
	return `${percentage > 0 ? '+' : ''}${percentage}%`
}

interface StatDisplayProps {
	icon: React.ElementType
	label: string
	value: number
	statKey: string // Identifies the type of stat for special handling
}

const StatDisplay = ({
	icon: Icon,
	label,
	value,
	statKey,
}: StatDisplayProps) => {
	const isPositive = isStatPositive(statKey, value)
	const displayValue = formatStatValue(statKey, value)
	const barWidth = Math.min(Math.abs((value - 1) * 100), 100)

	return (
		<motion.div
			whileHover={{ scale: 1.02 }}
			className={cn(
				'group relative overflow-hidden rounded-xl border border-slate-200/50 bg-gradient-to-r p-3',
				isPositive
					? 'from-emerald-50 to-white hover:from-emerald-100/50'
					: 'from-rose-50 to-white hover:from-rose-100/50'
			)}
		>
			{/* Main content container with icon and stats */}
			<div className="relative z-10 flex items-center gap-4">
				<div
					className={cn(
						'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
						isPositive
							? 'bg-emerald-500/10 text-emerald-600'
							: 'bg-rose-500/10 text-rose-600'
					)}
				>
					<Icon className="h-4 w-4" />
				</div>

				<div className="flex-1 space-y-2">
					{/* Stat label and value */}
					<div className="flex items-center justify-between">
						<span className="font-medium text-slate-700">{label}</span>
						<span
							className={cn(
								'flex items-center gap-1 font-semibold',
								isPositive ? 'text-emerald-600' : 'text-rose-600'
							)}
						>
							{/* Only show arrow for percentage-based stats */}
							{statKey !== 'ability_haste' && (
								<ArrowUp
									className={cn(
										'h-4 w-4 transform transition-transform',
										isPositive ? 'rotate-0' : 'rotate-180'
									)}
								/>
							)}
							{displayValue}
						</span>
					</div>

					{/* Progress bar for percentage-based stats */}
					{statKey !== 'ability_haste' && (
						<div className="h-2 overflow-hidden rounded-full bg-slate-100">
							<motion.div
								initial={{ width: 0 }}
								animate={{ width: `${barWidth}%` }}
								className={cn(
									'h-full rounded-full',
									isPositive
										? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
										: 'bg-gradient-to-r from-rose-400 to-rose-500'
								)}
								transition={{ duration: 0.5, ease: 'easeOut' }}
							/>
						</div>
					)}
				</div>
			</div>

			{/* Background particle effects */}
			<div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
				{[...Array(3)].map((_, i) => (
					<motion.div
						key={i}
						className={cn(
							'absolute h-20 w-20 rounded-full blur-3xl',
							isPositive ? 'bg-emerald-200/20' : 'bg-rose-200/20'
						)}
						style={{
							left: `${Math.random() * 100}%`,
							top: `${Math.random() * 100}%`,
						}}
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.3, 0.6, 0.3],
						}}
						transition={{
							duration: 2,
							repeat: Infinity,
							delay: i * 0.4,
						}}
					/>
				))}
			</div>
		</motion.div>
	)
}

const ChampionCard: React.FC<{ champion: Champion }> = ({ champion }) => {
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
			{/* Image et header */}
			<div className="relative h-48">
				<img
					src="/api/placeholder/400/300"
					alt={champion.name}
					className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>

				{/* Overlay gradient */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-[2px]" />

				{/* Info champion */}
				<div className="absolute bottom-0 left-0 right-0 p-4">
					<h3 className="text-2xl font-bold text-white">{champion.name}</h3>

					<div className="mt-2 flex gap-2">
						{Object.values(champion.aram).some(v => v > 1) && (
							<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100 backdrop-blur-sm">
								<Sparkles className="h-3 w-3" /> Buffed
							</span>
						)}
						{Object.values(champion.aram).some(v => v < 1) && (
							<span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-100 backdrop-blur-sm">
								Nerfed
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Stats */}
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

const Header = ({
	searchTerm,
	onSearch,
	sortBy,
	onSort,
}: {
	searchTerm: string
	onSearch: (term: string) => void
	sortBy: string
	onSort: (sort: string) => void
}) => {
	return (
		<div className="sticky top-0 z-50 backdrop-blur-xl">
			<div className="bg-gradient-to-b from-white/80 to-white/40 pb-6 pt-8">
				<div className="mx-auto max-w-7xl px-4">
					<div className="mb-8 flex items-baseline justify-between">
						<div>
							<h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-4xl font-bold text-transparent">
								ARAM Balance Changes
							</h1>
							<p className="mt-2 text-slate-600">
								Current balance modifications for ARAM mode
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<Input
								type="text"
								placeholder="Search champions..."
								value={searchTerm}
								onChange={e => onSearch(e.target.value)}
								className="w-full pl-10 pr-4"
							/>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between sm:w-[200px]"
								>
									<span className="flex items-center gap-2">
										<SortAsc className="h-4 w-4" />
										{sortBy}
									</span>
									<ChevronDown className="h-4 w-4 opacity-50" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-[200px]">
								<DropdownMenuItem onClick={() => onSort('name')}>
									Champion Name
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => onSort('buffs')}>
									Strongest Buffs
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => onSort('nerfs')}>
									Largest Nerfs
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function AramGrid({
	championsData,
}: {
	championsData: Record<string, Champion>
}) {
	const [searchTerm, setSearchTerm] = useState('')
	const [sortBy, setSortBy] = useState('Champion Name')

	const filteredAndSortedChampions = useMemo(() => {
		return Object.entries(championsData)
			.map(([id, data]) => ({ ...data, id }))
			.filter(champion => {
				const hasModifications = Object.values(champion.aram).some(v => v !== 1)
				const matchesSearch = champion.name
					.toLowerCase()
					.includes(searchTerm.toLowerCase())
				return hasModifications && matchesSearch
			})
			.sort((a, b) => {
				switch (sortBy) {
					case 'Champion Name':
						return a.name.localeCompare(b.name)
					case 'Strongest Buffs':
						return (
							Math.max(...Object.values(b.aram)) -
							Math.max(...Object.values(a.aram))
						)
					case 'Largest Nerfs':
						return (
							Math.min(...Object.values(a.aram)) -
							Math.min(...Object.values(b.aram))
						)
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
					<motion.div
						className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						{filteredAndSortedChampions.map(champion => (
							<ChampionCard key={champion.id} champion={champion} />
						))}
					</motion.div>

					{filteredAndSortedChampions.length === 0 && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center"
						>
							<Search className="mb-4 h-8 w-8 text-slate-400" />
							<h3 className="text-lg font-medium text-slate-700">
								No champions found
							</h3>
							<p className="mt-1 text-slate-500">
								Try adjusting your search criteria
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</main>
		</div>
	)
}
