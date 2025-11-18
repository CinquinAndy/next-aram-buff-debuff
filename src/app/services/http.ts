/**
 * Utility service for making HTTP requests with proxies
 * @module services/HttpService
 */
import { PROXY_CONFIG } from '@/app/config/proxy'

export class HttpService {
	/**
	 * Fetches data through multiple proxy services with fallback
	 */
	static async fetchWithProxy(targetUrl: string): Promise<string> {
		// const encodedUrl = encodeURIComponent(targetUrl)
		const encodedUrl = targetUrl
		let lastError: Error | null = null

		// Try each proxy in sequence
		for (const proxyUrl of PROXY_CONFIG.PROXY_URLS) {
			try {
				console.info(`HttpService: Trying proxy ${proxyUrl}`)
				const response = await fetch(proxyUrl + encodedUrl, {
					headers: PROXY_CONFIG.REQUEST_HEADERS,
				})

				if (!response.ok) {
					console.info(response)
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

		throw lastError || new Error('All proxies failed')
	}
}
