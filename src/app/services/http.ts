/**
 * Utility service for making HTTP requests with proxies
 * @module services/HttpService
 */
import { PROXY_CONFIG } from '@/app/config/proxy'
import { PlaywrightService } from './PlaywrightService'

export class HttpService {
	private static cookieCache: string | null = null
	private static cookieExpiry: number = 0

	/**
	 * Fetches data through multiple proxy services with fallback to Playwright
	 */
	static async fetchWithProxy(targetUrl: string): Promise<string> {
		const encodedUrl = targetUrl
		let lastError: Error | null = null

		// Try direct request with cookie management first
		try {
			console.info('HttpService: Trying direct request with cookie management')

			// Get or refresh cookies
			const cookies = await this.getCookies()

			const headers = {
				...PROXY_CONFIG.REQUEST_HEADERS,
				...(cookies ? { cookie: cookies } : {}),
			}

			const response = await fetch(encodedUrl, {
				headers,
			})

			console.info(`HttpService: Response status ${response.status}`)

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const text = await response.text()
			console.info('HttpService: Successfully fetched data directly')
			return text
		} catch (error) {
			console.warn('HttpService: Direct request failed:', error)
			lastError = error as Error
		}

		// Fallback to proxy URLs if configured
		for (const proxyUrl of PROXY_CONFIG.PROXY_URLS) {
			if (!proxyUrl) continue

			try {
				console.info(`HttpService: Trying proxy ${proxyUrl}`)
				const response = await fetch(proxyUrl + encodedUrl, {
					headers: PROXY_CONFIG.REQUEST_HEADERS,
				})

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`)
				}

				const text = await response.text()
				console.info(
					`HttpService: Successfully fetched data through ${proxyUrl}`
				)
				return text
			} catch (error) {
				console.warn(`HttpService: Proxy ${proxyUrl} failed:`, error)
				lastError = error as Error
				continue
			}
		}

		// Final fallback: Use Playwright (headless browser)
		try {
			console.info('HttpService: Falling back to Playwright')
			const text = await PlaywrightService.fetchHtml(encodedUrl)
			console.info('HttpService: Successfully fetched data with Playwright')
			return text
		} catch (error) {
			console.error('HttpService: Playwright failed:', error)
			lastError = error as Error
		}

		throw lastError || new Error('All fetch attempts failed')
	}

	/**
	 * Gets cookies from environment variable or by making an initial request
	 * Caches cookies for 30 minutes
	 */
	private static async getCookies(): Promise<string | null> {
		// First, check for manually configured cookies in environment
		const envCookies = process.env.WIKI_COOKIES
		if (envCookies) {
			console.info('HttpService: Using cookies from environment')
			return envCookies
		}

		// Check if cached cookies are still valid
		if (this.cookieCache && Date.now() < this.cookieExpiry) {
			console.info('HttpService: Using cached cookies')
			return this.cookieCache
		}

		try {
			console.info('HttpService: Fetching fresh cookies')

			// Make initial request to get cookies
			const initialUrl = 'https://wiki.leagueoflegends.com/en-us/Ultra_Rapid_Fire'
			const response = await fetch(initialUrl, {
				headers: {
					'user-agent': PROXY_CONFIG.REQUEST_HEADERS['user-agent'],
					accept: PROXY_CONFIG.REQUEST_HEADERS.accept,
				},
			})

			// Extract cookies from Set-Cookie headers
			const setCookieHeaders = response.headers.get('set-cookie')
			if (setCookieHeaders) {
				// Parse cookies from Set-Cookie headers
				const cookies = this.parseCookies(setCookieHeaders)

				if (cookies) {
					// Cache for 30 minutes
					this.cookieCache = cookies
					this.cookieExpiry = Date.now() + 30 * 60 * 1000
					console.info('HttpService: Cached fresh cookies')
					return cookies
				}
			}

			console.warn('HttpService: No cookies received from initial request')
			return null
		} catch (error) {
			console.error('HttpService: Failed to fetch cookies:', error)
			return null
		}
	}

	/**
	 * Parse Set-Cookie headers into a cookie string
	 */
	private static parseCookies(setCookieHeader: string): string | null {
		try {
			// Split multiple Set-Cookie headers if present
			const cookies = setCookieHeader
				.split(',')
				.map(cookie => {
					// Extract just the name=value part before the first semicolon
					const match = cookie.match(/([^=]+)=([^;]+)/)
					return match ? `${match[1].trim()}=${match[2].trim()}` : null
				})
				.filter(Boolean)
				.join('; ')

			return cookies || null
		} catch (error) {
			console.error('HttpService: Error parsing cookies:', error)
			return null
		}
	}

	/**
	 * Clear cached cookies (useful for testing)
	 */
	static clearCookieCache(): void {
		this.cookieCache = null
		this.cookieExpiry = 0
		console.info('HttpService: Cookie cache cleared')
	}
}
