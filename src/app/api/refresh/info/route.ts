/**
 * API route to get information about the current data age
 * Used by RefreshPopup to determine if data needs refreshing
 * @module api/refresh/info
 */

import { NextResponse } from 'next/server'
import { PocketBaseService } from '@/app/services/PocketBaseService'

export async function GET() {
	try {
		console.info('API: Data info endpoint called')

		const pbService = PocketBaseService.getInstance()
		const data = await pbService.getData()

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

		return NextResponse.json({
			age, // in milliseconds
			patchVersion: data.patchVersion,
			lastUpdate: new Date(data.timestamp),
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
