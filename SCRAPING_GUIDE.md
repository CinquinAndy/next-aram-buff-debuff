# Sources des données

L'app affiche les modificateurs ARAM (et URF, OFA…) tirés du module
[`Module:ChampionData/data`](https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data) du wiki
League of Legends (Weird Gloop, licence CC BY-SA 3.0, crédité en pied de page).

## Chaîne de rafraîchissement

1. **Page du module sur le wiki**, lue depuis le serveur : une requête GET simple, avec un User-Agent
   qui nomme l'app et donne ses liens (`USER_AGENT`, `src/app/config/sources.ts`). La page simple est
   autorisée par le robots.txt du wiki ; `?action=raw` et `api.php` ne le sont pas et ne sont plus utilisés.
2. **Copie de repli** sur la branche `donnees-wiki` (`ChampionData.lua` + `meta.json`), publiée chaque jour
   par le workflow `donnees-wiki.yml` depuis le réseau de GitHub, après les mêmes contrôles que l'app.
   Elle sert si le wiki refuse le serveur de production.
3. **Dernière bonne valeur** dans PocketBase : si aucune source ne passe les contrôles, rien n'est écrit
   et l'app garde les données enregistrées.

Contrôles avant tout enregistrement (`src/app/lib/dataValidation.ts`) : au moins 150 champions, au moins
50 champions modifiés en ARAM, valeurs numériques, pas de chute de plus de 10 % du nombre de champions,
révision de données pas plus ancienne que celle enregistrée.

Le patch affiché est le patch courant du jeu, lu dans Data Dragon (`versions.json[0]`, 16.21.1 → V26.21).
La révision des données est le plus récent `["changes"]` du module.

## Rafraîchir

- Automatique : une visite de la page quand les données ont plus de 24 h lance un rafraîchissement en
  arrière-plan (au plus un essai par heure après un échec).
- Manuel : `curl -X POST https://aram-balances-checker.forhives.fr/api/refresh`
  (en-tête `authorization: Bearer …` si `REFRESH_SECRET` est posé). Réponse 502 si aucune source n'a donné
  de données valides.
- État : `GET /api/refresh/info` (patch, révision, source, date, nombre de champions).

## Tests

```bash
pnpm test        # parseur, contrôles et chaîne complète sur des copies enregistrées (tests/fixtures)
pnpm test:live   # réseau réel : wiki + Data Dragon (+ production avec PROD_URL=…)
pnpm snapshot:wiki ./sortie   # écrit la copie de repli localement
```

`pnpm test:live` échoue si les données sont vides ou ont plus de 2 patchs de retard sur le jeu.
Il tourne chaque jour dans `donnees-wiki.yml` : un échec envoie la notification GitHub.

## Si le wiki refuse le serveur

Les journaux de l'app affichent `HttpService: request refused` avec `status`, `server`, `cf-mitigated`,
`cf-ray` et le début de la réponse. Un 403 avec `cf-mitigated: challenge` veut dire que l'adresse du
serveur est filtrée : la copie de repli prend le relais. Ne pas réintroduire de navigateur sans tête ni de
cookies copiés pour contourner la protection ; écrire plutôt à Weird Gloop pour faire autoriser l'app.
