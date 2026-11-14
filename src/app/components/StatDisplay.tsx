'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { ArrowUp } from 'lucide-react'
import { StatDisplayProps } from '@/app/lib/types'
import { formatStatValue, isStatPositive } from '@/app/utils/aramUtils'

export const StatDisplay = ({
	icon: Icon,
	label,
	value,
	statKey,
	badge,
}: StatDisplayProps) => {
	const isPositive = isStatPositive(statKey, value)
	const displayValue = formatStatValue(statKey, value)

	return (
		<motion.div
			whileHover={{ scale: 1.02 }}
			className={cn(
				'group relative overflow-hidden rounded-xl border border-slate-200/10 bg-gradient-to-r p-3',
				isPositive ? 'from-emerald-50 to-white' : 'from-rose-50 to-white'
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
						<span className="flex items-center gap-2 font-medium text-slate-700">
							{label}
							{badge && (
								<span className="rounded bg-rose-600/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
									{badge}
								</span>
							)}
						</span>
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
				</div>
			</div>
		</motion.div>
	)
}
