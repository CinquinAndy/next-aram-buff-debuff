/**
 * Test script to verify wiki scraping functionality
 */

import { WikiDataService } from '../src/app/services/WikiDataService'

async function testScraping() {
	console.log('=== Testing Wiki Scraping ===\n')

	try {
		const wikiService = WikiDataService.getInstance()

		console.log('Forcing fresh data fetch from wiki...\n')

		const result = await wikiService.getData({
			forceRefresh: true,
			maxAge: 0,
		})

		console.log('\n=== Results ===')
		console.log(`Patch Version: ${result.patchVersion}`)
		console.log(`Champions Count: ${Object.keys(result.data).length}`)
		console.log(`Timestamp: ${new Date(result.timestamp).toISOString()}`)
		console.log(`From Cache: ${result.fromCache}`)

		// Show first 5 champions
		console.log('\n=== First 5 Champions ===')
		Object.entries(result.data)
			.slice(0, 5)
			.forEach(([id, champion]) => {
				console.log(`\n${champion.name} (ID: ${id}):`)
				const hasModifications = Object.values(champion.aram).some(
					value => value !== 1
				)
				if (hasModifications) {
					console.log('  ARAM modifications:')
					Object.entries(champion.aram).forEach(([stat, value]) => {
						if (value !== 1) {
							console.log(`    ${stat}: ${value}`)
						}
					})
				} else {
					console.log('  No ARAM modifications')
				}
			})

		console.log('\n✅ Scraping test successful!')
		process.exit(0)
	} catch (error) {
		console.error('\n❌ Scraping test failed:')
		console.error(error)
		process.exit(1)
	}
}

testScraping()
