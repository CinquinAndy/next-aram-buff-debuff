/**
 * Configuration for handling CORS proxies
 * @module config/proxy
 */

export const PROXY_CONFIG = {
	/**
	 * List of CORS proxy services to try in order
	 */
	PROXY_URLS: [
		'https://corsproxy.io/?',
		'https://api.allorigins.win/raw?url=',
		'https://proxy.cors.sh/',
	] as const,

	/**
	 * Target URL for the LoL Wiki data
	 */
	WIKI_URL:
		'https://leagueoflegends.fandom.com/wiki/Module:ChampionData/data?action=edit',

	/**
	 * HTTP headers to use for wiki requests
	 */
	REQUEST_HEADERS: {
		Accept: 'text/html',
		'User-Agent': 'ARAM-Stats/1.0',
	},

	/**
	 * Cache configuration
	 */
	CACHE: {
		DEFAULT_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
		KEY: 'wiki_champion_data',
	},
} as const
