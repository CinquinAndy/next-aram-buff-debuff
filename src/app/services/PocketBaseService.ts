/**
 * Service for interacting with PocketBase to store and retrieve ARAM data
 * @module services/PocketBaseService
 */

import { POCKETBASE_CONFIG } from '@/app/config/pocketbase'
import { ChampionData } from '@/app/lib/types'

interface PocketBaseRecord {
	id: string
	collectionId: string
	collectionName: string
	content: {
		data: ChampionData
		patchVersion?: string
		timestamp: number
	}
	created: string
	updated: string
}

interface PocketBaseListResponse {
	page: number
	perPage: number
	totalPages: number
	totalItems: number
	items: PocketBaseRecord[]
}

export interface WikiFetchResult {
	data: ChampionData
	fromCache: boolean
	timestamp: number
	patchVersion?: string
}

export class PocketBaseService {
	private static instance: PocketBaseService

	private constructor() {
		console.info('PocketBaseService: Initializing service')
		this.validateConfig()
	}

	public static getInstance(): PocketBaseService {
		if (!PocketBaseService.instance) {
			PocketBaseService.instance = new PocketBaseService()
		}
		return PocketBaseService.instance
	}

	/**
	 * Validate that required configuration is present
	 */
	private validateConfig(): void {
		if (!POCKETBASE_CONFIG.TOKEN) {
			console.warn(
				'PocketBaseService: No token found. Set POCKETBASE_TOKEN or PB_TOKEN in .env'
			)
		}
		if (!POCKETBASE_CONFIG.BASE_URL) {
			throw new Error('PocketBaseService: BASE_URL is required')
		}
	}

	/**
	 * Build the full URL for API requests
	 */
	private getUrl(endpoint: string): string {
		return `${POCKETBASE_CONFIG.BASE_URL}${endpoint}`
	}

	/**
	 * Get request headers with authentication
	 */
	private getHeaders(): HeadersInit {
		return {
			'Content-Type': 'application/json',
			Authorization: POCKETBASE_CONFIG.TOKEN,
		}
	}

	/**
	 * Retrieve the latest ARAM data from PocketBase
	 * @returns WikiFetchResult or null if not found
	 */
	public async getData(): Promise<WikiFetchResult | null> {
		try {
			console.info('PocketBaseService: Fetching data from PocketBase')

			const url = this.getUrl(
				`${POCKETBASE_CONFIG.ENDPOINTS.RECORDS}/${POCKETBASE_CONFIG.RECORD_ID}`
			)

			const response = await fetch(url, {
				method: 'GET',
				headers: this.getHeaders(),
				next: { revalidate: 3600 }, // Cache for 1 hour
			})

			if (!response.ok) {
				if (response.status === 404) {
					console.info('PocketBaseService: No data found (404)')
					return null
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const record: PocketBaseRecord = await response.json()

			console.info('PocketBaseService: Data retrieved successfully', {
				patchVersion: record.content.patchVersion,
				timestamp: record.content.timestamp,
				championsCount: Object.keys(record.content.data).length,
			})

			return {
				data: record.content.data,
				fromCache: true,
				timestamp: record.content.timestamp,
				patchVersion: record.content.patchVersion,
			}
		} catch (error) {
			console.error('PocketBaseService: Error fetching data:', error)
			return null
		}
	}

	/**
	 * Save or update ARAM data in PocketBase
	 * Uses upsert logic: tries to update first, creates if not found
	 * @param result The data to save
	 * @returns True if successful, false otherwise
	 */
	public async saveData(result: WikiFetchResult): Promise<boolean> {
		try {
			console.info('PocketBaseService: Saving data to PocketBase')

			const content = {
				data: result.data,
				patchVersion: result.patchVersion,
				timestamp: result.timestamp,
			}

			// Try to update first
			const updateUrl = this.getUrl(
				`${POCKETBASE_CONFIG.ENDPOINTS.RECORDS}/${POCKETBASE_CONFIG.RECORD_ID}`
			)

			const updateResponse = await fetch(updateUrl, {
				method: 'PATCH',
				headers: this.getHeaders(),
				body: JSON.stringify({ content }),
			})

			if (updateResponse.ok) {
				console.info('PocketBaseService: Data updated successfully')
				return true
			}

			// If update failed with 404, create new record
			if (updateResponse.status === 404) {
				console.info('PocketBaseService: Record not found, creating new one')

				const createUrl = this.getUrl(POCKETBASE_CONFIG.ENDPOINTS.RECORDS)

				const createResponse = await fetch(createUrl, {
					method: 'POST',
					headers: this.getHeaders(),
					body: JSON.stringify({
						id: POCKETBASE_CONFIG.RECORD_ID,
						content,
					}),
				})

				if (!createResponse.ok) {
					throw new Error(`Create failed: ${createResponse.statusText}`)
				}

				console.info('PocketBaseService: Data created successfully')
				return true
			}

			throw new Error(`Update failed: ${updateResponse.statusText}`)
		} catch (error) {
			console.error('PocketBaseService: Error saving data:', error)
			return false
		}
	}

	/**
	 * Check if PocketBase is accessible
	 * @returns True if healthy, false otherwise
	 */
	public async checkHealth(): Promise<boolean> {
		try {
			const url = this.getUrl(POCKETBASE_CONFIG.ENDPOINTS.HEALTH)

			const response = await fetch(url, {
				method: 'GET',
				headers: this.getHeaders(),
			})

			return response.ok
		} catch (error) {
			console.error('PocketBaseService: Health check failed:', error)
			return false
		}
	}

	/**
	 * List all records in the data collection
	 * Useful for debugging or management
	 * @returns List of all records
	 */
	public async listRecords(): Promise<PocketBaseRecord[]> {
		try {
			const url = this.getUrl(POCKETBASE_CONFIG.ENDPOINTS.RECORDS)

			const response = await fetch(url, {
				method: 'GET',
				headers: this.getHeaders(),
			})

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const data: PocketBaseListResponse = await response.json()
			return data.items
		} catch (error) {
			console.error('PocketBaseService: Error listing records:', error)
			return []
		}
	}
}
