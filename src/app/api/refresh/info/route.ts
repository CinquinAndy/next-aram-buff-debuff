/**
 * API route to get information about the current data age
 * Used by RefreshPopup to determine if data needs refreshing
 * @module api/refresh/info
 */

import { NextResponse } from 'next/server'
import { PocketBaseService } from '@/app/services/PocketBaseService'

// Force dynamic rendering to avoid caching
export const dynamic = 'force-dynamic'

export async function GET() {
	try {
		console.info('API: Data info endpoint called')

		const pbService = PocketBaseService.getInstance()
		const data = await pbService.getData(true) // Force fresh fetch

		if (!data) {
			return NextResponse.json(
				{
					success: false,
					error: 'No data available in PocketBase',
				},
				{ status: 404 }
			)
		}

		const age = Date.now() - data.timestamp
		const ageInHours = Math.floor(age / (1000 * 60 * 60))

		console.info('API: Data info retrieved', {
			age,
			ageInHours,
			patchVersion: data.patchVersion,
		})

		// Get a sample champion for debugging
		const championIds = Object.keys(data.data)
		const sampleChampion = championIds.length > 0 ? data.data[championIds[0]] : null

		return NextResponse.json({
			age, // in milliseconds
			patchVersion: data.patchVersion,
			lastUpdate: new Date(data.timestamp),
			championsCount: championIds.length,
			sample: sampleChampion,
		})
	} catch (error) {
		console.error('API: Error fetching data info:', error)

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		)
	}
}
