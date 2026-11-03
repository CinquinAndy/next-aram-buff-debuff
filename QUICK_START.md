# 🚀 Quick Start Guide

## Architecture Overview

```
┌─────────────────┐
│   User visits   │
│   homepage      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  fetchAramData()            │
│  (reads PocketBase ONLY)    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  PocketBase has data?       │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    │         ▼
    │    ┌─────────────────────┐
    │    │  Show error:        │
    │    │  "Call /api/refresh"│
    │    └─────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  Display champion data      │
└─────────────────────────────┘


┌─────────────────┐
│  POST           │
│  /api/refresh   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  WikiDataService.getData()  │
│  (FORCES scraping)          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Fetch wiki module page     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Save to PocketBase         │
└─────────────────────────────┘
```

## Initial Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PocketBase credentials
```

Required variables:
```env
POCKETBASE_URL=https://lol.andy-cinquin.fr
POCKETBASE_TOKEN=your_admin_token_here
```

### 3. Populate PocketBase (First Time)
```bash
# Option A: Using the API (recommended)
curl -X POST http://localhost:3000/api/refresh

# Option B: Using the script directly
bun scripts/test-scraping.ts
```

This will:
- ✅ Read the League of Legends wiki module page (see SCRAPING_GUIDE.md)
- ✅ Parse 170+ champions data
- ✅ Save to PocketBase
- ✅ Download champion splash arts

**Expected output:**
```
✅ Successfully parsed 172 champions
✅ Found 132 champions with ARAM modifications
✅ Patch V25.23
✅ Data saved to PocketBase
```

### 4. Start Development
```bash
npm run dev
```

Visit http://localhost:3000

## API Endpoints

### GET /
Main page - displays champion data from PocketBase

**Behavior:**
- ✅ Reads from PocketBase cache only
- ❌ Never triggers scraping
- ⚠️ Shows error if cache empty
- 🔄 Shows RefreshPopup in bottom-right corner

### GET /api/refresh/info
Returns information about the current data age

**Response:**
```json
{
  "age": 86400000,
  "patchVersion": "V25.23",
  "lastUpdate": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/refresh
Triggers wiki scraping and updates PocketBase

**Usage:**
```bash
# Basic
curl -X POST http://localhost:3000/api/refresh

# With authentication (if REFRESH_SECRET is set)
curl -X POST http://localhost:3000/api/refresh \
  -H "Authorization: Bearer YOUR_SECRET"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Data refreshed successfully",
  "data": {
    "patchVersion": "V25.23",
    "timestamp": 1764333693287,
    "championsCount": 172
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Data Flow

### Reading Data (Normal Operation)
```typescript
// src/app/lib/actions.ts
fetchAramData()
  → WikiDataService.getDataFromCache()
  → PocketBaseService.getData()
  → Returns cached data (FAST - no scraping)
```

### Refreshing Data (Manual)
```typescript
// src/app/api/refresh/route.ts
POST /api/refresh
  → WikiDataService.getData({ forceRefresh: true })
  → HttpService.fetchText() (wiki page, then the donnees-wiki branch copy)
  → Parse Lua data
  → PocketBaseService.saveData()
  → ImageService.ensureChampionImages()
```

## Key Principles

1. **Normal pages NEVER scrape** - They only read from PocketBase
2. **Only /api/refresh scrapes** - This is the single source of truth update
3. **Graceful degradation** - If PocketBase is down, show helpful error
4. **Fast responses** - Reading from PocketBase is instant (<100ms)
5. **Auto-refresh detection** - RefreshPopup warns if data is older than 24h

## Testing

### Test Scraping Manually
```bash
npm run test:scraping
```

### Test API Endpoint
```bash
# If dev server is running
./scripts/test-api-refresh.sh

# Or manually
curl -X POST http://localhost:3000/api/refresh
```

### Test Empty Cache Handling
```bash
# 1. Delete data from PocketBase (via admin panel)
# 2. Visit http://localhost:3000
# 3. Should see friendly error message
# 4. Call POST /api/refresh
# 5. Refresh page - data should appear
```

## Common Scenarios

### Scenario 1: Fresh Install
```bash
pnpm install
cp .env.example .env
# Edit .env
npm run dev
# Visit localhost:3000 → See "Cache empty" error
curl -X POST http://localhost:3000/api/refresh
# Refresh page → See champion data
```

### Scenario 2: Update Data
```bash
# A new LoL patch came out
curl -X POST http://localhost:3000/api/refresh
# Data automatically refreshed in PocketBase
```

### Scenario 3: Automated Updates
```bash
# Setup cron job to refresh daily
0 0 * * * curl -X POST https://your-domain.com/api/refresh
```

## Troubleshooting

### "PocketBase cache is empty"
**Solution:** Call `POST /api/refresh` to populate

### Refresh fails (502 on /api/refresh)
**Check:**
1. The logs: `HttpService: request refused` shows the status and Cloudflare headers
2. The `donnees-wiki` branch copy is recent (workflow "Données du wiki")
3. See SCRAPING_GUIDE.md

### Page loads slowly
**Cause:** Images downloading on first load
**Solution:** Wait for initial image download, subsequent loads are fast

### 401 Unauthorized on /api/refresh
**Cause:** REFRESH_SECRET is set but not provided
**Solution:**
```bash
curl -X POST http://localhost:3000/api/refresh \
  -H "Authorization: Bearer YOUR_REFRESH_SECRET"
```

## Performance

### First Load (Cold)
- Scraping: ~10-15 seconds
- Parsing: ~1 second
- Saving to PocketBase: <1 second
- **Total: ~12-17 seconds**

### Subsequent Loads (Warm)
- Read from PocketBase: <100ms
- Render page: <200ms
- **Total: <300ms**

## Security

### PocketBase Token
- ✅ Stored in `.env` (not committed)
- ✅ Server-side only (never exposed to client)
- ✅ Admin token for full access

### Refresh Endpoint
- Optional: Set `REFRESH_SECRET` in `.env`
- Recommended for production to prevent abuse
- Not required for development

## Production Deployment

### Environment Variables
```env
POCKETBASE_URL=https://lol.andy-cinquin.fr
POCKETBASE_TOKEN=your_production_token
REFRESH_SECRET=random_secure_string
```

### Initial Setup
```bash
# After deployment, populate cache
curl -X POST https://your-domain.com/api/refresh \
  -H "Authorization: Bearer YOUR_REFRESH_SECRET"
```

### Automated Refresh
Setup cron job or scheduled task:
```bash
# Daily at midnight
0 0 * * * curl -X POST https://your-domain.com/api/refresh \
  -H "Authorization: Bearer $REFRESH_SECRET"
```

## Scripts Available

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Check code quality
npm run test:scraping    # Test wiki scraping
npm run init:pocketbase  # Initialize PocketBase
```

## Next Steps

1. ✅ Populate PocketBase: `curl -X POST localhost:3000/api/refresh`
2. ✅ Visit homepage: `http://localhost:3000`
3. ✅ Setup automated refresh (optional)
4. ✅ Deploy to production

## UI Features

### RefreshPopup Component
A bottom-right popup that helps users keep data fresh:

**Features:**
- ✅ Auto-opens if data is older than 24 hours
- ✅ Shows data age and current patch version
- ✅ One-click refresh button
- ✅ Orange/pulsing animation when data is stale
- ✅ Success/error handling with auto-reload
- ✅ Minimal when closed (just a button icon)

**Usage:**
- Click the refresh icon to open the popup
- Click "Refresh Data Now" to trigger `/api/refresh`
- Page automatically reloads after successful refresh

## Support

- 📖 Full scraping guide: `SCRAPING_GUIDE.md`
- 📖 Architecture details: `CLAUDE.md`
- 🐛 Issues: Check console logs for detailed errors
