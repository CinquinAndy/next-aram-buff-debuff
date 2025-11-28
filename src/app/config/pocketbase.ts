/**
 * Configuration for PocketBase connection
 * @module config/pocketbase
 */

export const POCKETBASE_CONFIG = {
	/**
	 * Base URL for PocketBase instance
	 */
	BASE_URL: process.env.POCKETBASE_URL || 'https://lol.andy-cinquin.fr',

	/**
	 * Admin authentication token
	 */
	TOKEN: process.env.POCKETBASE_TOKEN || process.env.PB_TOKEN || '',

	/**
	 * Collection name for ARAM data storage
	 */
	COLLECTION: 'data',

	/**
	 * Record ID for the current ARAM data (must be exactly 15 characters)
	 */
	RECORD_ID: 'latestaramdata1',

	/**
	 * API endpoints
	 */
	ENDPOINTS: {
		RECORDS: '/api/collections/data/records',
		HEALTH: '/api/health',
	},
} as const
