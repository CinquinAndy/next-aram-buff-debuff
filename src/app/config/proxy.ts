/**
 * Configuration for handling CORS proxies
 * @module config/proxy
 */

export const PROXY_CONFIG = {
	/**
	 * List of CORS proxy services to try in order
	 */
	PROXY_URLS: [''] as const,

	/**
	 * Target URL for the LoL Wiki data
	 */
	WIKI_URL:
		'https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data?action=edit',

	/**
	 * HTTP headers to use for wiki requests
	 * These headers match a working browser request to bypass Cloudflare
	 */
	REQUEST_HEADERS: {
		accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'accept-language': 'en-US,en;q=0.5',
		'accept-encoding': 'gzip, deflate, br, zstd',
		referer: 'https://wiki.leagueoflegends.com/en-us/Ultra_Rapid_Fire',
		'alt-used': 'wiki.leagueoflegends.com',
		connection: 'keep-alive',
		'upgrade-insecure-requests': '1',
		'sec-fetch-dest': 'document',
		'sec-fetch-mode': 'navigate',
		'sec-fetch-site': 'same-origin',
		priority: 'u=0, i',
		pragma: 'no-cache',
		'cache-control': 'no-cache',
		'user-agent':
			'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
	},
	/**
	 * Cache configuration
	 */
	CACHE: {
		DEFAULT_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
		KEY: 'wiki_champion_data',
	},
} as const
