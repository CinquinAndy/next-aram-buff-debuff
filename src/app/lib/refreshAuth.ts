/**
 * Authorization of POST /api/refresh (wiki scrape + PocketBase write)
 * @module lib/refreshAuth
 */

import { createHash, timingSafeEqual } from 'node:crypto'

export type RefreshAuth = 'ok' | 'not-configured' | 'unauthorized'

/** Both sides are hashed first: equal lengths for timingSafeEqual, and the secret's length does not leak */
const digest = (value: string) => createHash('sha256').update(value).digest()

/**
 * Closed by default: without REFRESH_SECRET nobody may trigger a refresh.
 * Expects the header `authorization: Bearer <REFRESH_SECRET>`, compared in constant time.
 */
export function checkRefreshAuth(authHeader: string | null, secret: string | undefined): RefreshAuth {
	if (!secret) return 'not-configured'
	return timingSafeEqual(digest(authHeader ?? ''), digest(`Bearer ${secret}`)) ? 'ok' : 'unauthorized'
}
