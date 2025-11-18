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
		accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'accept-encoding': 'gzip, deflate, br, zstd',
		'accept-language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
		'alt-used': 'wiki.leagueoflegends.com',
		connection: 'keep-alive',
		dnt: '1',
		host: 'wiki.leagueoflegends.com',
		priority: 'u=0, i',
		'sec-fetch-dest': 'document',
		'sec-fetch-mode': 'navigate',
		'sec-fetch-site': 'none',
		'sec-fetch-user': '?1',
		'sec-gpc': '1',
		'upgrade-insecure-requests': '1',
		'user-agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
	},
	/**
	 * Cache configuration
	 */
	CACHE: {
		DEFAULT_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
		KEY: 'wiki_champion_data',
	},
} as const
