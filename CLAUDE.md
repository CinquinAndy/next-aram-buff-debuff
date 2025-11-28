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
   - Singleton service that scrapes League Wiki Lua data
   - Uses PocketBase for data persistence (replaces file-based cache)
   - Default cache TTL: 12 hours
   - Parses Lua tables from wiki HTML to extract ARAM stat modifications
   - Triggers `ImageService` to download champion splash arts

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
   - Handles HTTP requests with custom headers for wiki scraping
   - Configuration in `src/app/config/proxy.ts`

### API Routes

- **POST /api/refresh-data**: Manually trigger data refresh from wiki
  - Optional authorization via `REFRESH_SECRET` env variable
  - Forces fresh scrape and updates PocketBase

### Key Components

- **AramStats** (`src/app/components/AramStats.tsx`): Main client component with search, sort, and champion grid
- **ChampionCard** (`src/app/components/ChampionCard.tsx`): Individual champion display with splash art and stats
- **Header** (`src/app/components/Header.tsx`): Top navigation with search and sort controls

### Data Model

Core types in `src/app/lib/types.ts`:

- **AramStats**: Seven stat modifiers (dmg_dealt, dmg_taken, healing, shielding, ability_haste, attack_speed, energy_regen)
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
- **ability_haste**: Uses absolute values, not percentages (e.g., value of 20 means +20 ability haste)
- All other stats use percentage modifications (e.g., 1.1 = +10%, 0.9 = -10%)

### Name Normalization

Champion name handling has special cases:
- GnarBig → Gnar (wiki uses GnarBig, API uses Gnar)
- MonkeyKing ↔ Wukong (wiki uses MonkeyKing, display uses Wukong)
- Special characters are stripped when saving images

### Caching Strategy

- Wiki data stored in PocketBase (`https://lol.andy-cinquin.fr`) with 12-hour default TTL
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
