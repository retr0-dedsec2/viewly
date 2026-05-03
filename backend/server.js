import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Datastore from 'nedb-promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import {
  usersDb,
  playlistsDb,
  tracksDb,
  historyDb,
  favoritesDb,
  settingsDb,
  aiUsageDb,
} from './prismaAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';
function vercelDeploymentOrigin() {
  const raw = String(process.env.VERCEL_URL || '').trim();
  if (!raw) return '';
  try {
    const href = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(href).origin;
  } catch {
    return '';
  }
}
const defaultDataDir = isVercel
  ? '/tmp/viewly-data'
  : path.join(__dirname, 'data');
const defaultUploadsDir = isVercel
  ? '/tmp/viewly-uploads'
  : path.join(__dirname, 'uploads');
const dataDir = path.resolve(process.env.DATA_DIR || defaultDataDir);
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || defaultUploadsDir);
const distDir = path.resolve(__dirname, '..', 'dist');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

/*
const usersDb = await createMirroredDatastore('users.db');
const playlistsDb = await createMirroredDatastore('playlists.db');
const tracksDb = await createMirroredDatastore('tracks.db');
const historyDb = await createMirroredDatastore('history.db');
const favoritesDb = await createMirroredDatastore('favorites.db');
const settingsDb = await createMirroredDatastore('settings.db');
const aiUsageDb = await createMirroredDatastore('ai-usage.db');
*/
const user = await prisma.user.findUnique({
  where: { email },
});
const playlists = await prisma.playlist.findMany({
  where: { userId: req.user.id },
  orderBy: { createdAt: 'desc' },
});

const DEFAULT_USER_PREFERENCES = Object.freeze({
  autoplay: true,
  notifications: false,
  highQuality: true,
  publicProfile: false,
});

const ROLE_VALUES = new Set(['user', 'associate', 'admin']);
const DEFAULT_CONTENT_BLOCKS = Object.freeze([
  {
    id: 'hero-flow',
    type: 'workflow',
    title: 'Accueil editorial',
    body: 'Mets en avant la promesse Viewly, les playlists du moment et les nouveautes catalogue.',
    cta: 'Editer la home',
    visible: true,
  },
  {
    id: 'free-rules',
    type: 'notice',
    title: 'Plan Free cadre',
    body: 'Le plan gratuit reste utile, mais limite playlists, favoris et IA pour proteger les couts.',
    cta: 'Voir les limites',
    visible: true,
  },
  {
    id: 'studio-lab',
    type: 'feature',
    title: 'Studio IA',
    body: 'Les membres Studio et associes peuvent brancher OpenAI, Ollama ou un fournisseur compatible.',
    cta: 'Tester IA',
    visible: true,
  },
]);
const PLAN_LIMITS = Object.freeze({
  Free: Object.freeze({
    playlists: 3,
    tracksPerPlaylist: 25,
    favorites: 30,
    aiRequestsPerDay: 0,
    canUseAi: false,
    canUseStudio: false,
    label: 'Free limite',
  }),
  Studio: Object.freeze({
    playlists: 100,
    tracksPerPlaylist: 200,
    favorites: 500,
    aiRequestsPerDay: 120,
    canUseAi: true,
    canUseStudio: true,
    label: 'Studio complet',
  }),
});
const STAFF_LIMITS = Object.freeze({
  playlists: 1000,
  tracksPerPlaylist: 500,
  favorites: 1000,
  aiRequestsPerDay: 500,
  canUseAi: true,
  canUseStudio: true,
  label: 'Equipe Viewly',
});
const TASTE_HISTORY_LIMIT = 80;
const TASTE_FAVORITES_LIMIT = 60;
const TASTE_PLAYLIST_LIMIT = 24;
const RECOMMENDATION_CATALOG_LIMIT = 220;
const FAVORITE_LIST_LIMIT = 200;
const ADMIN_ANALYTICS_LIMIT = 500;
const CATALOG_QUERY_SCAN_LIMIT = 500;

const DEFAULT_JWT_SECRET = 'viewly-dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
if (
  isProduction &&
  (!process.env.JWT_SECRET ||
    JWT_SECRET.length < 32 ||
    /change-me|dev-secret/i.test(JWT_SECRET))
) {
  throw new Error(
    'JWT_SECRET doit etre defini avec au moins 32 caracteres aleatoires en production.',
  );
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = String(
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
).replace(/\/+$/, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const OLLAMA_BASE_URL = String(
  process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
).replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const CUSTOM_AI_BASE_URL = String(process.env.CUSTOM_AI_BASE_URL || '').replace(
  /\/+$/,
  '',
);
const CUSTOM_AI_API_KEY = process.env.CUSTOM_AI_API_KEY || '';
const CUSTOM_AI_MODEL = process.env.CUSTOM_AI_MODEL || 'gpt-compatible';
const VIEWLY_AI_PROVIDER = process.env.VIEWLY_AI_PROVIDER || 'openai';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45000);
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const PAYPAL_BASE_URL =
  PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
const PAYPAL_CURRENCY = cleanCurrency(process.env.PAYPAL_CURRENCY || 'EUR');
const PAYPAL_STUDIO_PRICE = normalizeMoney(
  process.env.PAYPAL_STUDIO_PRICE,
  '7.99',
);
const PORT = Number(process.env.PORT || 8787);
const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || (isProduction ? '12h' : '7d');
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '8mb';
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'viewly_session';
const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'viewly_csrf';
const COOKIE_SECURE = parseBoolean(process.env.COOKIE_SECURE, isProduction);
const ALLOW_INSECURE_PROD_COOKIES = parseBoolean(
  process.env.ALLOW_INSECURE_PROD_COOKIES,
  false,
);
const ENABLE_BEARER_AUTH = parseBoolean(process.env.ENABLE_BEARER_AUTH, false);
const SEED_DEMO_DATA = parseBoolean(process.env.SEED_DEMO_DATA, false);
const ENABLE_SELF_SERVICE_BILLING = parseBoolean(
  process.env.ENABLE_SELF_SERVICE_BILLING,
  false,
);
const REQUIRE_PAYPAL = parseBoolean(
  process.env.REQUIRE_PAYPAL,
  isProduction && !isVercel,
);
const REQUIRE_PERSISTENT_STORAGE = parseBoolean(
  process.env.REQUIRE_PERSISTENT_STORAGE,
  isProduction && !isVercel,
);
const JWT_COOKIE_MAX_AGE = parseDurationMs(
  JWT_EXPIRES_IN,
  isProduction ? 12 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
);
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
];
const ALLOWED_ORIGINS = parseList(
  process.env.CORS_ORIGINS ||
    process.env.FRONTEND_ORIGIN ||
    process.env.FRONTEND_URL ||
    vercelDeploymentOrigin(),
)
  .map(normalizeOrigin)
  .filter(Boolean);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
if (isProduction && SEED_DEMO_DATA) {
  throw new Error('SEED_DEMO_DATA doit rester false en production.');
}
if (isProduction && !COOKIE_SECURE && !ALLOW_INSECURE_PROD_COOKIES) {
  throw new Error(
    'COOKIE_SECURE=true est requis en production. Definis ALLOW_INSECURE_PROD_COOKIES=true uniquement pour un environnement de test HTTP isole.',
  );
}
validateProductionConfig();
const app = express();

app.disable('x-powered-by');
configureTrustProxy();
wrapAsyncRoutes(app);

app.use(assignRequestId);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin) ? origin || false : false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 600,
  }),
);
app.use('/api', noStoreApiResponses);
app.use('/api', blockCrossSiteStateChangingRequests);
if (isVercel) {
  app.use((req, _res, next) => {
    // Some Vercel service routing setups forward /api/* to this service after stripping the /api prefix.
    // Normalize to internal /api routes so endpoints work in both modes.
    if (!req.path.startsWith('/api/')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
    next();
  });
}
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(parseCookies);
app.use(ensureCsrfCookie);
app.use(
  '/api',
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 600),
  }),
);
app.use(
  '/api/auth/login',
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 12),
    keyGenerator: authRateKey,
    message: 'Trop de tentatives de connexion. Reessaie plus tard.',
  }),
);
app.use(
  '/api/auth/register',
  createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.REGISTER_RATE_LIMIT_MAX || 10),
    keyGenerator: (req) => req.ip,
    message: 'Trop de creations de compte depuis cette adresse.',
  }),
);
app.use(csrfProtection);
app.use(
  '/uploads',
  express.static(uploadsDir, {
    dotfiles: 'deny',
    index: false,
    maxAge: isProduction ? '1d' : 0,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}
function parseList(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || '').trim());
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

function parseDurationMs(value, fallback) {
  const match = String(value || '')
    .trim()
    .match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] || 1);
}

function validateProductionConfig() {
  if (!isProduction) return;
  if (!ALLOWED_ORIGINS.length) {
    throw new Error(
      'FRONTEND_ORIGIN ou CORS_ORIGINS doit contenir le domaine public exact en production.',
    );
  }
  if (
    REQUIRE_PERSISTENT_STORAGE &&
    (!process.env.DATA_DIR || !process.env.UPLOADS_DIR)
  ) {
    throw new Error(
      'DATA_DIR et UPLOADS_DIR doivent pointer vers un stockage persistant en production.',
    );
  }
  if (REQUIRE_PAYPAL && !isPayPalConfigured()) {
    throw new Error(
      'PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET sont requis en production pour vendre le plan Studio.',
    );
  }
  if (ENABLE_SELF_SERVICE_BILLING && !isPayPalConfigured()) {
    throw new Error(
      'ENABLE_SELF_SERVICE_BILLING=true est interdit sans PayPal configure.',
    );
  }
}

function configureTrustProxy() {
  const value = process.env.TRUST_PROXY;
  if (value) {
    if (/^\d+$/.test(value)) app.set('trust proxy', Number(value));
    else app.set('trust proxy', value);
  } else if (isVercel) {
    app.set('trust proxy', 1);
  }
}

function wrapAsyncRoutes(expressApp) {
  for (const method of ['get', 'post', 'patch', 'delete']) {
    const original = expressApp[method].bind(expressApp);
    expressApp[method] = (pathArg, ...handlers) =>
      original(
        pathArg,
        ...handlers.map((handler) =>
          handler?.constructor?.name === 'AsyncFunction'
            ? (req, res, next) =>
                Promise.resolve(handler(req, res, next)).catch(next)
            : handler,
        ),
      );
  }
}

function assignRequestId(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

function securityHeaders(_req, res, next) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self' https://www.youtube.com https://s.ytimg.com https://www.paypal.com https://www.paypalobjects.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://*.ggpht.com https://*.googleusercontent.com https://www.paypalobjects.com https://www.paypal.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://www.googleapis.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.paypal.com",
    'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.paypal.com',
    "frame-ancestors 'none'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self "https://www.paypal.com")',
  );
  next();
}

function noStoreApiResponses(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
}

function blockCrossSiteStateChangingRequests(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ message: 'Requete cross-site bloquee.' });
  }

  const origin = req.get('origin');
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ message: 'Origine non autorisee.' });
  }

  next();
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (ALLOWED_ORIGINS.includes(normalized)) return true;
  return (
    !isProduction &&
    (DEV_ORIGINS.includes(normalized) || isLoopbackOrigin(normalized))
  );
}

function isLoopbackOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function parseCookies(req, _res, next) {
  req.cookies = {};
  const header = req.headers.cookie || '';
  for (const item of header.split(';')) {
    const [rawName, ...rawValue] = item.trim().split('=');
    if (!rawName) continue;
    try {
      req.cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
    } catch {
      req.cookies[rawName] = rawValue.join('=') || '';
    }
  }
  next();
}

function cookieOptions(options = {}) {
  return {
    path: '/',
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    ...options,
  };
}

function setCsrfCookie(res, token = crypto.randomBytes(32).toString('hex')) {
  res.cookie(
    CSRF_COOKIE,
    token,
    cookieOptions({ httpOnly: false, maxAge: JWT_COOKIE_MAX_AGE }),
  );
  return token;
}

function ensureCsrfCookie(req, res, next) {
  if (!/^[a-f0-9]{64}$/i.test(req.cookies?.[CSRF_COOKIE] || ''))
    setCsrfCookie(res);
  next();
}

function timingSafeEqualString(a = '', b = '') {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!req.cookies?.[SESSION_COOKIE]) return next();
  const expected = req.cookies?.[CSRF_COOKIE] || '';
  const actual = req.get('x-csrf-token') || '';
  if (!timingSafeEqualString(expected, actual)) {
    return res.status(403).json({ message: 'Jeton CSRF invalide.' });
  }
  next();
}

function authRateKey(req) {
  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
  return `${req.ip}:${email}`;
}

function createRateLimiter({
  windowMs,
  max,
  keyGenerator = (req) => req.ip,
  message = 'Trop de requetes. Reessaie plus tard.',
}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 10000) {
      for (const [key, entry] of hits.entries()) {
        if (entry.resetAt <= now) hits.delete(key);
      }
    }

    const key = `${req.method}:${req.path}:${keyGenerator(req)}`;
    const entry = hits.get(key);
    const current =
      entry && entry.resetAt > now
        ? entry
        : { count: 0, resetAt: now + windowMs };
    current.count += 1;
    hits.set(key, current);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, max - current.count)),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.ceil(current.resetAt / 1000)),
    );

    if (current.count > max) {
      res.setHeader(
        'Retry-After',
        String(Math.ceil((current.resetAt - now) / 1000)),
      );
      return res.status(429).json({ message });
    }

    next();
  };
}

function createPublicId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanString(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isConfiguredSecret(value) {
  const secret = cleanString(value, 2000);
  return Boolean(
    secret &&
    !/^(replace|replace_me|changeme|change_me|your|example|test)([_-].*)?$/i.test(
      secret,
    ),
  );
}

function ensurePasswordPolicy(password) {
  const min = isProduction ? 10 : 6;
  if (password.length < min)
    return `Le mot de passe doit contenir au moins ${min} caracteres.`;
  if (isProduction && !/[A-Za-z]/.test(password))
    return 'Le mot de passe doit contenir au moins une lettre.';
  if (isProduction && !/\d/.test(password))
    return 'Le mot de passe doit contenir au moins un chiffre.';
  return '';
}

function readLimitedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizePreferences(value = {}) {
  const input =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    autoplay:
      typeof input.autoplay === 'boolean'
        ? input.autoplay
        : DEFAULT_USER_PREFERENCES.autoplay,
    notifications:
      typeof input.notifications === 'boolean'
        ? input.notifications
        : DEFAULT_USER_PREFERENCES.notifications,
    highQuality:
      typeof input.highQuality === 'boolean'
        ? input.highQuality
        : DEFAULT_USER_PREFERENCES.highQuality,
    publicProfile:
      typeof input.publicProfile === 'boolean'
        ? input.publicProfile
        : DEFAULT_USER_PREFERENCES.publicProfile,
  };
}

function cleanCurrency(value) {
  const currency = String(value || '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'EUR';
}

function normalizeMoney(value, fallback = '0.00') {
  const raw = String(value || fallback)
    .trim()
    .replace(',', '.');
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999) {
    const fallbackAmount = Number(
      String(fallback || '')
        .trim()
        .replace(',', '.'),
    );
    return Number.isFinite(fallbackAmount) && fallbackAmount > 0
      ? fallbackAmount.toFixed(2)
      : '0.00';
  }
  return amount.toFixed(2);
}

function sanitizeImageUrl(value, { allowRelative = true } = {}) {
  const raw = cleanString(value, 1000);
  if (!raw) return '';
  if (allowRelative && raw.startsWith('/uploads/') && !raw.includes('..'))
    return raw;
  try {
    const url = new URL(raw);
    if (
      url.protocol === 'https:' ||
      (!isProduction && url.protocol === 'http:')
    )
      return url.toString();
  } catch {
    return '';
  }
  return '';
}

function sanitizeGradient(value) {
  const raw = cleanString(value, 180);
  if (/^linear-gradient\([#%,.\s\w-]+\)$/i.test(raw)) return raw;
  return 'linear-gradient(135deg,#0b7a5c,#10203c)';
}

function sanitizeYouTubeId(value) {
  const id = cleanString(value, 40);
  return /^[A-Za-z0-9_-]{6,32}$/.test(id) ? id : '';
}

function normalizeRole(value) {
  const role = cleanString(value, 30);
  return ROLE_VALUES.has(role) ? role : 'user';
}

function isStaffRole(role) {
  return normalizeRole(role) === 'admin' || normalizeRole(role) === 'associate';
}

function normalizePlan(value) {
  return value === 'Studio' ? 'Studio' : 'Free';
}

function getAccessPolicy(user = {}) {
  const role = normalizeRole(user.role);
  const plan = normalizePlan(user.plan);
  const staff = isStaffRole(role);
  const limits = staff ? STAFF_LIMITS : PLAN_LIMITS[plan];
  return {
    role,
    plan,
    staff,
    canManageUsers: role === 'admin',
    canManageSite: staff,
    canUseAi: staff || limits.canUseAi,
    canUseStudio: staff || limits.canUseStudio,
    limits,
  };
}

function createLimitError(message, status = 403) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function normalizeContentBlocks(value) {
  const source =
    Array.isArray(value) && value.length ? value : DEFAULT_CONTENT_BLOCKS;
  return source.slice(0, 10).map((block, index) => {
    const type = ['feature', 'metric', 'notice', 'workflow'].includes(
      block?.type,
    )
      ? block.type
      : 'feature';
    return {
      id: cleanString(block?.id, 60) || createPublicId('block'),
      type,
      title: cleanString(block?.title, 120) || `Module ${index + 1}`,
      body: cleanString(block?.body, 420),
      cta: cleanString(block?.cta, 80),
      visible: block?.visible !== false,
    };
  });
}

function findByPublicId(db, rawId, extra = {}) {
  const id = String(rawId || '');
  const numericId = Number(id);
  const queries = [{ ...extra, id }];
  if (Number.isFinite(numericId)) queries.push({ ...extra, id: numericId });
  return queries.reduce(
    (promise, query) => promise.then((result) => result || db.findOne(query)),
    Promise.resolve(null),
  );
}

function issueAuthSession(res, user) {
  const token = signToken(user);
  res.cookie(
    SESSION_COOKIE,
    token,
    cookieOptions({
      httpOnly: true,
      maxAge: JWT_COOKIE_MAX_AGE,
    }),
  );
  setCsrfCookie(res);
}

function clearAuthSession(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions({ httpOnly: true }));
  res.clearCookie(CSRF_COOKIE, cookieOptions({ httpOnly: false }));
}

const DEFAULT_SETTINGS = {
  brandName: 'Viewly',
  logoAccent: 'ly',
  heroBadge: 'V3 immersive music app',
  heroTitle: 'Explore YouTube comme une vraie app musicale.',
  heroSubtitle:
    'Historique persistant, recommandations, playlists drag & drop et admin CMS pour editer le site sans toucher au code.',
  homePrimaryCta: 'Lancer ma selection',
  homeSecondaryCta: 'Voir les tendances',
  marketingBanner:
    'Nouveau : V3 avec historique, recommandations et glisser-deposer.',
  pricingFree: '0 EUR',
  pricingStudio: '7,99 EUR',
  adminAnnouncement: 'Tu peux modifier le contenu public du site depuis admin.',
  freeLimitBanner:
    'Plan Free : 3 playlists, 25 titres par playlist, 30 favoris et IA reservee au Studio.',
  contentBlocks: DEFAULT_CONTENT_BLOCKS,
};

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, _id, ...rest } = user;
  return {
    ...rest,
    role: normalizeRole(user.role),
    plan: normalizePlan(user.plan),
    preferences: normalizePreferences(user.preferences),
    access: getAccessPolicy(user),
  };
}

function normalizeTrack(track) {
  if (!track || typeof track !== 'object') return null;
  const youtubeId = sanitizeYouTubeId(track.youtubeId);
  return {
    id: cleanString(track.id, 80) || youtubeId || createPublicId('track'),
    title: cleanString(track.title, 160) || 'Titre inconnu',
    artist: cleanString(track.artist, 120) || 'Artiste inconnu',
    duration: readLimitedNumber(track.duration, 0, 0, 24 * 60 * 60),
    emoji: cleanString(track.emoji, 8) || '',
    youtubeId,
    thumbnail:
      sanitizeImageUrl(track.thumbnail, { allowRelative: false }) ||
      (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : ''),
    gradient: sanitizeGradient(track.gradient),
    tag: cleanString(track.tag, 80) || 'Playlist',
    description: cleanString(track.description, 800),
    publishedAt: cleanString(track.publishedAt, 60),
    source: cleanString(track.source, 40) || (youtubeId ? 'youtube' : 'local'),
  };
}

function publicPlaylist(playlist) {
  return {
    ...playlist,
    tracks: Array.isArray(playlist.tracks) ? playlist.tracks : [],
    trackCount: Array.isArray(playlist.tracks) ? playlist.tracks.length : 0,
  };
}

function normalizeSearchItem(item, index = 0, query = '') {
  const snippet = item?.snippet || {};
  const videoId = item?.id?.videoId || item?.id || '';
  const thumb =
    snippet?.thumbnails?.high?.url ||
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.default?.url ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

  return normalizeTrack({
    id: `yt-${videoId}-${index}`,
    title: snippet.title || 'Titre YouTube',
    artist: snippet.channelTitle || 'Chaine YouTube',
    duration: 0,
    emoji: '',
    youtubeId: videoId,
    thumbnail: thumb,
    gradient: 'linear-gradient(135deg,#0c8f66,#10203c)',
    tag: query ? `Import ${query}` : 'Resultat YouTube',
    description: snippet.description || '',
    publishedAt: snippet.publishedAt || '',
    source: 'youtube',
  });
}

async function upsertCatalogTrack(track, importedQuery = '') {
  const normalized = normalizeTrack(track);
  if (!normalized?.youtubeId) return null;
  const existing = await tracksDb.findOne({ youtubeId: normalized.youtubeId });
  const now = new Date().toISOString();
  const doc = {
    ...existing,
    ...normalized,
    importedQuery: importedQuery || existing?.importedQuery || '',
    importedAt: existing?.importedAt || now,
    updatedAt: now,
  };
  if (existing) {
    await tracksDb.update({ _id: existing._id }, { $set: doc });
    return { ...existing, ...doc };
  }
  return tracksDb.insert(doc);
}

async function fetchYouTubeSearch(query, options = {}) {
  if (!isConfiguredSecret(YOUTUBE_API_KEY))
    throw new Error('YOUTUBE_API_KEY manquante cote serveur.');
  const cleanQuery = cleanString(query, 120);
  if (!cleanQuery) return { items: [], nextPageToken: '', pageInfo: {} };
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', cleanQuery);
  url.searchParams.set(
    'maxResults',
    String(readLimitedNumber(options.maxResults, 12, 1, 25)),
  );
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('safeSearch', options.safeSearch || 'moderate');
  url.searchParams.set('order', options.order || 'relevance');
  if (options.pageToken)
    url.searchParams.set('pageToken', cleanString(options.pageToken, 200));
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.YOUTUBE_TIMEOUT_MS || 8000),
  );
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data?.error?.message || `YouTube API error ${response.status}`,
    );

  return {
    items: (data.items || []).map((item, index) =>
      normalizeSearchItem(item, index, cleanQuery),
    ),
    nextPageToken: data.nextPageToken || '',
    pageInfo: data.pageInfo || {},
  };
}

function isPayPalConfigured() {
  return (
    isConfiguredSecret(PAYPAL_CLIENT_ID) &&
    isConfiguredSecret(PAYPAL_CLIENT_SECRET)
  );
}

async function getPayPalAccessToken() {
  if (!isPayPalConfigured()) {
    const error = new Error("PayPal n'est pas configure.");
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(
      data.error_description ||
        data.error ||
        `PayPal auth error ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return data.access_token;
}

async function paypalRequest(pathname, { method = 'POST', body } = {}) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message || data.name || `PayPal API error ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

function validatePayPalCapture(capture, userId) {
  const units = Array.isArray(capture?.purchase_units)
    ? capture.purchase_units
    : [];
  const expectedUserId = String(userId);
  const expectedAmount = PAYPAL_STUDIO_PRICE;
  const validUnit = units.some((unit) => {
    const unitUserId = String(unit?.custom_id || unit?.reference_id || '');
    const captures = unit?.payments?.captures || [];
    const matchingCapture = captures.some(
      (item) =>
        item?.status === 'COMPLETED' &&
        String(
          item?.amount?.currency_code || unit?.amount?.currency_code || '',
        ).toUpperCase() === PAYPAL_CURRENCY &&
        String(item?.amount?.value || unit?.amount?.value || '') ===
          expectedAmount,
    );
    return (
      (unitUserId === expectedUserId ||
        unitUserId === `viewly-studio-${expectedUserId}`) &&
      matchingCapture
    );
  });
  if (capture?.status !== 'COMPLETED' || !validUnit) {
    const error = new Error('Paiement PayPal non valide pour ce compte.');
    error.status = 400;
    throw error;
  }
}

function getAiProviderConfig() {
  return {
    openai: {
      configured: isConfiguredSecret(OPENAI_API_KEY),
      model: OPENAI_MODEL,
      mode: 'OpenAI Responses API',
    },
    ollama: {
      configured: Boolean(OLLAMA_BASE_URL),
      model: OLLAMA_MODEL,
      mode: 'Ollama /api/chat',
    },
    custom: {
      configured: Boolean(
        CUSTOM_AI_BASE_URL && isConfiguredSecret(CUSTOM_AI_API_KEY),
      ),
      model: CUSTOM_AI_MODEL,
      mode: 'OpenAI-compatible chat completions',
    },
  };
}

function resolveAiProvider(value) {
  const providers = getAiProviderConfig();
  const requested = cleanString(value, 30);
  if (providers[requested]) return requested;
  if (providers[VIEWLY_AI_PROVIDER]?.configured) return VIEWLY_AI_PROVIDER;
  if (providers.openai.configured) return 'openai';
  if (providers.custom.configured) return 'custom';
  return 'ollama';
}

function normalizeAiMessages(input = {}) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const cleaned = messages
    .slice(-20)
    .map((message) => ({
      role: ['system', 'user', 'assistant', 'tool'].includes(message?.role)
        ? message.role
        : 'user',
      content: cleanString(message?.content, 6000),
    }))
    .filter((message) => message.content);

  const prompt = cleanString(input.prompt, 6000);
  if (!cleaned.length && prompt)
    cleaned.push({ role: 'user', content: prompt });
  const system = cleanString(input.system || input.instructions, 2500);
  if (system && !cleaned.some((message) => message.role === 'system'))
    cleaned.unshift({ role: 'system', content: system });
  return cleaned;
}

function extractOpenAiText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

async function fetchJsonWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(3000, Number(AI_TIMEOUT_MS) || 45000),
  );
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        data?.error?.message || data?.message || `Erreur IA ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAi(messages, options = {}) {
  if (!isConfiguredSecret(OPENAI_API_KEY))
    throw createLimitError('OPENAI_API_KEY manquante cote serveur.', 400);
  const model = cleanString(options.model, 80) || OPENAI_MODEL;
  const instructions = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const input = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'tool' ? 'user' : message.role,
      content: message.content,
    }));
  const data = await fetchJsonWithTimeout(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: instructions || undefined,
      input: input.length ? input : cleanString(options.prompt, 6000),
      max_output_tokens: readLimitedNumber(options.maxTokens, 800, 64, 3000),
    }),
  });
  return {
    provider: 'openai',
    model,
    text: extractOpenAiText(data),
    id: data.id || '',
    usage: data.usage || null,
  };
}

async function callOllama(messages, options = {}) {
  const model = cleanString(options.model, 80) || OLLAMA_MODEL;
  const data = await fetchJsonWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: 0.7 },
    }),
  });
  return {
    provider: 'ollama',
    model,
    text: cleanString(data?.message?.content, 12000),
    id: '',
    usage: {
      evalCount: data?.eval_count,
      promptEvalCount: data?.prompt_eval_count,
    },
  };
}

async function callCustomAi(messages, options = {}) {
  if (!CUSTOM_AI_BASE_URL || !isConfiguredSecret(CUSTOM_AI_API_KEY))
    throw createLimitError(
      'CUSTOM_AI_BASE_URL ou CUSTOM_AI_API_KEY manquante cote serveur.',
      400,
    );
  const model = cleanString(options.model, 80) || CUSTOM_AI_MODEL;
  const data = await fetchJsonWithTimeout(
    `${CUSTOM_AI_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CUSTOM_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        max_tokens: readLimitedNumber(options.maxTokens, 800, 64, 3000),
      }),
    },
  );
  return {
    provider: 'custom',
    model,
    text: cleanString(data?.choices?.[0]?.message?.content, 12000),
    id: data.id || '',
    usage: data.usage || null,
  };
}

async function callAiProvider(provider, messages, options = {}) {
  if (provider === 'openai') return callOpenAi(messages, options);
  if (provider === 'custom') return callCustomAi(messages, options);
  return callOllama(messages, options);
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearerToken =
    ENABLE_BEARER_AUTH && header.startsWith('Bearer ') ? header.slice(7) : '';
  const token = bearerToken || req.cookies?.[SESSION_COOKIE];
  if (!token)
    return res.status(401).json({ message: 'Authentification requise.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await usersDb.findOne({ id: payload.sub });
    if (!user) return res.status(401).json({ message: 'Session invalide.' });
    req.user = user;
    next();
  } catch {
    clearAuthSession(res);
    res.status(401).json({ message: 'Token invalide ou expire.' });
  }
}

function adminOnly(req, res, next) {
  if (normalizeRole(req.user?.role) !== 'admin')
    return res.status(403).json({ message: 'Acces admin requis.' });
  next();
}

function staffOnly(req, res, next) {
  if (!isStaffRole(req.user?.role))
    return res.status(403).json({ message: 'Acces equipe requis.' });
  next();
}

function saveAvatarFromDataUrl(dataUrl, userId) {
  const match = String(dataUrl || '').match(
    /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/,
  );
  if (!match) throw new Error("Format d'image non supporte.");
  const mime = match[1];
  const ext = mime.includes('png')
    ? 'png'
    : mime.includes('webp')
      ? 'webp'
      : 'jpg';
  const base64 = match[3];
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 5 * 1024 * 1024)
    throw new Error('Image trop volumineuse (max 5 MB).');
  const signatureOk =
    (ext === 'png' &&
      buffer
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        )) ||
    (ext === 'jpg' &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9) ||
    (ext === 'webp' &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP');
  if (!signatureOk) throw new Error('Signature image invalide.');
  const filename = `avatar-${String(userId).replace(/[^a-z0-9_-]/gi, '')}-${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

async function getSiteSettings() {
  const doc = await settingsDb.findOne({ key: 'site-settings' });
  const value = { ...DEFAULT_SETTINGS, ...(doc?.value || {}) };
  return {
    ...value,
    contentBlocks: normalizeContentBlocks(value.contentBlocks),
  };
}

async function setSiteSettings(next) {
  const current = await getSiteSettings();
  const value = { ...DEFAULT_SETTINGS, ...current, ...next };
  value.contentBlocks = normalizeContentBlocks(value.contentBlocks);
  const existing = await settingsDb.findOne({ key: 'site-settings' });
  if (existing)
    await settingsDb.update(
      { _id: existing._id },
      { $set: { value, updatedAt: new Date().toISOString() } },
    );
  else
    await settingsDb.insert({
      key: 'site-settings',
      value,
      updatedAt: new Date().toISOString(),
    });
  return value;
}

function trackSignature(track) {
  return track?.youtubeId || `${track?.title || ''}::${track?.artist || ''}`;
}

async function ensureIndexes() {
  await Promise.all([
    usersDb.ensureIndex({ fieldName: 'id', unique: true }),
    usersDb.ensureIndex({ fieldName: 'email', unique: true }),
    playlistsDb.ensureIndex({ fieldName: 'userId' }),
    playlistsDb.ensureIndex({ fieldName: 'updatedAt' }),
    tracksDb.ensureIndex({ fieldName: 'youtubeId' }),
    tracksDb.ensureIndex({ fieldName: 'updatedAt' }),
    historyDb.ensureIndex({ fieldName: 'userId' }),
    historyDb.ensureIndex({ fieldName: 'signature' }),
    historyDb.ensureIndex({ fieldName: 'lastPlayedAt' }),
    favoritesDb.ensureIndex({ fieldName: 'userId' }),
    favoritesDb.ensureIndex({ fieldName: 'youtubeId' }),
    favoritesDb.ensureIndex({ fieldName: 'createdAt' }),
    aiUsageDb.ensureIndex({ fieldName: 'userId' }),
    aiUsageDb.ensureIndex({ fieldName: 'dayKey' }),
  ]);
}

async function getUsageSnapshot(user) {
  if (!user?.id)
    return { playlists: 0, favorites: 0, aiToday: 0, limits: PLAN_LIMITS.Free };
  const dayKey = getDayKey();
  const [playlists, favorites, aiDocs] = await Promise.all([
    playlistsDb.count({ userId: user.id }),
    favoritesDb.count({ userId: user.id }),
    aiUsageDb.find({ userId: user.id, dayKey }),
  ]);
  return {
    playlists,
    favorites,
    aiToday: aiDocs.reduce((sum, item) => sum + Number(item.count || 0), 0),
    limits: getAccessPolicy(user).limits,
    dayKey,
  };
}

async function assertCanCreatePlaylist(user) {
  const policy = getAccessPolicy(user);
  const count = await playlistsDb.count({ userId: user.id });
  if (count >= policy.limits.playlists) {
    throw createLimitError(
      `Limite du plan ${policy.plan}: ${policy.limits.playlists} playlists maximum.`,
    );
  }
}

function assertTracksWithinLimit(user, tracks) {
  const policy = getAccessPolicy(user);
  if (tracks.length > policy.limits.tracksPerPlaylist) {
    throw createLimitError(
      `Limite du plan ${policy.plan}: ${policy.limits.tracksPerPlaylist} titres par playlist.`,
    );
  }
}

async function assertCanAddFavorite(user) {
  const policy = getAccessPolicy(user);
  const count = await favoritesDb.count({ userId: user.id });
  if (count >= policy.limits.favorites) {
    throw createLimitError(
      `Limite du plan ${policy.plan}: ${policy.limits.favorites} favoris maximum.`,
    );
  }
}

async function assertCanUseAi(user, provider) {
  const policy = getAccessPolicy(user);
  if (!policy.canUseAi) {
    throw createLimitError(
      'Le plan Free ne peut pas utiliser les generations IA. Passe en Studio ou utilise un compte associe.',
    );
  }
  const usage = await getUsageSnapshot(user);
  if (usage.aiToday >= policy.limits.aiRequestsPerDay) {
    throw createLimitError(
      `Quota IA atteint pour aujourd'hui (${policy.limits.aiRequestsPerDay} requetes).`,
    );
  }
  const providers = getAiProviderConfig();
  if (!providers[provider]?.configured)
    throw createLimitError(
      `Provider IA "${provider}" non configure cote serveur.`,
      400,
    );
}

async function bumpAiUsage(user, provider) {
  const dayKey = getDayKey();
  const existing = await aiUsageDb.findOne({
    userId: user.id,
    dayKey,
    provider,
  });
  const now = new Date().toISOString();
  if (existing) {
    const count = Number(existing.count || 0) + 1;
    await aiUsageDb.update(
      { _id: existing._id },
      { $set: { count, updatedAt: now } },
    );
    return count;
  }
  await aiUsageDb.insert({
    id: createPublicId('aiuse'),
    userId: user.id,
    dayKey,
    provider,
    count: 1,
    createdAt: now,
    updatedAt: now,
  });
  return 1;
}

async function logPlay(userId, track) {
  const normalized = normalizeTrack(track);
  if (!normalized) return null;
  await upsertCatalogTrack(normalized);
  const now = new Date().toISOString();
  const existing = await historyDb.findOne({
    userId,
    signature: trackSignature(normalized),
  });
  if (existing) {
    const nextCount = Number(existing.playCount || 0) + 1;
    await historyDb.update(
      { _id: existing._id },
      {
        $set: {
          ...existing,
          track: normalized,
          playCount: nextCount,
          lastPlayedAt: now,
        },
      },
    );
    return {
      ...existing,
      track: normalized,
      playCount: nextCount,
      lastPlayedAt: now,
    };
  }
  return historyDb.insert({
    id: createPublicId('hist'),
    userId,
    signature: trackSignature(normalized),
    track: normalized,
    playCount: 1,
    firstPlayedAt: now,
    lastPlayedAt: now,
  });
}

function addWeighted(map, rawName, weight = 1) {
  const name = cleanString(rawName, 80);
  if (!name) return;
  map.set(name, (map.get(name) || 0) + weight);
}

function rankMap(map, limit = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count: Math.round(count * 10) / 10 }));
}

function inferTrackStyles(track) {
  const blob =
    `${track?.title || ''} ${track?.artist || ''} ${track?.tag || ''}`.toLowerCase();
  const styles = [];
  if (/(rap|hip.?hop|trap|drill)/i.test(blob)) styles.push('hip-hop');
  if (/(electro|edm|dance|club|house|techno|funk|disco)/i.test(blob))
    styles.push('dance');
  if (/(pop|hit|radio)/i.test(blob)) styles.push('pop');
  if (/(jazz|soul|r&b|rnb|blues)/i.test(blob)) styles.push('soul');
  if (/(ambient|lo.?fi|chill|acoustic|calm|piano)/i.test(blob))
    styles.push('chill');
  if (/(rock|metal|punk|guitar)/i.test(blob)) styles.push('rock');
  if (/(fr|french|france|variete)/i.test(blob)) styles.push('francophone');
  return styles.length ? styles : ['eclectique'];
}

function scoreEnergy(blob) {
  let score = 0;
  if (
    /(party|dance|club|energy|funk|hit|max|edm|techno|drill|trap)/i.test(blob)
  )
    score += 4;
  if (/(ambient|soul|acoustic|calm|sleep|lo.?fi|piano|mood)/i.test(blob))
    score -= 3;
  return score;
}

function scoreTrackMood(blob, mood) {
  const energetic =
    /(party|dance|club|energy|funk|hit|max|edm|techno|drill|trap)/i.test(blob);
  const chill = /(ambient|soul|acoustic|calm|sleep|lo.?fi|piano|mood)/i.test(
    blob,
  );
  if (mood === 'energique') return energetic ? 3 : chill ? -1 : 0;
  if (mood === 'chill') return chill ? 3 : energetic ? -1 : 0;
  return energetic || chill ? 1 : 0.5;
}

async function getRecommendationsForUser(userId, limit = 12) {
  const safeLimit = readLimitedNumber(limit, 12, 1, 30);
  const [profile, history, favorites, playlists, catalogDocs] =
    await Promise.all([
      getTasteProfile(userId),
      historyDb
        .find({ userId })
        .sort({ lastPlayedAt: -1 })
        .limit(TASTE_HISTORY_LIMIT),
      favoritesDb
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(TASTE_FAVORITES_LIMIT),
      playlistsDb
        .find({ userId })
        .sort({ updatedAt: -1 })
        .limit(TASTE_PLAYLIST_LIMIT),
      tracksDb
        .find({})
        .sort({ updatedAt: -1 })
        .limit(RECOMMENDATION_CATALOG_LIMIT),
    ]);

  const playedIds = new Set(
    history
      .map((entry) => entry.track?.youtubeId || entry.signature)
      .filter(Boolean),
  );
  const favoriteIds = new Set(
    favorites
      .map((item) => item.youtubeId || item.track?.youtubeId)
      .filter(Boolean),
  );
  const playlistIds = new Set(
    playlists
      .flatMap((item) =>
        (item.tracks || [])
          .slice(0, 40)
          .map((track) => track.youtubeId || track.id),
      )
      .filter(Boolean),
  );
  const topArtists = new Map(
    (profile.topArtists || []).map((item, index) => [
      item.name.toLowerCase(),
      7 - index,
    ]),
  );
  const topTags = new Map(
    (profile.topTags || []).map((item, index) => [
      item.name.toLowerCase(),
      5 - index,
    ]),
  );
  const topStyles = new Map(
    (profile.topStyles || []).map((item, index) => [
      item.name.toLowerCase(),
      4 - index,
    ]),
  );
  const preferredMood = profile.mood || 'equilibre';

  const seen = new Set();
  const scored = catalogDocs
    .map(normalizeTrack)
    .filter(Boolean)
    .filter((track) => {
      const key = track.youtubeId || track.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((track) => {
      const key = track.youtubeId || track.id;
      const blob = `${track.title} ${track.artist} ${track.tag}`.toLowerCase();
      let score = 1;
      if (!playedIds.has(key)) score += 5;
      if (favoriteIds.has(key)) score -= 10;
      if (playlistIds.has(key)) score += 1.5;
      score += topArtists.get(String(track.artist || '').toLowerCase()) || 0;
      score += topTags.get(String(track.tag || '').toLowerCase()) || 0;
      for (const style of inferTrackStyles(track))
        score += topStyles.get(style) || 0;
      score += scoreTrackMood(blob, preferredMood);
      if (track.source === 'seed') score += 0.4;
      return { track, score };
    })
    .sort((a, b) => b.score - a.score);

  const recommendations = scored
    .filter((item) => !playedIds.has(item.track.youtubeId || item.track.id))
    .slice(0, safeLimit)
    .map((item) => item.track);

  if (recommendations.length >= safeLimit) return recommendations;
  const used = new Set(
    recommendations.map((track) => track.youtubeId || track.id),
  );
  const fallback = scored
    .map((item) => item.track)
    .filter((track) => !used.has(track.youtubeId || track.id))
    .slice(0, safeLimit - recommendations.length);
  return [...recommendations, ...fallback];
}

async function getTasteProfile(userId) {
  const [history, favorites, playlists] = await Promise.all([
    historyDb
      .find({ userId })
      .sort({ lastPlayedAt: -1 })
      .limit(TASTE_HISTORY_LIMIT),
    favoritesDb
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(TASTE_FAVORITES_LIMIT),
    playlistsDb
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(TASTE_PLAYLIST_LIMIT),
  ]);

  const artistCount = new Map();
  const tagCount = new Map();
  const styleCount = new Map();
  const sampledIds = new Set();
  let energyScore = 50;

  function addTrack(track, weight = 1) {
    const normalized = normalizeTrack(track);
    if (!normalized) return;
    const key = normalized.youtubeId || normalized.id;
    if (key) sampledIds.add(key);
    addWeighted(artistCount, normalized.artist, weight);
    addWeighted(tagCount, normalized.tag, weight);
    inferTrackStyles(normalized).forEach((style) =>
      addWeighted(styleCount, style, weight),
    );
    energyScore +=
      scoreEnergy(
        `${normalized.title} ${normalized.artist} ${normalized.tag}`.toLowerCase(),
      ) * weight;
  }

  history.forEach((entry, index) => {
    const recency = Math.max(
      0.35,
      1 - index / Math.max(1, TASTE_HISTORY_LIMIT),
    );
    const plays = Math.min(6, Number(entry.playCount || 1));
    addTrack(entry.track, recency * (1 + plays * 0.35));
  });

  favorites.forEach((item) => addTrack(item.track, 2.4));
  playlists.forEach((playlist, index) => {
    const weight = Math.max(0.4, 1.5 - index * 0.05);
    (playlist.tracks || [])
      .slice(0, 30)
      .forEach((track) => addTrack(track, weight));
  });

  const topArtists = rankMap(artistCount, 5);
  const topTags = rankMap(tagCount, 5);
  const topStyles = rankMap(styleCount, 5);
  const totalPlays = history.reduce(
    (sum, entry) => sum + Number(entry.playCount || 1),
    0,
  );
  const sampleSize = sampledIds.size;

  energyScore = Math.max(0, Math.min(100, Math.round(energyScore)));
  const diversityScore = Math.max(
    20,
    Math.min(
      100,
      Math.round(
        artistCount.size * 10 + tagCount.size * 7 + styleCount.size * 8,
      ),
    ),
  );
  const discoveryScore = Math.max(
    15,
    Math.min(
      100,
      Math.round(
        28 + favorites.length * 4 + playlists.length * 3 + sampleSize * 1.5,
      ),
    ),
  );
  const mood =
    energyScore >= 68 ? 'energique' : energyScore <= 40 ? 'chill' : 'equilibre';
  const confidence = Math.max(
    0,
    Math.min(100, Math.round((sampleSize / 18) * 100)),
  );

  let summary = 'Commence a ecouter pour construire ton profil musical.';
  if (topArtists.length) {
    summary = `Tu reviens souvent vers ${topArtists[0].name}`;
    if (topTags.length)
      summary += ` avec une dominante ${topTags[0].name.toLowerCase()}`;
    if (topStyles.length) summary += ` et une couleur ${topStyles[0].name}`;
    summary += '.';
  }

  return {
    mood,
    summary,
    energyScore,
    diversityScore,
    discoveryScore,
    confidence,
    sampleSize,
    topArtists,
    topTags,
    topStyles,
    totalPlays,
    totalFavorites: favorites.length,
    playlists: playlists.length,
  };
}

async function getFavoriteSet(userId) {
  const docs = await favoritesDb
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(FAVORITE_LIST_LIMIT);
  return docs
    .map((doc) => String(doc.youtubeId || doc.trackId || ''))
    .filter(Boolean);
}

async function toggleFavorite(userOrId, track) {
  const user =
    typeof userOrId === 'object'
      ? userOrId
      : { id: userOrId, role: 'user', plan: 'Free' };
  const userId = user.id;
  const normalized = normalizeTrack(track);
  if (!normalized?.youtubeId) throw new Error('Track invalide pour favoris.');
  const existing = await favoritesDb.findOne({
    userId,
    youtubeId: normalized.youtubeId,
  });
  if (existing) {
    await favoritesDb.remove({ _id: existing._id }, {});
    return { liked: false, track: normalized };
  }
  await assertCanAddFavorite(user);
  await favoritesDb.insert({
    id: createPublicId('fav'),
    userId,
    youtubeId: normalized.youtubeId,
    trackId: normalized.id,
    track: normalized,
    createdAt: new Date().toISOString(),
  });
  await upsertCatalogTrack(normalized);
  return { liked: true, track: normalized };
}

async function getAdminAnalytics() {
  const [users, playlists, tracks, history, favorites, aiUsage] =
    await Promise.all([
      usersDb.find({}).sort({ createdAt: -1 }).limit(ADMIN_ANALYTICS_LIMIT),
      playlistsDb.find({}).sort({ updatedAt: -1 }).limit(ADMIN_ANALYTICS_LIMIT),
      tracksDb.find({}).sort({ updatedAt: -1 }).limit(ADMIN_ANALYTICS_LIMIT),
      historyDb
        .find({})
        .sort({ lastPlayedAt: -1 })
        .limit(ADMIN_ANALYTICS_LIMIT),
      favoritesDb.find({}).sort({ createdAt: -1 }).limit(ADMIN_ANALYTICS_LIMIT),
      aiUsageDb.find({}).sort({ updatedAt: -1 }).limit(ADMIN_ANALYTICS_LIMIT),
    ]);
  const topTracks = history.reduce((acc, entry) => {
    const key = entry.signature || entry.track?.youtubeId || entry.track?.id;
    if (!key) return acc;
    const current = acc.get(key) || { track: entry.track, plays: 0 };
    current.plays += Number(entry.playCount || 1);
    acc.set(key, current);
    return acc;
  }, new Map());
  const topTrackItems = [...topTracks.values()]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 8);
  const planMix = {
    free: users.filter((user) => user.plan === 'Free').length,
    studio: users.filter((user) => user.plan === 'Studio').length,
  };
  const roles = {
    admins: users.filter((user) => normalizeRole(user.role) === 'admin').length,
    associates: users.filter((user) => normalizeRole(user.role) === 'associate')
      .length,
    users: users.filter((user) => normalizeRole(user.role) === 'user').length,
  };
  const today = getDayKey();
  return {
    totals: {
      users: users.length,
      playlists: playlists.length,
      tracks: tracks.length,
      plays: history.length,
      favorites: favorites.length,
      aiRequestsToday: aiUsage
        .filter((item) => item.dayKey === today)
        .reduce((sum, item) => sum + Number(item.count || 0), 0),
    },
    planMix,
    roles,
    aiProviders: getAiProviderConfig(),
    recentAiUsage: aiUsage.slice(0, 10).map((item) => ({
      userId: item.userId,
      dayKey: item.dayKey,
      provider: item.provider,
      count: item.count,
      updatedAt: item.updatedAt,
    })),
    recentUsers: users.slice(0, 5).map(publicUser),
    latestPlaylists: playlists.slice(0, 5).map(publicPlaylist),
    topTracks: topTrackItems,
  };
}

async function getDiscoveryFeed(limit = 12) {
  const readLimit = Math.max(limit * 3, 24);
  const catalog = (
    await tracksDb.find({}).sort({ updatedAt: -1 }).limit(readLimit)
  )
    .map(normalizeTrack)
    .filter(Boolean);
  const hot = catalog.slice(0, limit);
  const editors = catalog
    .filter((item) => /seed|youtube/i.test(item.source || ''))
    .slice(0, limit);
  return { hot, editors };
}

async function ensureSeed() {
  const now = new Date().toISOString();
  const userCount = await usersDb.count({});
  if (userCount === 0) {
    if (isProduction) {
      const adminEmail = cleanString(
        process.env.ADMIN_EMAIL,
        200,
      ).toLowerCase();
      const adminPassword = String(process.env.ADMIN_PASSWORD || '');
      const passwordError = ensurePasswordPolicy(adminPassword);
      if (!adminEmail || !isValidEmail(adminEmail) || passwordError) {
        if (isVercel) {
          console.warn(
            'Production bootstrap: ADMIN_EMAIL/ADMIN_PASSWORD absents ou invalides. Aucun admin seed cree.',
          );
        } else {
          throw new Error(
            'ADMIN_EMAIL et ADMIN_PASSWORD valides sont requis pour initialiser la production.',
          );
        }
      } else {
        await usersDb.insert({
          id: createPublicId('usr'),
          name: cleanString(process.env.ADMIN_NAME, 100) || 'Viewly Admin',
          email: adminEmail,
          passwordHash: await bcrypt.hash(adminPassword, 12),
          role: 'admin',
          plan: 'Studio',
          status: 'active',
          avatarUrl: '',
          bio: 'Admin Viewly',
          preferences: DEFAULT_USER_PREFERENCES,
          createdAt: now,
          lastLoginAt: null,
        });
      }
    } else if (SEED_DEMO_DATA) {
      const demoAdminPassword = String(process.env.DEMO_ADMIN_PASSWORD || '');
      const demoUserPassword = String(process.env.DEMO_USER_PASSWORD || '');
      if (!demoAdminPassword || !demoUserPassword) {
        throw new Error(
          'DEMO_ADMIN_PASSWORD et DEMO_USER_PASSWORD sont requis quand SEED_DEMO_DATA=true.',
        );
      }
      await usersDb.insert([
        {
          id: 1,
          name: 'Gabin Admin',
          email: 'admin@viewly.local',
          passwordHash: await bcrypt.hash(demoAdminPassword, 10),
          role: 'admin',
          plan: 'Studio',
          status: 'active',
          avatarUrl: '',
          bio: 'Admin Viewly',
          preferences: DEFAULT_USER_PREFERENCES,
          createdAt: now,
          lastLoginAt: null,
        },
        {
          id: 2,
          name: 'Lina Demo',
          email: 'lina@viewly.local',
          passwordHash: await bcrypt.hash(demoUserPassword, 10),
          role: 'user',
          plan: 'Free',
          status: 'active',
          avatarUrl: '',
          bio: 'Compte de demonstration',
          preferences: DEFAULT_USER_PREFERENCES,
          createdAt: now,
          lastLoginAt: null,
        },
      ]);
    }
  }

  const demoTracks = [
    {
      id: 'seed-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      duration: 200,
      emoji: '',
      youtubeId: '4NRXx6U8ABQ',
      thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
      gradient: 'linear-gradient(135deg,#0b7a5c,#10203c)',
      tag: 'YouTube Hit',
      source: 'seed',
    },
    {
      id: 'seed-2',
      title: 'Alors on danse',
      artist: 'Stromae',
      duration: 208,
      emoji: '',
      youtubeId: 'VHoT4N43jK8',
      thumbnail: 'https://i.ytimg.com/vi/VHoT4N43jK8/hqdefault.jpg',
      gradient: 'linear-gradient(135deg,#0d8e72,#16396b)',
      tag: 'Clip officiel',
      source: 'seed',
    },
    {
      id: 'seed-3',
      title: 'One More Time',
      artist: 'Daft Punk',
      duration: 320,
      emoji: '',
      youtubeId: 'FGBhQbmPwH8',
      thumbnail: 'https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg',
      gradient: 'linear-gradient(135deg,#11a37f,#1b2c54)',
      tag: 'Classic club',
      source: 'seed',
    },
    {
      id: 'seed-4',
      title: 'bad guy',
      artist: 'Billie Eilish',
      duration: 194,
      emoji: '',
      youtubeId: 'DyDfgMOUjCI',
      thumbnail: 'https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg',
      gradient: 'linear-gradient(135deg,#1a9d7f,#0f264a)',
      tag: 'Pop mood',
      source: 'seed',
    },
    {
      id: 'seed-5',
      title: 'Derniere Danse',
      artist: 'Indila',
      duration: 212,
      emoji: '',
      youtubeId: 'K5KAc5CoCuk',
      thumbnail: 'https://i.ytimg.com/vi/K5KAc5CoCuk/hqdefault.jpg',
      gradient: 'linear-gradient(135deg,#19a27b,#14335e)',
      tag: 'French touch',
      source: 'seed',
    },
  ];

  const playlistCount = await playlistsDb.count({});
  if (SEED_DEMO_DATA && playlistCount === 0) {
    const now = new Date().toISOString();
    await playlistsDb.insert([
      {
        id: Date.now() + 10,
        userId: 1,
        title: 'Admin picks',
        description: 'Selection de depart cote admin.',
        cover: demoTracks[0].thumbnail,
        createdAt: now,
        updatedAt: now,
        tracks: demoTracks.slice(0, 3),
      },
      {
        id: Date.now() + 11,
        userId: 2,
        title: 'Lina favorites',
        description: 'Petite playlist de demonstration.',
        cover: demoTracks[1].thumbnail,
        createdAt: now,
        updatedAt: now,
        tracks: [demoTracks[1], demoTracks[4]],
      },
    ]);
  }

  const settingsCount = await settingsDb.count({});
  if (settingsCount === 0)
    await settingsDb.insert({
      key: 'site-settings',
      value: DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    });

  if (!SEED_DEMO_DATA) return;

  for (const track of demoTracks) await upsertCatalogTrack(track, 'seed');
  await logPlay(2, demoTracks[1]);
  await logPlay(2, demoTracks[4]);
  if ((await favoritesDb.count({})) === 0) {
    await favoritesDb.insert([
      {
        id: Date.now() + 30,
        userId: 2,
        youtubeId: demoTracks[1].youtubeId,
        trackId: demoTracks[1].id,
        track: demoTracks[1],
        createdAt: now,
      },
      {
        id: Date.now() + 31,
        userId: 2,
        youtubeId: demoTracks[4].youtubeId,
        trackId: demoTracks[4].id,
        track: demoTracks[4],
        createdAt: now,
      },
    ]);
  }
}

app.get('/api/health', async (_req, res) => {
  if (isProduction) {
    return res.json({
      ok: true,
      youtubeConfigured: isConfiguredSecret(YOUTUBE_API_KEY),
      aiProviders: getAiProviderConfig(),
      env: 'production',
    });
  }
  res.json({
    ok: true,
    users: await usersDb.count({}),
    playlists: await playlistsDb.count({}),
    tracks: await tracksDb.count({}),
    history: await historyDb.count({}),
    favorites: await favoritesDb.count({}),
    youtubeConfigured: isConfiguredSecret(YOUTUBE_API_KEY),
    aiProviders: getAiProviderConfig(),
  });
});

app.get('/api/settings/public', async (_req, res) => {
  res.json({ settings: await getSiteSettings() });
});

app.get('/api/billing/paypal/config', async (_req, res) => {
  res.json({
    configured: isPayPalConfigured(),
    clientId: PAYPAL_CLIENT_ID,
    currency: PAYPAL_CURRENCY,
    environment: PAYPAL_ENV,
    plan: 'Studio',
    amount: PAYPAL_STUDIO_PRICE,
  });
});

app.get('/api/settings/admin', auth, staffOnly, async (_req, res) => {
  res.json({ settings: await getSiteSettings() });
});

app.patch('/api/settings/admin', auth, staffOnly, async (req, res) => {
  const allowed = Object.keys(DEFAULT_SETTINGS);
  const next = {};
  for (const key of allowed) {
    if (typeof req.body?.[key] === 'string')
      next[key] = cleanString(req.body[key], 280);
  }
  if (Array.isArray(req.body?.contentBlocks))
    next.contentBlocks = normalizeContentBlocks(req.body.contentBlocks);
  const settings = await setSiteSettings(next);
  res.json({ settings });
});

app.get('/api/auth/csrf', async (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const name = cleanString(req.body?.name, 100);
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const password = String(req.body?.password || '');
  if (!name || !email || !password)
    return res
      .status(400)
      .json({ message: 'Nom, email et mot de passe requis.' });
  if (!isValidEmail(email))
    return res.status(400).json({ message: 'Email invalide.' });
  const passwordError = ensurePasswordPolicy(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  const exists = await usersDb.findOne({ email });
  if (exists)
    return res.status(409).json({ message: 'Cet email existe deja.' });

  const now = new Date().toISOString();
  const user = {
    id: createPublicId('usr'),
    name,
    email,
    passwordHash: await bcrypt.hash(password, isProduction ? 12 : 10),
    role: 'user',
    plan: 'Free',
    status: 'active',
    avatarUrl: '',
    bio: '',
    preferences: DEFAULT_USER_PREFERENCES,
    createdAt: now,
    lastLoginAt: now,
  };
  await usersDb.insert(user);
  await playlistsDb.insert({
    id: createPublicId('pl'),
    userId: user.id,
    title: 'Mes decouvertes',
    description: 'Ta premiere playlist Viewly.',
    cover: '',
    createdAt: now,
    updatedAt: now,
    tracks: [],
  });
  issueAuthSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password)
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  const user = await usersDb.findOne({ email });
  if (!user)
    return res
      .status(401)
      .json({ message: 'Email ou mot de passe incorrect.' });
  if (user.status !== 'active')
    return res.status(403).json({ message: 'Compte suspendu.' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok)
    return res
      .status(401)
      .json({ message: 'Email ou mot de passe incorrect.' });
  const lastLoginAt = new Date().toISOString();
  await usersDb.update({ id: user.id }, { $set: { lastLoginAt } });
  issueAuthSession(res, { ...user, lastLoginAt });
  res.json({ user: publicUser({ ...user, lastLoginAt }) });
});

app.get('/api/auth/me', auth, async (req, res) =>
  res.json({ user: publicUser(req.user) }),
);

app.post('/api/auth/logout', async (_req, res) => {
  clearAuthSession(res);
  res.json({ ok: true });
});

app.get('/api/me/usage', auth, async (req, res) => {
  res.json({
    usage: await getUsageSnapshot(req.user),
    access: getAccessPolicy(req.user),
  });
});

app.get('/api/ai/config', auth, async (req, res) => {
  res.json({
    providers: getAiProviderConfig(),
    defaultProvider: resolveAiProvider(),
    access: getAccessPolicy(req.user),
    usage: await getUsageSnapshot(req.user),
  });
});

app.post('/api/ai/chat', auth, async (req, res) => {
  const provider = resolveAiProvider(req.body?.provider);
  const messages = normalizeAiMessages(req.body);
  if (!messages.length)
    return res.status(400).json({ message: 'Prompt IA requis.' });
  await assertCanUseAi(req.user, provider);
  const result = await callAiProvider(provider, messages, {
    model: req.body?.model,
    maxTokens: req.body?.maxTokens,
    prompt: req.body?.prompt,
  });
  await bumpAiUsage(req.user, result.provider);
  res.json({ ...result, usage: await getUsageSnapshot(req.user) });
});

app.post('/api/ai/studio/generate', auth, async (req, res) => {
  const provider = resolveAiProvider(req.body?.provider);
  await assertCanUseAi(req.user, provider);
  const styles = Array.isArray(req.body?.styles)
    ? req.body.styles
        .map((item) => cleanString(item, 60))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const mood = cleanString(req.body?.mood, 80) || 'equilibre';
  const prompt =
    cleanString(req.body?.prompt, 1400) ||
    `Creer une idee musicale ${styles[0] || 'pop'} ${mood}.`;
  const messages = normalizeAiMessages({
    system:
      'Tu es un directeur artistique musical pour Viewly. Reponds uniquement en JSON strict, sans markdown.',
    prompt: [
      'Genere une idee de morceau exploitable dans un studio musical.',
      `Prompt utilisateur: ${prompt}`,
      `Styles: ${styles.join(', ') || 'libre'}`,
      `Humeur: ${mood}`,
      'Format JSON: {"title":"titre court","description":"description courte","style":"style principal","tags":["tag1","tag2","tag3"]}',
    ].join('\n'),
  });
  const result = await callAiProvider(provider, messages, {
    model: req.body?.model,
    maxTokens: 700,
  });
  await bumpAiUsage(req.user, result.provider);
  const parsed = extractJsonObject(result.text) || {};
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((item) => cleanString(item, 40))
        .filter(Boolean)
        .slice(0, 5)
    : styles.slice(0, 3);
  const idea = {
    title:
      cleanString(parsed.title, 80) ||
      cleanString(prompt, 28) ||
      'Viewly Studio',
    description:
      cleanString(parsed.description, 420) || result.text.slice(0, 260),
    style: cleanString(parsed.style, 80) || styles[0] || 'Studio IA',
    tags,
    mood,
  };
  res.json({
    idea,
    rawText: result.text,
    provider: result.provider,
    model: result.model,
    usage: await getUsageSnapshot(req.user),
  });
});

app.get('/api/discover', async (req, res) => {
  const limit = readLimitedNumber(req.query?.limit, 8, 1, 20);
  res.json(await getDiscoveryFeed(limit));
});

app.get('/api/favorites', auth, async (req, res) => {
  const items = await favoritesDb
    .find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(FAVORITE_LIST_LIMIT);
  res.json({
    items: items.map((item) => normalizeTrack(item.track)).filter(Boolean),
    ids: await getFavoriteSet(req.user.id),
  });
});

app.post('/api/favorites/toggle', auth, async (req, res) => {
  try {
    const result = await toggleFavorite(req.user, req.body?.track);
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

app.get('/api/admin/analytics', auth, adminOnly, async (_req, res) => {
  res.json(await getAdminAnalytics());
});

app.patch('/api/auth/profile', auth, async (req, res) => {
  const patch = {};
  const name = cleanString(req.body?.name, 100);
  const bio = cleanString(req.body?.bio, 500);
  const password =
    typeof req.body?.password === 'string' ? req.body.password.trim() : '';
  const avatarDataUrl =
    typeof req.body?.avatarDataUrl === 'string' ? req.body.avatarDataUrl : '';
  if (name) patch.name = name;
  if (typeof req.body?.bio === 'string') patch.bio = bio;
  if (password) {
    const passwordError = ensurePasswordPolicy(password);
    if (passwordError) return res.status(400).json({ message: passwordError });
    patch.passwordHash = await bcrypt.hash(password, isProduction ? 12 : 10);
  }
  if (avatarDataUrl) {
    try {
      patch.avatarUrl = saveAvatarFromDataUrl(avatarDataUrl, req.user.id);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
  if (
    req.body?.preferences &&
    typeof req.body.preferences === 'object' &&
    !Array.isArray(req.body.preferences)
  ) {
    patch.preferences = normalizePreferences({
      ...req.user.preferences,
      ...req.body.preferences,
    });
  }
  await usersDb.update({ id: req.user.id }, { $set: patch });
  const fresh = await usersDb.findOne({ id: req.user.id });
  res.json({ user: publicUser(fresh) });
});

app.patch('/api/billing/plan', auth, async (req, res) => {
  const plan = req.body?.plan === 'Studio' ? 'Studio' : 'Free';
  if (
    !ENABLE_SELF_SERVICE_BILLING &&
    plan === 'Studio' &&
    req.user.plan !== 'Studio'
  ) {
    return res.status(403).json({
      message:
        'La facturation self-service doit etre branchee avant de passer en Studio en production.',
    });
  }
  await usersDb.update({ id: req.user.id }, { $set: { plan } });
  const fresh = await usersDb.findOne({ id: req.user.id });
  res.json({ user: publicUser(fresh) });
});

app.post('/api/billing/paypal/orders', auth, async (req, res) => {
  if (req.body?.plan !== 'Studio')
    return res.status(400).json({ message: 'Plan PayPal invalide.' });
  if (!isPayPalConfigured())
    return res
      .status(400)
      .json({ message: "PayPal n'est pas encore configure." });

  const order = await paypalRequest('/v2/checkout/orders', {
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `viewly-studio-${req.user.id}`,
          custom_id: String(req.user.id),
          description: 'Viewly Studio monthly access',
          amount: {
            currency_code: PAYPAL_CURRENCY,
            value: PAYPAL_STUDIO_PRICE,
          },
        },
      ],
      application_context: {
        brand_name: 'Viewly',
        user_action: 'PAY_NOW',
      },
    },
  });
  res.status(201).json({ id: order.id });
});

app.post(
  '/api/billing/paypal/orders/:orderId/capture',
  auth,
  async (req, res) => {
    const orderId = cleanString(req.params.orderId, 40).toUpperCase();
    if (!/^[A-Z0-9]{6,36}$/.test(orderId))
      return res.status(400).json({ message: 'Commande PayPal invalide.' });
    if (!isPayPalConfigured())
      return res
        .status(400)
        .json({ message: "PayPal n'est pas encore configure." });

    const capture = await paypalRequest(
      `/v2/checkout/orders/${orderId}/capture`,
    );
    validatePayPalCapture(capture, req.user.id);

    await usersDb.update({ id: req.user.id }, { $set: { plan: 'Studio' } });
    const fresh = await usersDb.findOne({ id: req.user.id });
    res.json({ capture, user: publicUser(fresh) });
  },
);

app.get('/api/admin/users', auth, adminOnly, async (_req, res) => {
  const [users, total, admins, associates, premium, free, active] =
    await Promise.all([
      usersDb.find({}).sort({ createdAt: -1 }).limit(ADMIN_ANALYTICS_LIMIT),
      usersDb.count({}),
      usersDb.count({ role: 'admin' }),
      usersDb.count({ role: 'associate' }),
      usersDb.count({ plan: 'Studio' }),
      usersDb.count({ plan: 'Free' }),
      usersDb.count({ status: 'active' }),
    ]);
  const stats = { total, admins, associates, premium, free, active };
  res.json({ users: users.map(publicUser), stats });
});

app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  const name = cleanString(req.body?.name, 100);
  const email = cleanString(req.body?.email, 200).toLowerCase();
  const password = String(req.body?.password || '');
  const role = normalizeRole(req.body?.role);
  const plan = normalizePlan(req.body?.plan);
  const status = req.body?.status === 'paused' ? 'paused' : 'active';
  if (!name || !email || !password)
    return res
      .status(400)
      .json({ message: 'Nom, email et mot de passe requis.' });
  if (!isValidEmail(email))
    return res.status(400).json({ message: 'Email invalide.' });
  const passwordError = ensurePasswordPolicy(password);
  if (passwordError) return res.status(400).json({ message: passwordError });
  const exists = await usersDb.findOne({ email });
  if (exists)
    return res.status(409).json({ message: 'Cet email existe deja.' });
  const user = {
    id: createPublicId('usr'),
    name,
    email,
    passwordHash: await bcrypt.hash(password, isProduction ? 12 : 10),
    role,
    plan,
    status,
    avatarUrl: '',
    bio: '',
    preferences: DEFAULT_USER_PREFERENCES,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  await usersDb.insert(user);
  res.status(201).json({ user: publicUser(user) });
});

app.patch('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const user = await findByPublicId(usersDb, req.params.id);
  if (!user)
    return res.status(404).json({ message: 'Utilisateur introuvable.' });
  const patch = {};
  if (typeof req.body?.name === 'string')
    patch.name = cleanString(req.body.name, 100) || user.name;
  if (req.body?.role) patch.role = normalizeRole(req.body.role);
  if (req.body?.plan) patch.plan = normalizePlan(req.body.plan);
  if (req.body?.status)
    patch.status = req.body.status === 'paused' ? 'paused' : 'active';
  if (
    normalizeRole(user.role) === 'admin' &&
    ((patch.role && patch.role !== 'admin') || patch.status === 'paused')
  ) {
    const activeAdmins = await usersDb.count({
      role: 'admin',
      status: 'active',
    });
    if (activeAdmins <= 1)
      return res
        .status(400)
        .json({ message: 'Impossible de retirer le dernier admin actif.' });
  }
  await usersDb.update({ _id: user._id }, { $set: patch });
  res.json({ user: publicUser(await usersDb.findOne({ _id: user._id })) });
});

app.get('/api/playlists', auth, async (req, res) => {
  const playlists = await playlistsDb
    .find({ userId: req.user.id })
    .sort({ updatedAt: -1 });
  res.json({ playlists: playlists.map(publicPlaylist) });
});

app.post('/api/playlists', auth, async (req, res) => {
  const title = cleanString(req.body?.title, 120);
  const description = cleanString(req.body?.description, 500);
  const cover = sanitizeImageUrl(req.body?.cover);
  if (!title) return res.status(400).json({ message: 'Titre requis.' });
  if (req.body?.cover && !cover)
    return res.status(400).json({ message: 'URL de cover invalide.' });
  await assertCanCreatePlaylist(req.user);
  const now = new Date().toISOString();
  const playlist = {
    id: createPublicId('pl'),
    userId: req.user.id,
    title,
    description,
    cover,
    createdAt: now,
    updatedAt: now,
    tracks: [],
  };
  const created = await playlistsDb.insert(playlist);
  res.status(201).json({ playlist: publicPlaylist(created) });
});

app.patch('/api/playlists/:id', auth, async (req, res) => {
  const playlist = await findByPublicId(playlistsDb, req.params.id, {
    userId: req.user.id,
  });
  if (!playlist)
    return res.status(404).json({ message: 'Playlist introuvable.' });
  const patch = { updatedAt: new Date().toISOString() };
  if (typeof req.body?.title === 'string')
    patch.title = cleanString(req.body.title, 120) || playlist.title;
  if (typeof req.body?.description === 'string')
    patch.description = cleanString(req.body.description, 500);
  if (typeof req.body?.cover === 'string') {
    const cover = sanitizeImageUrl(req.body.cover);
    if (req.body.cover.trim() && !cover)
      return res.status(400).json({ message: 'URL de cover invalide.' });
    patch.cover = cover;
  }
  if (Array.isArray(req.body?.tracks)) {
    patch.tracks = req.body.tracks.map(normalizeTrack).filter(Boolean);
    assertTracksWithinLimit(req.user, patch.tracks);
    patch.cover =
      patch.cover || patch.tracks[0]?.thumbnail || playlist.cover || '';
  }
  await playlistsDb.update({ _id: playlist._id }, { $set: patch });
  res.json({
    playlist: publicPlaylist(await playlistsDb.findOne({ _id: playlist._id })),
  });
});

app.delete('/api/playlists/:id', auth, async (req, res) => {
  const playlist = await findByPublicId(playlistsDb, req.params.id, {
    userId: req.user.id,
  });
  if (playlist) await playlistsDb.remove({ _id: playlist._id }, {});
  res.json({ ok: true });
});

app.get('/api/catalog', async (req, res) => {
  const query = cleanString(req.query?.query, 120).toLowerCase();
  const limit = readLimitedNumber(req.query?.limit, 50, 1, 200);
  const offset = readLimitedNumber(req.query?.offset, 0, 0, 100000);
  const total = await tracksDb.count({});
  let items = await tracksDb
    .find({})
    .sort({ importedAt: -1 })
    .skip(query ? 0 : offset)
    .limit(query ? CATALOG_QUERY_SCAN_LIMIT : limit);
  if (query) {
    items = items.filter(
      (item) =>
        String(item.title || '')
          .toLowerCase()
          .includes(query) ||
        String(item.artist || '')
          .toLowerCase()
          .includes(query) ||
        String(item.tag || '')
          .toLowerCase()
          .includes(query),
    );
  }
  const page = query ? items.slice(offset, offset + limit) : items;
  const visibleTotal = query ? items.length : total;
  res.json({
    items: page.map(normalizeTrack),
    total: visibleTotal,
    limit,
    offset,
    hasMore: offset + limit < visibleTotal,
  });
});

app.get('/api/catalog/stats', async (_req, res) => {
  const [total, items] = await Promise.all([
    tracksDb.count({}),
    tracksDb.find({}).sort({ updatedAt: -1 }).limit(CATALOG_QUERY_SCAN_LIMIT),
  ]);
  const channels = new Set(items.map((item) => item.artist).filter(Boolean))
    .size;
  res.json({
    total,
    channels,
    youtubeConfigured: isConfiguredSecret(YOUTUBE_API_KEY),
    latestImportAt:
      items
        .map((item) => item.updatedAt || item.importedAt)
        .filter(Boolean)
        .sort()
        .pop() || null,
  });
});

app.get('/api/catalog/search-remote', async (req, res) => {
  const query = cleanString(req.query?.query, 120);
  const pageToken = cleanString(req.query?.pageToken, 200);
  const maxResults = readLimitedNumber(req.query?.maxResults, 12, 1, 25);
  if (!query)
    return res.json({ items: [], nextPageToken: '', source: 'youtube-api' });
  try {
    res.json({
      ...(await fetchYouTubeSearch(query, { pageToken, maxResults })),
      source: 'youtube-api',
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/catalog/import', auth, adminOnly, async (req, res) => {
  const query = cleanString(req.body?.query, 120);
  const maxPages = readLimitedNumber(req.body?.maxPages, 1, 1, 5);
  const maxResults = readLimitedNumber(req.body?.maxResults, 25, 1, 25);
  if (!query)
    return res.status(400).json({ message: 'Requete import requise.' });
  let pageToken = cleanString(req.body?.pageToken, 200);
  let imported = 0;
  let fetched = 0;
  let nextPageToken = '';
  try {
    for (let i = 0; i < maxPages; i += 1) {
      const data = await fetchYouTubeSearch(query, { pageToken, maxResults });
      fetched += data.items.length;
      for (const item of data.items) {
        const before = await tracksDb.findOne({ youtubeId: item.youtubeId });
        await upsertCatalogTrack(item, query);
        if (!before) imported += 1;
      }
      nextPageToken = data.nextPageToken || '';
      if (!nextPageToken) break;
      pageToken = nextPageToken;
    }
    res.json({
      ok: true,
      imported,
      fetched,
      total: await tracksDb.count({}),
      nextPageToken,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/history/play', auth, async (req, res) => {
  const track = normalizeTrack(req.body?.track);
  if (!track) return res.status(400).json({ message: 'Track invalide.' });
  const entry = await logPlay(req.user.id, track);
  res.status(201).json({ entry });
});

app.get('/api/history/me', auth, async (req, res) => {
  const limit = readLimitedNumber(req.query?.limit, 12, 1, 50);
  const entries = await historyDb
    .find({ userId: req.user.id })
    .sort({ lastPlayedAt: -1 })
    .limit(limit);
  res.json({ items: entries });
});

app.get('/api/recommendations/me', auth, async (req, res) => {
  const limit = readLimitedNumber(req.query?.limit, 12, 1, 30);
  const items = await getRecommendationsForUser(req.user.id, limit);
  res.json({ items });
});

app.get('/api/taste-profile/me', auth, async (req, res) => {
  res.json({ profile: await getTasteProfile(req.user.id) });
});

if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(
    express.static(distDir, {
      dotfiles: 'deny',
      index: false,
      maxAge: isProduction ? '1h' : 0,
    }),
  );

  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Route API introuvable.' });
});

app.use((err, req, res, _next) => {
  const status = Number(err?.status || err?.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  console.error(`[${req.requestId || 'no-request-id'}]`, err);
  res.status(safeStatus).json({
    message:
      isProduction && safeStatus >= 500
        ? 'Erreur serveur.'
        : err?.message || 'Erreur serveur.',
    requestId: req.requestId,
  });
});

ensureIndexes()
  .then(ensureSeed)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Viewly backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start backend:', error);
    process.exit(1);
  });
