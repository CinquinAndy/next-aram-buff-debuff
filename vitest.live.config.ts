import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Tests against the real network (wiki, Data Dragon, optionally the production site).
 * Not run on pull requests: see .github/workflows/donnees-wiki.yml.
 */
export default defineConfig({
	resolve: {
		alias: { '@': path.resolve(__dirname, 'src') },
	},
	test: {
		environment: 'node',
		include: ['tests/live/**/*.test.ts'],
		testTimeout: 60_000,
	},
})
