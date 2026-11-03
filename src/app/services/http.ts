/**
 * Plain HTTP fetch for the data sources: one request, an honest User-Agent, no browser imitation.
 * @module services/http
 */
import { SOURCES_CONFIG, USER_AGENT } from '@/app/config/sources'

export interface FetchedText {
	text: string
	/** Last-Modified header, when the server sends one */
	lastModified?: string
}

export class HttpError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message)
		this.name = 'HttpError'
	}
}

export class HttpService {
	/**
	 * GET a text resource. On a non-2xx answer, logs what tells an IP block from a refused
	 * request apart (status, server, cf-mitigated, cf-ray, start of the body) and throws.
	 */
	static async fetchText(url: string, accept = 'text/html,text/plain;q=0.9,*/*;q=0.8'): Promise<FetchedText> {
		const response = await fetch(url, {
			headers: { 'user-agent': USER_AGENT, accept },
			cache: 'no-store',
			signal: AbortSignal.timeout(SOURCES_CONFIG.FETCH_TIMEOUT_MS),
		})

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			console.warn('HttpService: request refused', {
				url,
				status: response.status,
				server: response.headers.get('server'),
				cfMitigated: response.headers.get('cf-mitigated'),
				cfRay: response.headers.get('cf-ray'),
				body: body.slice(0, 200),
			})
			throw new HttpError(`HTTP ${response.status} for ${url}`, response.status)
		}

		return {
			text: await response.text(),
			lastModified: response.headers.get('last-modified') ?? undefined,
		}
	}
}
