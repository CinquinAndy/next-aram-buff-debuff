/**
 * Fetches the wiki module page, checks it with the app's own parser and validation,
 * and writes the Lua table to a folder (default: ./donnees-wiki):
 *   ChampionData.lua  – the module's Lua source, read by the app as its fallback source
 *   ARAM_Mayhem.html  – the overrides part of the ARAM: Mayhem page, the app's fallback for Mayhem
 *   meta.json         – when and from where it was fetched, revision, counts
 * Used by .github/workflows/donnees-wiki.yml, which publishes the folder on the `donnees-wiki` branch.
 * Exits with code 1 when the module page is refused or its data is invalid: nothing is written then.
 * A refused or invalid Mayhem page only skips ARAM_Mayhem.html (the published copy stays as it was).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { SOURCES_CONFIG } from '../src/app/config/sources'
import { validateChampionData } from '../src/app/lib/dataValidation'
import { findWikiConflicts, validateMayhemData } from '../src/app/lib/mayhem'
import { extractMayhemSection, parseMayhemPage } from '../src/app/lib/mayhemParser'
import { dataRevision } from '../src/app/lib/patchVersion'
import type { ChampionData } from '../src/app/lib/types'
import { extractLuaTable, parseChampionData } from '../src/app/lib/wikiParser'
import { HttpService } from '../src/app/services/http'

async function main() {
	const outDir = path.resolve(process.argv[2] ?? 'donnees-wiki')
	const source = SOURCES_CONFIG.DATA_SOURCES[0]

	const { text, lastModified } = await HttpService.fetchText(source.url)
	const table = extractLuaTable(text)
	if (!table) throw new Error('No Lua table in the page')

	const lua = `-- Copy of ${source.url}\n-- League of Legends Wiki, CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)\n-- <pre>\nreturn ${table}\n-- </pre>\n`
	const data = parseChampionData(lua)
	const validation = validateChampionData(data)
	if (!validation.ok) throw new Error(`Invalid data: ${validation.errors.join('; ')}`)

	mkdirSync(outDir, { recursive: true })
	writeFileSync(path.join(outDir, 'ChampionData.lua'), lua)
	const mayhem = await copyMayhemPage(outDir, data)
	const meta = {
		source: source.url,
		sourceUpdatedAt: lastModified ? new Date(lastModified).toISOString() : null,
		dataRevision: dataRevision(data),
		championsCount: validation.championsCount,
		aramChangedCount: validation.aramChangedCount,
		mayhem,
		license: 'CC BY-SA 3.0, League of Legends Wiki',
	}
	writeFileSync(path.join(outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
	console.log(JSON.stringify(meta))
}

/** Copy the Mayhem page when it parses and validates; returns what goes in meta.json */
async function copyMayhemPage(outDir: string, data: ChampionData) {
	const url = SOURCES_CONFIG.MAYHEM_SOURCES[0].url
	try {
		const { text, lastModified } = await HttpService.fetchText(url)
		const extract = `<!-- Extract of ${url}, League of Legends Wiki, CC BY-SA 3.0 -->\n${extractMayhemSection(text)}`
		const mayhem = parseMayhemPage(extract)
		const validation = validateMayhemData(mayhem, data)
		if (!validation.ok) throw new Error(validation.errors.join('; '))
		writeFileSync(path.join(outDir, 'ARAM_Mayhem.html'), extract)
		return {
			source: url,
			sourceUpdatedAt: lastModified ? new Date(lastModified).toISOString() : null,
			championsCount: mayhem.champions.length,
			wikiConflicts: findWikiConflicts(data, mayhem),
		}
	} catch (error) {
		console.error(`Mayhem page not copied: ${error instanceof Error ? error.message : error}`)
		return { source: url, error: error instanceof Error ? error.message : String(error) }
	}
}

main().catch(error => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
