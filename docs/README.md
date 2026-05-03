# Viewly Full Version

Structure:
- `app/` : application SaaS complète, musique + IA + dashboard
- `landing/` : landing page séparée pour acquisition
- `backend/` : API Express pour IA et Stripe
- `supabase/` : schema SQL prêt

## Lancer

```bash
cd app && npm install && npm run dev
cd landing && npm install && npm run dev
cd backend && npm install && cp .env.example .env && npm run dev
```

## Positionnement

Viewly est une app d'écoute musicale avec IA intégrée partout : recherche, playlists, recommandations, DJ set builder, contenu viral, analytics.
