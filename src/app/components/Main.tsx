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

export function AramGrid({ aramData }: AramGridProps) {
	// Convert aramData to array and sort by champion name
	const sortedChampions = Object.entries(aramData)
		.map(([id, champion]) => ({
			id,
			...champion,
		}))
		.sort((a, b) => a.name.localeCompare(b.name))

	return (
		<>
			{process.env.NODE_ENV === 'development' && (
				<DebugInfo aramData={aramData} />
			)}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{sortedChampions.map(champion => (
					<ChampionCard key={champion.id} champion={champion} />
				))}
			</div>
		</>
	)
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
