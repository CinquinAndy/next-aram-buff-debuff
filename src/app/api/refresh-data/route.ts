/**
 * API route to manually refresh ARAM data from the wiki
 * This endpoint forces a fresh scrape and updates PocketBase
 * @module api/refresh-data
 */

import { NextResponse } from 'next/server'
import { WikiDataService } from '@/app/services/WikiDataService'

export async function POST(request: Request) {
	try {
		console.info('API: Refresh data endpoint called')

		// Optional: Add authentication/authorization here
		// For example, check for a secret token in headers
		const authHeader = request.headers.get('authorization')
		const refreshSecret = process.env.REFRESH_SECRET

		if (refreshSecret && authHeader !== `Bearer ${refreshSecret}`) {
			console.warn('API: Unauthorized refresh attempt')
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Force refresh the data
		const wikiService = WikiDataService.getInstance()
		const result = await wikiService.getData({ forceRefresh: true })

		console.info('API: Data refreshed successfully', {
			patchVersion: result.patchVersion,
			championsCount: Object.keys(result.data).length,
		})

		return NextResponse.json({
			success: true,
			message: 'Data refreshed successfully',
			data: {
				patchVersion: result.patchVersion,
				timestamp: result.timestamp,
				championsCount: Object.keys(result.data).length,
			},
		})
	} catch (error) {
		console.error('API: Error refreshing data:', error)

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		)
	}
}

export async function GET() {
	return NextResponse.json({
		message: 'Use POST method to refresh data',
		usage: {
			method: 'POST',
			headers: {
				authorization: 'Bearer YOUR_SECRET (optional)',
			},
		},
	})
}
