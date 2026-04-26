# Viewly Music V4 — frontend + backend local

Ajouts de cette version:
- chargement automatique de `.env` côté backend avec `dotenv`
- recherche **publique** dans le catalogue local
- recherche **YouTube live** dès que `YOUTUBE_API_KEY` est configurée
- **favoris persistants** côté backend pour les comptes connectés
- **analytics admin** (top titres, favoris, volumes)
- **CMS admin** toujours présent
- édition simple de **cover de playlist**
- historique et recommandations conservés

## Installation

```bash
npm install
```

## Variables d'environnement

Copie `.env.example` vers `.env` à la racine du projet:

```env
YOUTUBE_API_KEY=
PORT=8787
JWT_SECRET=change-me-in-production
```

## Lancer le projet

```bash
npm run dev:full
```

- frontend: `http://localhost:5173`
- backend: `http://localhost:8787`

## Comptes de démo

- admin: `admin@viewly.local` / `admin123`
- user: `lina@viewly.local` / `demo123`

## Ce qui a été corrigé

Si le message `YOUTUBE_API_KEY manquante côté serveur` apparaissait alors que la clé était bien dans `.env`, la cause était que le backend ne chargeait pas `.env` au démarrage. Cette version corrige ça.

## Scripts

```bash
npm run dev
npm run server
npm run dev:full
npm run build
```
