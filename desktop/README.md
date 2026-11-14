# ARAM Balance Checker: client de bureau

Pendant la sélection des champions en ARAM ou en ARAM: Mayhem, l'app montre les modificateurs d'équilibrage :

- ton champion ;
- ceux de ton équipe ;
- ceux du banc, qu'on peut échanger.

Hors sélection, elle montre la liste complète avec une recherche. Les valeurs sont celles du site
(<https://aram-balances-checker.forhives.fr>), tirées du League of Legends Wiki.

L'app **ne fait que lire** : elle interroge l'API locale du client League (LCU) pour connaître la phase,
la file et la sélection, et n'envoie jamais rien au client. Riot ne documente pas officiellement cette API,
mais la tolère ; c'est celle qu'utilisent les outils comme Blitz ou Porofessor. L'app n'est pas approuvée par Riot Games.

## Installer

Télécharge la dernière version dans les [Releases](https://github.com/CinquinAndy/next-aram-buff-debuff/releases) :

- **Windows** : le fichier `…_x64-setup.exe` (ou le `.msi`).
- **macOS** : le fichier `.dmg` : `aarch64` pour Apple Silicon, `x64` pour Intel.

L'app n'est pas signée avec un certificat de développeur :

- **Windows** affiche « Windows a protégé votre ordinateur » (SmartScreen) au premier lancement :
  « Informations complémentaires », puis « Exécuter quand même ».
- **macOS** peut dire que l'app est « endommagée » ou d'un « développeur non identifié » : clic droit, puis « Ouvrir »,
  ou dans un terminal `xattr -cr "/Applications/ARAM Balance Checker.app"`.

Les mises à jour suivantes s'installent depuis l'app : un bandeau propose « Install and restart ».
Elles sont signées avec la clé de l'updater, et l'app refuse un fichier qui n'est pas signé avec cette clé.

## Comment ça marche

| Partie | Rôle |
| --- | --- |
| `lcu/` (Rust) | Trouve le client League (arguments de `LeagueClientUx`, sinon le fichier `lockfile`), puis lit `/lol-gameflow/v1/gameflow-phase`, `/lol-gameflow/v1/session` (la file : ARAM ou Mayhem) et `/lol-champ-select/v1/session` (`myTeam`, `benchChampions`). Testé sans client League (faux serveur local). |
| `src-tauri/` (Rust) | Interroge le client toutes les 1,5 s et envoie l'état à la fenêtre (`client-state`) quand il change. Charge `/api/champions` du site et garde une copie hors ligne. |
| `src/` (TypeScript) | La fenêtre : groupes (ton champion, équipe, banc), mode Auto, Mayhem ou ARAM (Auto suit la file du client), cartes de stats, changements de sorts Mayhem. |

Le client utilise un certificat signé par Riot, pas par une autorité publique. Le module `lcu`
désactive donc la vérification du certificat, mais seulement pour ses appels à `127.0.0.1`, protégés par le mot de passe de la session.

## Développer

```bash
pnpm install
pnpm dev          # la fenêtre dans un navigateur, en mode démo (http://localhost:1420)
pnpm test         # tests de la fenêtre
cargo test --workspace
pnpm tauri dev    # l'app complète (sous Linux : paquets WebKitGTK, voir plus bas)
pnpm tauri build  # installeurs sans signature de mise à jour
```

Les fichiers de mise à jour signés (`latest.json`, `.sig`) ne sont produits que par le workflow de release,
avec `--config src-tauri/tauri.release.conf.json` et la clé privée en variable d'environnement.

En mode démo, une barre permet de simuler les états du client (pas de client, lobby, sélection Mayhem,
reroll, sélection ARAM). Par défaut, les données viennent du site en production ; pour un serveur local :
`VITE_CHAMPIONS_URL=http://localhost:3000/api/champions pnpm dev`.

Sous Fedora, la compilation de l'app demande :
`sudo dnf install webkit2gtk4.1-devel gtk3-devel libsoup3-devel javascriptcoregtk4.1-devel libappindicator-gtk3-devel`.

## Publier une version

1. Monter la version dans `src-tauri/tauri.conf.json` (et dans `package.json` et `Cargo.toml` pour rester cohérent).
2. Pousser un tag `desktop-vX.Y.Z` : `.github/workflows/desktop-release.yml` construit les installeurs Windows et macOS
   et publie la release avec le `latest.json` que lit l'updater.

Le workflow a besoin de deux secrets du dépôt :

- `TAURI_SIGNING_PRIVATE_KEY` : dans Vaultwarden, `app/aram-desktop/tauri-updater-key` ;
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` : dans Vaultwarden, `app/aram-desktop/tauri-updater-key-password`.

La clé publique correspondante est dans `src-tauri/tauri.conf.json`. Si la clé privée est perdue, les apps déjà installées
ne pourront plus se mettre à jour toutes seules : il faudra réinstaller depuis les Releases.
