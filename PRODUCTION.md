# Production Checklist

## Required environment

- `NODE_ENV=production`
- `JWT_SECRET`: random secret with at least 32 characters
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: required on the first production boot when the database is empty
- `YOUTUBE_API_KEY`: server-side YouTube Data API key
- `FRONTEND_ORIGIN`: exact public origin, for example `https://viewly.example`
- `CORS_ORIGINS`: comma-separated public origins if you serve multiple domains
- `COOKIE_SECURE=true`: use when served over HTTPS
- `DATA_DIR` and `UPLOADS_DIR`: persistent storage paths, not ephemeral deployment folders
- `REQUIRE_PERSISTENT_STORAGE=true`: keep enabled unless you are running a disposable demo
- `REQUIRE_PAYPAL=true`: keep enabled when selling Studio
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=live`: required for paid Studio checkout
- `ENABLE_BEARER_AUTH=false`: keep browser auth cookie-only unless you intentionally expose API token clients
- `ALLOW_INSECURE_PROD_COOKIES=false`: do not enable outside an isolated HTTP test environment
- `ENABLE_SELF_SERVICE_BILLING=false`: keep false in production; Studio upgrades should go through PayPal capture or admin

## Build and run

```bash
npm ci
npm run preflight:prod
npm run build
npm start
```

The Express server serves `dist/` when it exists, so one production process can serve both the API and the React app.

The backend now fails fast in production when these variables are missing or unsafe. That is intentional: it is better to fail during deployment than silently run with insecure auth, broken CORS, local data loss, or unpaid Studio upgrades.

## Data

Set `DATA_DIR` and `UPLOADS_DIR` to persistent storage in production. Do not deploy `backend/data/`, `backend/uploads/`, `.env`, `node_modules/`, or `dist/` from local development state.
