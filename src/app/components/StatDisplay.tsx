'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArrowUp } from 'lucide-react'
import { StatDisplayProps } from '@/app/lib/types'
import { formatStatValue, isStatPositive } from '@/app/utils/aramUtils'

export const StatDisplay = ({
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
