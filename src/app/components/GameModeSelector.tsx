'use client'

import { motion } from 'framer-motion'
import { Gamepad2 } from 'lucide-react'

export type GameMode = 'aram' | 'urf' | 'usb' | 'ofa' | 'nb' | 'ar'

export interface GameModeInfo {
	id: GameMode
	name: string
	fullName: string
	color: string
	icon?: string
}

export const GAME_MODES: GameModeInfo[] = [
	{
		id: 'aram',
		name: 'ARAM',
		fullName: 'All Random All Mid',
		color: '#3b82f6',
		icon: '🌉',
	},
	{
		id: 'urf',
		name: 'URF',
		fullName: 'Ultra Rapid Fire',
		color: '#f59e0b',
		icon: '⚡',
	},
	{
		id: 'usb',
		name: 'USB',
		fullName: 'Ultimate Spellbook',
		color: '#8b5cf6',
		icon: '📖',
	},
	{
		id: 'ofa',
		name: 'OFA',
		fullName: 'One For All',
		color: '#10b981',
		icon: '👥',
	},
	{
		id: 'nb',
		name: 'NB',
		fullName: 'Nexus Blitz',
		color: '#ef4444',
		icon: '💥',
	},
	{
		id: 'ar',
		name: 'Arena',
		fullName: 'Arena 2v2v2v2',
		color: '#ec4899',
		icon: '🏟️',
	},
]

interface GameModeSelectorProps {
	selectedMode: GameMode
	onModeChange: (mode: GameMode) => void
	availableModes?: GameMode[]
}

export const GameModeSelector = ({
	selectedMode,
	onModeChange,
	availableModes,
}: GameModeSelectorProps) => {
	// Filter to only show modes that have data (or all if not specified)
	const modesToShow = availableModes
		? GAME_MODES.filter(mode => availableModes.includes(mode.id))
		: GAME_MODES

	const currentMode = GAME_MODES.find(m => m.id === selectedMode)

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

			{/* Mode buttons */}
			<div className="flex flex-wrap items-center gap-2">
				{modesToShow.map(mode => {
					const isSelected = selectedMode === mode.id
					const isAvailable = !availableModes || availableModes.includes(mode.id)

					return (
						<motion.button
							key={mode.id}
							onClick={() => onModeChange(mode.id)}
							disabled={!isAvailable}
							className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
								isSelected
									? 'text-white shadow-lg shadow-black/20'
									: isAvailable
										? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
										: 'cursor-not-allowed bg-white/5 text-white/30'
							}`}
							style={{
								backgroundColor: isSelected ? mode.color : undefined,
								borderColor: isSelected ? mode.color : 'transparent',
								borderWidth: '2px',
								borderStyle: 'solid',
							}}
							whileHover={isAvailable ? { scale: 1.03 } : {}}
							whileTap={isAvailable ? { scale: 0.97 } : {}}
							title={mode.fullName}
						>
							<span>{mode.name}</span>
						</motion.button>
					)
				})}
			</div>

			{/* Current mode description (mobile hidden, desktop visible) */}
			{currentMode && (
				<div className="hidden text-xs text-white/50 sm:block">
					{currentMode.fullName}
				</div>
			)}
		</div>
	)
}

