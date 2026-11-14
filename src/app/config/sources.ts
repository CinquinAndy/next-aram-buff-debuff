/**
 * Where the champion data comes from, in order of preference
 * @module config/sources
 */

/** Descriptive User-Agent, as asked by Weird Gloop (the wiki host): app name and a way to reach us */
export const USER_AGENT =
	'AramBalancesChecker/2.0 (+https://aram-balances-checker.forhives.fr; +https://github.com/CinquinAndy/next-aram-buff-debuff)'

export interface DataSource {
	name: string
	url: string
}

export const SOURCES_CONFIG = {
	/**
	 * 1. The module page itself, read from the server.
	 *    The plain page is allowed by the wiki's robots.txt (`?action=raw` and api.php are not)
	 *    and is served from Cloudflare's cache; the Lua table is in a <pre>.
	 * 2. The copy published by the `donnees-wiki` GitHub workflow (fetched from GitHub's network,
	 *    validated with the same checks), used when the wiki refuses the server.
	 */
	DATA_SOURCES: [
		{ name: 'wiki', url: 'https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data' },
		{
			name: 'github-snapshot',
			url: 'https://raw.githubusercontent.com/CinquinAndy/next-aram-buff-debuff/donnees-wiki/ChampionData.lua',
		},
	] satisfies DataSource[],

	/**
	 * ARAM: Mayhem overrides, read from the plain page (allowed by robots.txt like the module),
	 * then from the copy the `donnees-wiki` workflow publishes. Mayhem keeps every ARAM override
	 * and adds its own per-champion layer, listed only on this page.
	 */
	MAYHEM_SOURCES: [
		{ name: 'wiki', url: 'https://wiki.leagueoflegends.com/en-us/ARAM:_Mayhem' },
		{
			name: 'github-snapshot',
			url: 'https://raw.githubusercontent.com/CinquinAndy/next-aram-buff-debuff/donnees-wiki/ARAM_Mayhem.html',
		},
	] satisfies DataSource[],

	MAYHEM_PAGE: 'https://wiki.leagueoflegends.com/en-us/ARAM:_Mayhem',

	/** Page credited in the footer (CC BY-SA 3.0) */
	WIKI_MODULE_PAGE: 'https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data',

	/** Current game patch: first entry of Data Dragon's versions list */
	DDRAGON_VERSIONS_URL: 'https://ddragon.leagueoflegends.com/api/versions.json',

	/** Give up on a source after this long */
	FETCH_TIMEOUT_MS: 20_000,

	CACHE: {
		DEFAULT_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
	},
} as const
