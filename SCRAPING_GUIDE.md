# Guide de Scraping Wiki - Solution Playwright

## 🎉 Résumé

Le scraping du wiki LoL fonctionne maintenant grâce à **Playwright** qui simule un vrai navigateur et contourne la protection Cloudflare.

### Résultats des tests:
- ✅ 172 champions récupérés
- ✅ 132 champions avec modifications ARAM
- ✅ Patch V25.23 (le plus récent)
- ✅ Sauvegarde automatique dans PocketBase
- ✅ Téléchargement automatique des images

## Architecture

### Flow de scraping:
1. **Tentative directe** avec fetch + cookies (rapide mais bloqué par Cloudflare)
2. **Fallback Playwright** (headless Chrome, contourne Cloudflare automatiquement)
3. **Sauvegarde PocketBase** (données persistées pour 12h)
4. **Téléchargement images** (splash arts depuis Data Dragon CDN)

### Services impliqués:
- `HttpService`: Gère les requêtes avec fallback Playwright
- `PlaywrightService`: Lance Chromium headless pour scraper
- `WikiDataService`: Parse les données Lua du wiki
- `PocketBaseService`: Persiste les données
- `ImageService`: Télécharge les splash arts

## Utilisation

### Tester le scraping manuellement:
```bash
npm run test:scraping
# ou
bun scripts/test-scraping.ts
```

### Forcer un refresh via l'API:
```bash
curl -X POST http://localhost:3000/api/refresh-data
```

### Avec authentification (si REFRESH_SECRET configuré):
```bash
curl -X POST http://localhost:3000/api/refresh-data \
  -H "Authorization: Bearer YOUR_SECRET"
```

## Configuration

### Variables d'environnement (.env):

```bash
# PocketBase
POCKETBASE_URL=https://lol.andy-cinquin.fr
POCKETBASE_TOKEN=your_admin_token

# Scraping (optionnel - si vous voulez tenter sans Playwright)
WIKI_COOKIES="your_browser_cookies"

# API Protection (optionnel)
REFRESH_SECRET=your_secret_key
```

## Dépendances

### Playwright:
```bash
# Installation (déjà fait)
pnpm add playwright
npx playwright install chromium
```

### Configuration système:
Playwright nécessite quelques dépendances système. Sur Ubuntu/Debian:
```bash
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2
```

## Performance

### Temps de scraping:
- Première requête (cold start): ~10-15 secondes
- Requêtes suivantes (cache PocketBase): < 100ms
- Playwright overhead: ~3-5 secondes (lancement navigateur)

### Optimisations possibles:
1. **Browser persistant**: Garder Chromium lancé entre les requêtes
2. **Cron job**: Scraper automatiquement toutes les 24h
3. **Worker séparé**: Déplacer le scraping dans un service externe

## Déploiement

### Vercel:
Playwright fonctionne sur Vercel mais attention:
- Limite de 50MB pour le bundle
- Timeout de 10s (hobby) / 60s (pro)
- Solution: Utiliser un cron job externe ou serverless function

### Docker:
```dockerfile
FROM node:20-alpine

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chromium path for Playwright
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ... rest of your Dockerfile
```

### Alternative: Service externe
Créer un worker Cloudflare ou AWS Lambda qui:
1. Scrappe le wiki toutes les 24h
2. Pousse les données dans PocketBase
3. L'app Next.js lit juste depuis PocketBase

## Troubleshooting

### Playwright ne trouve pas Chromium:
```bash
npx playwright install chromium --force
```

### Timeout lors du scraping:
Augmenter les timeouts dans `PlaywrightService.ts`:
```typescript
await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 60000, // 60s au lieu de 45s
})
```

### Erreur "Protocol error":
Le navigateur Chromium a crashé. Vérifier:
- Mémoire disponible (minimum 512MB)
- Permissions d'exécution
- Dépendances système installées

## Alternatives considérées

1. **Cookies manuels**: Ne suffit pas, Cloudflare fait du fingerprinting
2. **Proxy CORS**: Bloqués également par Cloudflare
3. **Puppeteer**: Plus lourd que Playwright, API moins moderne
4. **✅ Playwright**: Solution retenue - robuste, moderne, maintenu

## Maintenance

### Mise à jour des données:
Les données sont automatiquement rafraîchies si:
- Elles ont plus de 12h (configurable via `maxAge`)
- Un utilisateur visite la page et force un refresh
- L'API `/api/refresh-data` est appelée

### Monitoring:
Tous les logs sont préfixés par le service:
```
PlaywrightService: ...
WikiDataService: ...
PocketBaseService: ...
HttpService: ...
```

### Coûts:
- PocketBase: Gratuit (self-hosted)
- Playwright: CPU uniquement lors du scraping (~10-15s toutes les 12-24h)
- Bande passante: ~1MB par scraping

## Notes importantes

1. **Rate limiting**: Le scraping est limité par le TTL PocketBase (12h par défaut)
2. **Cloudflare**: Playwright contourne la protection, mais reste respectueux
3. **Legal**: Le wiki LoL est sous licence CC BY-SA, le scraping est autorisé pour usage personnel
4. **Fallback**: Si Playwright échoue, les données stale de PocketBase sont utilisées

## Scripts utiles

```bash
# Tester le scraping
npm run test:scraping

# Initialiser PocketBase
npm run init:pocketbase

# Vérifier la santé de Playwright
bun -e "import { PlaywrightService } from './src/app/services/PlaywrightService'; PlaywrightService.healthCheck().then(console.log)"
```

## Support

En cas de problème:
1. Vérifier les logs console
2. Tester manuellement avec `npm run test:scraping`
3. Vérifier que Chromium est installé: `npx playwright --version`
4. Consulter la documentation Playwright: https://playwright.dev
