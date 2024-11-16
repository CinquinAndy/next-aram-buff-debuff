import { Suspense } from 'react'
import { fetchAramData } from '@/app/lib/actions'
import AramGrid from '@/app/components/AramStats'
import { Loading } from '@/app/components/Main'

async function ChampionDataFetcher() {
	try {
		const aramData = await fetchAramData()

		if (!aramData || Object.keys(aramData).length === 0) {
			return (
				<div className="p-4 text-red-600">
					No champion data available. Please try again later.
				</div>
			)
		}

		return <AramGrid championsData={aramData} />
	} catch (error) {
		return (
			<div className="p-4 text-red-600">
				Error: {error instanceof Error ? error.message : 'Something went wrong'}
			</div>
		)
	}
}

export default async function Page() {
	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-7xl">
				<h1 className="mb-8 text-3xl font-bold">
					League of Legends ARAM Changes
				</h1>
				<Suspense fallback={<Loading />}>
					<ChampionDataFetcher />
				</Suspense>
			</div>
		</div>
	)
}
