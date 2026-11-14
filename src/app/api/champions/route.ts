/**
 * GET /api/champions: every champion with its ARAM and ARAM: Mayhem values, as JSON.
 * Read by the desktop client; public data (League of Legends Wiki, CC BY-SA 3.0), so open to any origin.
 * Reads the PocketBase cache only, like the page.
 * @module api/champions
 */

import { NextResponse } from 'next/server'
import { fetchPageData } from '@/app/lib/actions'
import { toPublicChampions } from '@/app/lib/publicApi'

export const dynamic = 'force-dynamic'

const HEADERS = {
	'access-control-allow-origin': '*',
	'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
}

export async function GET() {
	try {
		const page = await fetchPageData()
		return NextResponse.json(toPublicChampions(page), { headers: HEADERS })
	} catch (error) {
		console.error('API: champions failed', error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 503, headers: { 'access-control-allow-origin': '*' } }
		)
	}
}

export function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' },
	})
}
