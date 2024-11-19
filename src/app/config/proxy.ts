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
	 */
	REQUEST_HEADERS: {
		accept:
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
		'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7',
		'cache-control': 'no-cache',
		pragma: 'no-cache',
		'sec-ch-ua':
			'"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
		'sec-fetch-dest': 'document',
		'sec-fetch-mode': 'navigate',
		'sec-fetch-site': 'cross-site',
		'sec-fetch-user': '?1',
		'upgrade-insecure-requests': '1',
		'user-agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	},
	/**
	 * Cache configuration
	 */
	CACHE: {
		DEFAULT_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
		KEY: 'wiki_champion_data',
	},
} as const
