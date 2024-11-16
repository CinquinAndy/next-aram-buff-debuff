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
	return (
		<>
			{process.env.NODE_ENV === 'development' && (
				<DebugInfo aramData={aramData} />
			)}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Object.entries(aramData).map(([key, champion]) => (
					<ChampionCard key={key} champion={champion} />
				))}
			</div>
		</>
	)
}

interface DebugInfoProps {
	aramData: ChampionData
}

export function DebugInfo({ aramData }: DebugInfoProps) {
	return (
		<div className="mb-4 rounded-lg bg-gray-100 p-4 text-sm">
			<h2 className="mb-2 font-bold">Debug Info</h2>
			<p>Champions loaded: {Object.keys(aramData).length}</p>
			<pre className="mt-2 overflow-x-auto text-xs">
				{JSON.stringify(aramData, null, 2)}
			</pre>
		</div>
	)
}
