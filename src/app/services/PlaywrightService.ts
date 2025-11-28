/**
 * Service for fetching wiki data using Playwright (headless browser)
 * Bypasses Cloudflare protection by simulating a real browser
 * @module services/PlaywrightService
 */

import { chromium, type Browser } from 'playwright'

export class PlaywrightService {
	private static browser: Browser | null = null

	/**
	 * Fetch HTML content using Playwright
	 * This bypasses Cloudflare challenges by using a real browser
	 */
	static async fetchHtml(url: string): Promise<string> {
		let browser: Browser | null = null
		let ownBrowser = false

		try {
			console.info('PlaywrightService: Launching browser')

			// Use existing browser or create new one
			if (!this.browser) {
				browser = await chromium.launch({
					headless: true,
					args: [
						'--no-sandbox',
						'--disable-setuid-sandbox',
						'--disable-dev-shm-usage',
					],
				})
				ownBrowser = true
			} else {
				browser = this.browser
			}

			const context = await browser.newContext({
				userAgent:
					'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
				viewport: { width: 1920, height: 1080 },
				locale: 'en-US',
			})

			console.info('PlaywrightService: Opening page')
			const page = await context.newPage()

			// Navigate to the URL
			console.info(`PlaywrightService: Navigating to ${url}`)
			await page.goto(url, {
				waitUntil: 'domcontentloaded',
				timeout: 45000,
			})

			// Wait a bit for any dynamic content to load
			console.info('PlaywrightService: Waiting for page to settle')
			await page.waitForTimeout(3000)

			// Wait for textarea to be present (not necessarily visible)
			await page.waitForSelector('textarea#wpTextbox1', {
				state: 'attached',
				timeout: 10000,
			})

			// Get the page content
			const content = await page.content()

			console.info(
				`PlaywrightService: Successfully fetched ${content.length} bytes`
			)

			// Close the context
			await context.close()

			// Close browser if we created it
			if (ownBrowser && browser) {
				await browser.close()
			}

			return content
		} catch (error) {
			console.error('PlaywrightService: Error fetching page:', error)

			// Close browser on error if we created it
			if (ownBrowser && browser) {
				await browser.close().catch(console.error)
			}

			throw error
		}
	}

	/**
	 * Initialize and keep a persistent browser instance
	 * Useful for multiple requests to avoid startup overhead
	 */
	static async initBrowser(): Promise<void> {
		if (this.browser) {
			console.info('PlaywrightService: Browser already initialized')
			return
		}

		try {
			console.info('PlaywrightService: Initializing persistent browser')
			this.browser = await chromium.launch({
				headless: true,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
				],
			})
			console.info('PlaywrightService: Browser initialized')
		} catch (error) {
			console.error('PlaywrightService: Failed to initialize browser:', error)
			throw error
		}
	}

	/**
	 * Close the persistent browser instance
	 */
	static async closeBrowser(): Promise<void> {
		if (this.browser) {
			console.info('PlaywrightService: Closing browser')
			await this.browser.close()
			this.browser = null
		}
	}

	/**
	 * Health check - verify Playwright is working
	 */
	static async healthCheck(): Promise<boolean> {
		try {
			const browser = await chromium.launch({ headless: true })
			await browser.close()
			return true
		} catch (error) {
			console.error('PlaywrightService: Health check failed:', error)
			return false
		}
	}
}
