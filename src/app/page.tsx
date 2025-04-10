import { Suspense } from 'react'
import { fetchAramData, getPatchInfos } from '@/app/lib/actions'
import AramGrid from '@/app/components/AramStats'

async function ChampionDataFetcher() {
	try {
		const aramData = await fetchAramData()

		const patchInfos = await getPatchInfos()

		console.info('API infos fetched', patchInfos, aramData)

		if (!aramData || Object.keys(aramData).length === 0) {
			return (
				<div className="p-4 text-red-600">
					No champion data available. Please try again later.
				</div>
			)
		}

		return <AramGrid championsData={aramData} patchInfos={patchInfos} />
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
		<Suspense>
			<ChampionDataFetcher />
		</Suspense>
	)
}
