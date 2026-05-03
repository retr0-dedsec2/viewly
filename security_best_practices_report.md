# Security Best Practices Report

## Executive Summary

The application is now much closer to a production SaaS baseline: browser auth is cookie-first, state-changing requests carry CSRF headers, API responses are marked `no-store`, production cookies must be secure unless an explicit test override is set, and the YouTube helper/scraper paths validate IDs, URLs, limits, and regex input.

The main remaining risk is repository hygiene: `.env` and NeDB runtime databases are still tracked by Git even though `.gitignore` now excludes them. Treat that as sensitive data exposure until secrets are rotated and the files are removed from the index/history.

## Critical

No current critical code execution, DOM XSS, command injection, or unauthenticated admin API issue was found in the reviewed React/Express code.

## High

### SEC-001: Runtime secrets and databases are still tracked by Git

- Rule ID: GENERAL-SECRETS-001 / REACT-CONFIG-001
- Severity: High
- Location: `.gitignore:2-8`; Git index currently includes `.env` and `backend/data/*.db`
- Evidence: `.gitignore` excludes `.env`, `.env.*`, `backend/data/`, `backend/uploads/`, `.runtime-data/`, and `.runtime-uploads/`, but `git ls-files .env backend\data` still returns `.env`, `backend/data/users.db`, `backend/data/favorites.db`, `backend/data/history.db`, `backend/data/playlists.db`, `backend/data/scraped.db`, `backend/data/settings.db`, and `backend/data/tracks.db`.
- Impact: if this repository is pushed, JWT secrets, API keys, password hashes, user data, listening history, and local content can leak.
- Fix: remove these files from the Git index, rotate any secrets that were committed, and rewrite public history if already pushed.
- Mitigation: keep the current `.gitignore` rules and use production `DATA_DIR` / `UPLOADS_DIR` outside the repo.
- Status: not changed automatically because untracking/history rewrite is a repository operation that should be coordinated.

## Medium

### SEC-002: Development dependency advisory remains for Vite/esbuild

- Rule ID: REACT-SUPPLY-001 / EXPRESS-DEPS-001
- Severity: Medium
- Location: `package.json` / `package-lock.json`
- Evidence: `npm audit --audit-level=moderate` reports `esbuild <=0.24.2` through `vite <=6.4.1` with advisory `GHSA-67mh-4wv8-2f99`. `npm audit --omit=dev --audit-level=moderate` reports `0 vulnerabilities`.
- Impact: the advisory affects the development server; production dependencies are clean in this audit.
- Fix: schedule a Vite major-version upgrade and regression test the dev/build workflow, or apply a vetted dependency override only after compatibility testing.
- Mitigation: do not expose the Vite dev server outside trusted local development networks.
- Status: not force-fixed because npm recommends a breaking upgrade.

### SEC-003: CSP still allows inline styles

- Rule ID: REACT-CSP-001 / EXPRESS-HEADERS-001
- Severity: Medium
- Location: `backend/server.js:137-154`
- Evidence: the CSP is set in `securityHeaders`, but `style-src` includes `'unsafe-inline'`.
- Impact: a strict CSP would provide stronger defense-in-depth against style-based injection and some XSS chains.
- Fix: move dynamic inline styles to CSS classes/custom properties where feasible, then remove `'unsafe-inline'` from `style-src`.
- Mitigation: script execution remains constrained by `script-src 'self' https://www.youtube.com https://s.ytimg.com`; no `unsafe-inline` or `unsafe-eval` is present for scripts.
- Status: accepted for now because the React UI uses inline `style` props for thumbnails and generated covers.

## Fixed During This Pass

### FIX-001: Browser auth no longer attaches localStorage bearer tokens

- Rule ID: JS-STORAGE-001 / REACT-NET-001
- Severity: High
- Location: `src/lib/api.js:4-5`, `src/lib/api.js:30-44`, `backend/server.js:40-53`, `backend/server.js:460-462`
- Change: removed client-side bearer token attachment, kept a legacy token purge, and made backend bearer auth opt-in with `ENABLE_BEARER_AUTH=false` by default.
- Security value: reduces XSS/local-storage token exposure and keeps the browser session model centered on HttpOnly cookies.

### FIX-002: CSRF, secure cookies, no-store API responses, and rate limits are explicit

- Rule ID: EXPRESS-CSRF-001 / EXPRESS-COOKIE-001 / EXPRESS-AUTH-001
- Severity: High
- Location: `backend/server.js:72-79`, `backend/server.js:160-163`, `backend/server.js:191-218`, `backend/server.js:228-252`, `backend/server.js:321-329`, `src/lib/api.js:16-33`
- Change: state-changing requests include `X-CSRF-Token`, API responses send `Cache-Control: no-store`, auth cookies use centralized flags, production insecure cookies fail closed, and auth endpoints are rate-limited.
- Security value: reduces CSRF, credential caching, brute force, and insecure production-cookie risks.

### FIX-003: YouTube URLs and external links are constrained

- Rule ID: REACT-URL-001 / JS-URL-002
- Severity: Medium
- Location: `src/utils/youtube.js:1-22`, `src/components/Player.jsx:32-38`, `src/components/Player.jsx:232`, `src/pages/Search.jsx:143`
- Change: YouTube IDs are validated before thumbnail/watch URL generation, external links use `rel="noopener noreferrer"`, and the YouTube iframe script is loaded with a referrer policy.
- Security value: reduces unsafe URL construction and tabnabbing exposure.

### FIX-004: Scraper input is bounded and SSRF/ReDoS surface is reduced

- Rule ID: EXPRESS-SSRF-001 / EXPRESS-INJECT-002
- Severity: Medium
- Location: `backend/youtube-scraper.js:21-37`, `backend/youtube-scraper.js:62-66`, `backend/youtube-scraper.js:129-153`, `backend/youtube-scraper.js:220-241`
- Change: RSS fetches are allowlisted to YouTube feeds, query regex input is escaped, limits are clamped, YouTube IDs are validated, and the scraper uses `DATA_DIR`.
- Security value: reduces SSRF, regex denial-of-service, malformed ID, and accidental repo-data persistence risks.

### FIX-005: Frontend SaaS posture and unsafe UX sinks improved

- Rule ID: REACT-AUTHZ-001 / JS-XSS-002
- Severity: Low
- Location: `src/pages/Home.jsx:56-88`, `src/pages/Home.module.css:103-172`, `src/pages/Login.jsx:52-54`, `src/pages/Library.jsx:68`, `src/pages/Library.jsx:137`
- Change: the home screen is now an operational dashboard, the auth page communicates secure session behavior, and the playlist cover edit no longer uses a browser `prompt`.
- Security value: improves operator clarity and avoids brittle browser prompt workflows while keeping React escaping-by-default.

## Verification

- `npm.cmd run build`: passed.
- `node --check backend\server.js`: passed.
- `node --check backend\youtube-scraper.js`: passed.
- `npm.cmd audit --omit=dev --audit-level=moderate`: passed with `0 vulnerabilities`.
- `npm.cmd audit --audit-level=moderate`: reports only the development Vite/esbuild advisory noted in SEC-002.
