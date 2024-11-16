import { Card } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { ChampionCard } from '@/app/components/ChampionCard'
import { ChampionData } from '@/app/lib/types'

export function Loading() {
	return (
		<Card className="p-8">
			<div className="flex items-center justify-center">
				<Activity className="h-6 w-6 animate-spin" />
				<span className="ml-2">Loading ARAM changes...</span>
			</div>
		</Card>
	)
}

export function ErrorCard({ error }: { error: Error }) {
	return (
		<Card className="p-8">
			<div className="text-red-600">
				Error loading ARAM changes: {error.message}
			</div>
		</Card>
	)
}

interface AramGridProps {
	aramData: ChampionData
}

interface DebugInfoProps {
	aramData: ChampionData
}

export function DebugInfo({ aramData }: DebugInfoProps) {
	// Get sorted list of champions for debugging
	const sortedChampionNames = Object.values(aramData)
		.map(champ => champ.name)
		.sort((a, b) => a.localeCompare(b))

	return (
		<div className="mb-4 rounded-lg bg-gray-100 p-4 text-sm">
			<h2 className="mb-2 font-bold">Debug Info</h2>
			<p>Champions loaded: {sortedChampionNames.length}</p>
			<details className="mt-2">
				<summary>Champion List (Alphabetical)</summary>
				<div className="mt-2 grid grid-cols-3 gap-2 text-xs">
					{sortedChampionNames.map((name, index) => (
						<div key={index}>{name}</div>
					))}
				</div>
			</details>
		</div>
	)
}
