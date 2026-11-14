# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js application that displays League of Legends ARAM (All Random All Mid) champion statistics, showing buff/debuff modifications for each champion. The app scrapes data from the League of Legends Wiki, caches it locally, and displays interactive champion cards with their ARAM-specific stat modifications.

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server with Turbopack
npm start            # Start production server

# Build
npm run build        # Build for production

# Code Quality
npm run lint         # Run Biome linter/formatter checks
npm run lint:fix     # Auto-fix linting issues
npm run check        # Same as lint:fix

# Precommit
npm run precommit    # Run lint-staged (configured via Husky)
```

## Code Style

This project uses **Biome** (not ESLint/Prettier). Configuration in `biome.json`:

- **Indentation**: Tabs (width: 2)
- **Line width**: 120 characters
- **Quotes**: Single quotes (JS), double quotes (JSX)
- **Semicolons**: As needed
- **Trailing commas**: ES5 style
- Key rules:
  - `noUnusedVariables`: error
  - `useConst`: error
  - `useExhaustiveDependencies`: off (intentionally disabled)
  - Import organization is automatic on save

## Architecture

### Data Flow

1. **Server Actions** (`src/app/lib/actions.ts`):
   - `fetchAramData()`: Fetches champion ARAM stats
   - `getPatchInfos()`: Retrieves patch version metadata
   - Both use `WikiDataService` singleton

2. **WikiDataService** (`src/app/services/WikiDataService.ts`):
   - Singleton service that refreshes the champion data and caches it in PocketBase
   - Default cache TTL: 24 hours (`SOURCES_CONFIG.CACHE.DEFAULT_MAX_AGE`)
   - Sources, in order (`src/app/config/sources.ts`): the plain wiki page `Module:ChampionData/data`
     (allowed by robots.txt; `?action=raw` and api.php are not), then the copy published on the
     `donnees-wiki` branch by `.github/workflows/donnees-wiki.yml`
   - Every source goes through `parseChampionData` (`src/app/lib/wikiParser.ts`) and `validateChampionData`
     (`src/app/lib/dataValidation.ts`); data that is empty, partial, or older than the stored data is never saved.
     When no source passes, the stored data is kept and returned with `fromCache: true`
   - Stale-while-revalidate: when the PocketBase data is older than the TTL, a page view starts a background
     refresh (`after()`), one at a time, retried at most once an hour after a failure
   - Patch shown = current game patch from Data Dragon `versions.json[0]` (16.21.1 → V26.21);
     data revision = the highest `["changes"]` value across champions (`src/app/lib/patchVersion.ts`)
   - Triggers `ImageService` to download champion splash arts
   - ARAM: Mayhem: after the module, reads the wiki page `ARAM:_Mayhem` (then the `ARAM_Mayhem.html` extract
     on the `donnees-wiki` branch) with `parseMayhemPage` (`src/app/lib/mayhemParser.ts`): per-champion
     "Special modifiers" ("Damage dealt changed to 0% from +5%"), ability changes, and "Global stat changes".
     Stored as `mayhem` next to `data`; when no Mayhem source passes `validateMayhemData`, the stored Mayhem
     data is kept and the ARAM data is still saved
   - Mayhem keeps every ARAM override and adds its own layer: `applyMayhem` (`src/app/lib/mayhem.ts`) gives each
     champion `mayhem.stats` = ARAM stats with the overrides on top, when the page is served
   - `findWikiConflicts` logs where the module and the Mayhem page's "from" values disagree on the ARAM value
     (about 15 stats in November 2026): one of the two wiki pages is out of date there

3. **PocketBaseService** (`src/app/services/PocketBaseService.ts`):
   - Singleton service for PocketBase interactions
   - Stores ARAM data at `https://lol.andy-cinquin.fr`
   - Collection: `data`, Record ID: `latestaramdata1` (must be exactly 15 chars)
   - Implements upsert logic (try update, create if not found)
   - Methods: `getData()`, `saveData()`, `checkHealth()`, `listRecords()`

4. **ImageService** (`src/app/services/ImageService.ts`):
   - Singleton service for managing champion images
   - Downloads splash art from Data Dragon CDN (`https://ddragon.leagueoflegends.com/cdn/img/champion/splash`)
   - Stores images in `public/images/champions/`
   - Special name mappings: GnarBig → Gnar, MonkeyKing ↔ Wukong

5. **HttpService** (`src/app/services/http.ts`):
   - One plain GET with a descriptive User-Agent (`USER_AGENT` in `src/app/config/sources.ts`)
   - No browser imitation, cookies or headless browser: on a refusal it logs status, server,
     cf-mitigated, cf-ray and the start of the body, then the next source is tried

### API Routes

- **POST /api/refresh**: Manually trigger data refresh from the sources
  - Optional authorization via `REFRESH_SECRET` env variable
  - Answers 502 (`success: false`) when every source failed and the stored data was kept
- **GET /api/refresh/info**: Age, patch, data revision and source of the stored data
- **GET /api/champions**: every champion with its ARAM and Mayhem values (`toPublicChampions`, `src/app/lib/publicApi.ts`),
  CORS open, read by the desktop client. Bump `PUBLIC_API_VERSION` on a breaking change: the client refuses unknown versions

### Tests

- `pnpm test`: unit tests of the parser and validation on saved copies of the module (`tests/fixtures`),
  and an integration test of the whole refresh chain with the network mocked
- `pnpm test:live`: real network (wiki, Data Dragon, and the production site when `PROD_URL` is set);
  fails when the data is empty or more than 2 patches behind. Run daily by `donnees-wiki.yml`
- CI (`.github/workflows/ci.yml`): frozen install, `pnpm typecheck`, `pnpm test`, `pnpm build`

### Desktop client (`desktop/`)

Tauri v2 app that reads the champion select of the local League client (LCU API, read-only) and shows the balance
of your champion, your team and the ARAM bench. See `desktop/README.md`.
- `desktop/lcu/`: Rust crate, client discovery (`LeagueClientUx` arguments, then `lockfile`) and JSON parsing; `cargo test`
- `desktop/src-tauri/`: polls every 1.5 s, emits `client-state`; `load_champions` fetches `/api/champions` with an offline copy
- `desktop/src/`: vanilla TypeScript + Vite; `pnpm dev` runs a demo mode in a browser (no League client needed)
- Excluded from the site's `tsconfig.json`; CI job `client-bureau` builds it on Ubuntu (WebKitGTK packages)
- Releases: tag `desktop-vX.Y.Z` → `.github/workflows/desktop-release.yml` (Windows, macOS), updater key in Vaultwarden
  `app/aram-desktop/tauri-updater-key` (+ `-password`), public key in `tauri.conf.json`

### Key Components

- **AramStats** (`src/app/components/AramStats.tsx`): Main client component with search, sort, and champion grid.
  Opens on the Mayhem tab (most played queue); Mayhem cards also show ability changes, ARAM changes Mayhem removes,
  and a "Mayhem" badge on stats Mayhem sets
- **ChampionCard** (`src/app/components/ChampionCard.tsx`): Individual champion display with splash art and stats
- **Header** (`src/app/components/Header.tsx`): Top navigation with search and sort controls

### Data Model

Core types in `src/app/lib/types.ts`:

- **AramStats**: Stat modifiers (dmg_dealt, dmg_taken, healing, shielding, ability_haste, attack_speed, energy_regen, tenacity).
  The wiki's `total_as` and `energyregen_mod` keys map to attack_speed and energy_regen. 1 means "unmodified" for every stat
- **Champion**: Contains id, name, aram stats, and optional splashArt path
- **STAT_WEIGHTS**: Used for power level calculations (dmg_dealt/dmg_taken: 1.2, healing/shielding: 1.0, ability_haste/attack_speed: 0.8, energy_regen: 0.6)

### Utility Functions

`src/app/utils/aramUtils.ts` provides:

- `analyzeChampionStats()`: Counts buffs/nerfs for a champion
- `formatStatValue()`: Formats stat display (percentage for most, absolute for ability_haste)
- `calculateModificationScore()`: Weighted scoring for sorting (accounts for dmg_taken inversions)
- `isStatPositive()`: Determines if a stat change is beneficial (dmg_taken < 1 is positive)

## Special Considerations

### Stat Interpretation

- **dmg_taken**: Inverted logic - values < 1 mean taking less damage (buff), values > 1 mean taking more damage (nerf)
- **ability_haste**: Uses absolute values, not percentages (e.g., value of 20 means +20 ability haste).
  1 is still the "unmodified" value (legacy convention); the Mayhem parser stores "changed to 0" as 1
- All other stats use percentage modifications (e.g., 1.1 = +10%, 0.9 = -10%)

### Name Normalization

Champion name handling has special cases:
- Alternate forms with a fractional wiki id (GnarBig 150.2, Kled & Skaarl 240.1) are skipped by the parser
- GnarBig → Gnar (wiki uses GnarBig, API uses Gnar)
- MonkeyKing ↔ Wukong (wiki uses MonkeyKing, display uses Wukong)
- Special characters are stripped when saving images

### Caching Strategy

- Wiki data stored in PocketBase (`https://lol.andy-cinquin.fr`) with 24-hour default TTL
- Champion images cached locally in `public/images/champions/`
- Stale PocketBase data is returned if fresh fetch fails (graceful degradation)
- Environment variables:
  - `POCKETBASE_URL`: PocketBase instance URL
  - `POCKETBASE_TOKEN`: Admin authentication token
  - `REFRESH_SECRET`: Optional secret for refresh API authorization

## Path Aliases

TypeScript configured with `@/*` → `./src/*` path mapping.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **React**: v19 (latest)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives + shadcn/ui
- **Animations**: Framer Motion
- **TypeScript**: Strict mode enabled
- **Bundler**: Turbopack (configured in next.config.ts)
