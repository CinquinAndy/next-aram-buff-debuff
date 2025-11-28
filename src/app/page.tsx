import { Suspense } from 'react'
import { fetchAramData, getPatchInfos } from '@/app/lib/actions'
import AramGrid from '@/app/components/AramStats'

// Force dynamic rendering to get fresh data
export const dynamic = 'force-dynamic'

async function ChampionDataFetcher() {
	try {
		const aramData = await fetchAramData()
		const patchInfos = await getPatchInfos()

		console.info('Data fetched from cache', {
			patchVersion: patchInfos.patchVersion,
			championsCount: Object.keys(aramData).length,
		})

		if (!aramData || Object.keys(aramData).length === 0) {
			return (
				<div className="p-8 max-w-2xl mx-auto">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
						<h2 className="text-xl font-bold text-yellow-800 mb-3">
							⚠️ No Data Available
						</h2>
						<p className="text-yellow-700 mb-4">
							The PocketBase cache is empty. Please populate it by calling the
							refresh endpoint:
						</p>
						<code className="block bg-yellow-100 p-3 rounded text-sm">
							curl -X POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/refresh
						</code>
					</div>
				</div>
			)
		}

		return <AramGrid championsData={aramData} patchInfos={patchInfos} />
	} catch (error) {
		const isEmptyCache =
			error instanceof Error &&
			error.message.includes('No data available')

		if (isEmptyCache) {
			return (
				<div className="p-8 max-w-2xl mx-auto">
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
						<h2 className="text-xl font-bold text-blue-800 mb-3">
							📦 PocketBase Cache Empty
						</h2>
						<p className="text-blue-700 mb-4">
							No ARAM data found in PocketBase. Please populate the cache by
							calling:
						</p>
						<code className="block bg-blue-100 p-3 rounded text-sm mb-4">
							curl -X POST /api/refresh
						</code>
						<p className="text-blue-600 text-sm">
							This will scrape the League of Legends wiki and populate the
							database with the latest ARAM champion data.
						</p>
					</div>
				</div>
			)
		}

		return (
			<div className="p-8 max-w-2xl mx-auto">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6">
					<h2 className="text-xl font-bold text-red-800 mb-3">❌ Error</h2>
					<p className="text-red-700">
						{error instanceof Error ? error.message : 'Something went wrong'}
					</p>
				</div>
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
