import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(uploadsDir, { recursive: true })

const usersDb = Datastore.create({ filename: path.join(dataDir, 'users.db'), autoload: true })
const playlistsDb = Datastore.create({ filename: path.join(dataDir, 'playlists.db'), autoload: true })
const tracksDb = Datastore.create({ filename: path.join(dataDir, 'tracks.db'), autoload: true })
const historyDb = Datastore.create({ filename: path.join(dataDir, 'history.db'), autoload: true })
const favoritesDb = Datastore.create({ filename: path.join(dataDir, 'favorites.db'), autoload: true })
const settingsDb = Datastore.create({ filename: path.join(dataDir, 'settings.db'), autoload: true })

const JWT_SECRET = process.env.JWT_SECRET || 'viewly-dev-secret-change-me'
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || ''
const PORT = Number(process.env.PORT || 8787)
const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(uploadsDir))

const DEFAULT_SETTINGS = {
  brandName: 'Viewly',
  logoAccent: 'ly',
  heroBadge: 'V3 immersive music app',
  heroTitle: 'Explore YouTube comme une vraie app musicale.',
  heroSubtitle: 'Historique persistant, recommandations, playlists drag & drop et admin CMS pour éditer le site sans toucher au code.',
  homePrimaryCta: 'Lancer ma sélection',
  homeSecondaryCta: 'Voir les tendances',
  marketingBanner: 'Nouveau : V3 avec historique, recommandations et glisser-déposer.',
  pricingFree: '0€',
  pricingStudio: '7,99€',
  adminAnnouncement: 'Tu peux modifier le contenu public du site depuis l’admin.',
}

function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...rest } = user
  return rest
}

function normalizeTrack(track) {
  if (!track || typeof track !== 'object') return null
  const youtubeId = String(track.youtubeId || '').trim()
  return {
    id: String(track.id || youtubeId || `track-${Date.now()}`),
    title: String(track.title || '').trim() || 'Titre inconnu',
    artist: String(track.artist || '').trim() || 'Artiste inconnu',
    duration: Number(track.duration) || 0,
    emoji: String(track.emoji || '🎵'),
    youtubeId,
    thumbnail: String(track.thumbnail || '').trim(),
    gradient: String(track.gradient || 'linear-gradient(135deg,#0b7a5c,#10203c)'),
    tag: String(track.tag || 'Playlist'),
    description: String(track.description || '').trim(),
    publishedAt: String(track.publishedAt || '').trim(),
    source: String(track.source || (youtubeId ? 'youtube' : 'local')),
  }
}

function publicPlaylist(playlist) {
  return {
    ...playlist,
    tracks: Array.isArray(playlist.tracks) ? playlist.tracks : [],
    trackCount: Array.isArray(playlist.tracks) ? playlist.tracks.length : 0,
  }
}

function normalizeSearchItem(item, index = 0, query = '') {
  const snippet = item?.snippet || {}
  const videoId = item?.id?.videoId || item?.id || ''
  const thumb =
    snippet?.thumbnails?.high?.url ||
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.default?.url ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '')

  return normalizeTrack({
    id: `yt-${videoId}-${index}`,
    title: snippet.title || 'Titre YouTube',
    artist: snippet.channelTitle || 'Chaîne YouTube',
    duration: 0,
    emoji: '▶',
    youtubeId: videoId,
    thumbnail: thumb,
    gradient: 'linear-gradient(135deg,#0c8f66,#10203c)',
    tag: query ? `Import ${query}` : 'Résultat YouTube',
    description: snippet.description || '',
    publishedAt: snippet.publishedAt || '',
    source: 'youtube',
  })
}

async function upsertCatalogTrack(track, importedQuery = '') {
  const normalized = normalizeTrack(track)
  if (!normalized?.youtubeId) return null
  const existing = await tracksDb.findOne({ youtubeId: normalized.youtubeId })
  const now = new Date().toISOString()
  const doc = {
    ...existing,
    ...normalized,
    importedQuery: importedQuery || existing?.importedQuery || '',
    importedAt: existing?.importedAt || now,
    updatedAt: now,
  }
  if (existing) {
    await tracksDb.update({ _id: existing._id }, { $set: doc })
    return { ...existing, ...doc }
  }
  return tracksDb.insert(doc)
}

async function fetchYouTubeSearch(query, options = {}) {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY manquante côté serveur.')
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', String(query || '').trim())
  url.searchParams.set('maxResults', String(options.maxResults || 12))
  url.searchParams.set('type', 'video')
  url.searchParams.set('videoEmbeddable', 'true')
  url.searchParams.set('safeSearch', options.safeSearch || 'moderate')
  url.searchParams.set('order', options.order || 'relevance')
  if (options.pageToken) url.searchParams.set('pageToken', options.pageToken)
  url.searchParams.set('key', YOUTUBE_API_KEY)

  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || `YouTube API error ${response.status}`)

  return {
    items: (data.items || []).map((item, index) => normalizeSearchItem(item, index, query)),
    nextPageToken: data.nextPageToken || '',
    pageInfo: data.pageInfo || {},
  }
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
}

async function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Authentification requise.' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await usersDb.findOne({ id: payload.sub })
    if (!user) return res.status(401).json({ message: 'Session invalide.' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Token invalide ou expiré.' })
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Accès admin requis.' })
  next()
}

function saveAvatarFromDataUrl(dataUrl, userId) {
  const match = String(dataUrl || '').match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/)
  if (!match) throw new Error('Format d\'image non supporté.')
  const mime = match[1]
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
  const base64 = match[3]
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > 5 * 1024 * 1024) throw new Error('Image trop volumineuse (max 5 MB).')
  const filename = `avatar-${userId}-${Date.now()}.${ext}`
  fs.writeFileSync(path.join(uploadsDir, filename), buffer)
  return `/uploads/${filename}`
}

async function getSiteSettings() {
  const doc = await settingsDb.findOne({ key: 'site-settings' })
  return { ...DEFAULT_SETTINGS, ...(doc?.value || {}) }
}

async function setSiteSettings(next) {
  const value = { ...DEFAULT_SETTINGS, ...next }
  const existing = await settingsDb.findOne({ key: 'site-settings' })
  if (existing) await settingsDb.update({ _id: existing._id }, { $set: { value, updatedAt: new Date().toISOString() } })
  else await settingsDb.insert({ key: 'site-settings', value, updatedAt: new Date().toISOString() })
  return value
}

function trackSignature(track) {
  return track?.youtubeId || `${track?.title || ''}::${track?.artist || ''}`
}

async function logPlay(userId, track) {
  const normalized = normalizeTrack(track)
  if (!normalized) return null
  await upsertCatalogTrack(normalized)
  const now = new Date().toISOString()
  const existing = await historyDb.findOne({ userId, signature: trackSignature(normalized) })
  if (existing) {
    const nextCount = Number(existing.playCount || 0) + 1
    await historyDb.update({ _id: existing._id }, { $set: { ...existing, track: normalized, playCount: nextCount, lastPlayedAt: now } })
    return { ...existing, track: normalized, playCount: nextCount, lastPlayedAt: now }
  }
  return historyDb.insert({
    id: Date.now(),
    userId,
    signature: trackSignature(normalized),
    track: normalized,
    playCount: 1,
    firstPlayedAt: now,
    lastPlayedAt: now,
  })
}

async function getRecommendationsForUser(userId, limit = 12) {
  const history = await historyDb.find({ userId }).sort({ lastPlayedAt: -1 })
  const playedIds = new Set(history.map(entry => entry.track?.youtubeId).filter(Boolean))
  const favArtists = history.slice(0, 15).map(entry => entry.track?.artist).filter(Boolean)
  const favTags = history.slice(0, 15).map(entry => entry.track?.tag).filter(Boolean)
  let catalog = await tracksDb.find({}).sort({ updatedAt: -1 })
  catalog = catalog.map(normalizeTrack).filter(Boolean)

  const scored = catalog.map(track => {
    let score = 0
    if (!playedIds.has(track.youtubeId)) score += 2
    if (favArtists.includes(track.artist)) score += 4
    if (favTags.includes(track.tag)) score += 2
    if (track.source === 'youtube') score += 1
    return { track, score }
  })

  const recommendations = scored
    .sort((a, b) => b.score - a.score)
    .map(item => item.track)
    .filter(track => !playedIds.has(track.youtubeId))
    .slice(0, limit)

  if (recommendations.length >= limit) return recommendations
  const fallback = catalog.filter(track => !recommendations.some(item => item.youtubeId === track.youtubeId)).slice(0, limit - recommendations.length)
  return [...recommendations, ...fallback]
}



async function getTasteProfile(userId) {
  const [history, favorites, playlists] = await Promise.all([
    historyDb.find({ userId }).sort({ lastPlayedAt: -1 }),
    favoritesDb.find({ userId }),
    playlistsDb.find({ userId }).sort({ updatedAt: -1 }),
  ])

  const artistCount = new Map()
  const tagCount = new Map()
  const energyWords = ['party', 'dance', 'club', 'energy', 'funk', 'hit', 'max']
  const chillWords = ['live', 'mood', 'ambient', 'soul', 'acoustic', 'calm']
  let energyScore = 50

  history.forEach((entry) => {
    const track = normalizeTrack(entry.track)
    if (!track) return
    const artist = String(track.artist || '').trim()
    const tag = String(track.tag || '').trim()
    const plays = Number(entry.playCount || 1)
    if (artist) artistCount.set(artist, (artistCount.get(artist) || 0) + plays)
    if (tag) tagCount.set(tag, (tagCount.get(tag) || 0) + plays)
    const blob = `${track.title || ''} ${artist} ${tag}`.toLowerCase()
    if (energyWords.some((word) => blob.includes(word))) energyScore += 4
    if (chillWords.some((word) => blob.includes(word))) energyScore -= 3
  })

  favorites.forEach((item) => {
    const artist = String(item.track?.artist || '').trim()
    if (artist) artistCount.set(artist, (artistCount.get(artist) || 0) + 2)
  })

  const topArtists = [...artistCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  energyScore = Math.max(0, Math.min(100, energyScore))
  const diversityScore = Math.max(20, Math.min(100, Math.round((artistCount.size * 12) + (tagCount.size * 7))))
  const discoveryScore = Math.max(15, Math.min(100, 35 + favorites.length * 6 + playlists.length * 5))
  const mood = energyScore >= 68 ? 'énergique' : energyScore <= 40 ? 'chill' : 'équilibré'

  let summary = 'Commence à écouter pour construire ton profil musical.'
  if (topArtists.length) {
    summary = `Tu reviens souvent vers ${topArtists[0].name}`
    if (topTags.length) summary += ` avec une dominante ${topTags[0].name.toLowerCase()}`
    summary += '.'
  }

  return {
    mood,
    summary,
    energyScore,
    diversityScore,
    discoveryScore,
    topArtists,
    topTags,
    totalPlays: history.reduce((sum, entry) => sum + Number(entry.playCount || 1), 0),
    totalFavorites: favorites.length,
    playlists: playlists.length,
  }
}

async function getFavoriteSet(userId) {
  const docs = await favoritesDb.find({ userId })
  return docs.map(doc => String(doc.youtubeId || doc.trackId || '')).filter(Boolean)
}

async function toggleFavorite(userId, track) {
  const normalized = normalizeTrack(track)
  if (!normalized?.youtubeId) throw new Error('Track invalide pour favoris.')
  const existing = await favoritesDb.findOne({ userId, youtubeId: normalized.youtubeId })
  if (existing) {
    await favoritesDb.remove({ _id: existing._id }, {})
    return { liked: false, track: normalized }
  }
  await favoritesDb.insert({
    id: Date.now(),
    userId,
    youtubeId: normalized.youtubeId,
    trackId: normalized.id,
    track: normalized,
    createdAt: new Date().toISOString(),
  })
  await upsertCatalogTrack(normalized)
  return { liked: true, track: normalized }
}

async function getAdminAnalytics() {
  const [users, playlists, tracks, history, favorites] = await Promise.all([
    usersDb.find({}).sort({ createdAt: -1 }),
    playlistsDb.find({}).sort({ updatedAt: -1 }),
    tracksDb.find({}).sort({ updatedAt: -1 }),
    historyDb.find({}).sort({ lastPlayedAt: -1 }),
    favoritesDb.find({}).sort({ createdAt: -1 }),
  ])
  const topTracks = history
    .reduce((acc, entry) => {
      const key = entry.signature || entry.track?.youtubeId || entry.track?.id
      if (!key) return acc
      const current = acc.get(key) || { track: entry.track, plays: 0 }
      current.plays += Number(entry.playCount || 1)
      acc.set(key, current)
      return acc
    }, new Map())
  const topTrackItems = [...topTracks.values()].sort((a, b) => b.plays - a.plays).slice(0, 8)
  const planMix = {
    free: users.filter(user => user.plan === 'Free').length,
    studio: users.filter(user => user.plan === 'Studio').length,
  }
  return {
    totals: {
      users: users.length,
      playlists: playlists.length,
      tracks: tracks.length,
      plays: history.length,
      favorites: favorites.length,
    },
    planMix,
    recentUsers: users.slice(0, 5).map(publicUser),
    latestPlaylists: playlists.slice(0, 5).map(publicPlaylist),
    topTracks: topTrackItems,
  }
}

async function getDiscoveryFeed(limit = 12) {
  const catalog = (await tracksDb.find({}).sort({ updatedAt: -1 })).map(normalizeTrack).filter(Boolean)
  const hot = catalog.slice(0, limit)
  const editors = catalog.filter(item => /seed|youtube/i.test(item.source || '')).slice(0, limit)
  return { hot, editors }
}

async function ensureSeed() {
  const now = new Date().toISOString()
  const userCount = await usersDb.count({})
  if (userCount === 0) {
    await usersDb.insert([
      { id: 1, name: 'Gabin Admin', email: 'admin@viewly.local', passwordHash: await bcrypt.hash('admin123', 10), role: 'admin', plan: 'Studio', status: 'active', avatarUrl: '', bio: 'Admin Viewly', createdAt: now, lastLoginAt: null },
      { id: 2, name: 'Lina Demo', email: 'lina@viewly.local', passwordHash: await bcrypt.hash('demo123', 10), role: 'user', plan: 'Free', status: 'active', avatarUrl: '', bio: 'Compte de démonstration', createdAt: now, lastLoginAt: null },
    ])
  }

  const demoTracks = [
    { id: 'seed-1', title: 'Blinding Lights', artist: 'The Weeknd', duration: 200, emoji: '🌃', youtubeId: '4NRXx6U8ABQ', thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', gradient: 'linear-gradient(135deg,#0b7a5c,#10203c)', tag: 'YouTube Hit', source: 'seed' },
    { id: 'seed-2', title: 'Alors on danse', artist: 'Stromae', duration: 208, emoji: '🕺', youtubeId: 'VHoT4N43jK8', thumbnail: 'https://i.ytimg.com/vi/VHoT4N43jK8/hqdefault.jpg', gradient: 'linear-gradient(135deg,#0d8e72,#16396b)', tag: 'Clip officiel', source: 'seed' },
    { id: 'seed-3', title: 'One More Time', artist: 'Daft Punk', duration: 320, emoji: '🤖', youtubeId: 'FGBhQbmPwH8', thumbnail: 'https://i.ytimg.com/vi/FGBhQbmPwH8/hqdefault.jpg', gradient: 'linear-gradient(135deg,#11a37f,#1b2c54)', tag: 'Classic club', source: 'seed' },
    { id: 'seed-4', title: 'bad guy', artist: 'Billie Eilish', duration: 194, emoji: '🖤', youtubeId: 'DyDfgMOUjCI', thumbnail: 'https://i.ytimg.com/vi/DyDfgMOUjCI/hqdefault.jpg', gradient: 'linear-gradient(135deg,#1a9d7f,#0f264a)', tag: 'Pop mood', source: 'seed' },
    { id: 'seed-5', title: 'Dernière Danse', artist: 'Indila', duration: 212, emoji: '💃', youtubeId: 'K5KAc5CoCuk', thumbnail: 'https://i.ytimg.com/vi/K5KAc5CoCuk/hqdefault.jpg', gradient: 'linear-gradient(135deg,#19a27b,#14335e)', tag: 'French touch', source: 'seed' },
  ]

  const playlistCount = await playlistsDb.count({})
  if (playlistCount === 0) {
    const now = new Date().toISOString()
    await playlistsDb.insert([
      { id: Date.now() + 10, userId: 1, title: 'Admin picks', description: 'Sélection de départ côté admin.', cover: demoTracks[0].thumbnail, createdAt: now, updatedAt: now, tracks: demoTracks.slice(0, 3) },
      { id: Date.now() + 11, userId: 2, title: 'Lina favorites', description: 'Petite playlist de démonstration.', cover: demoTracks[1].thumbnail, createdAt: now, updatedAt: now, tracks: [demoTracks[1], demoTracks[4]] },
    ])
  }

  const settingsCount = await settingsDb.count({})
  if (settingsCount === 0) await settingsDb.insert({ key: 'site-settings', value: DEFAULT_SETTINGS, updatedAt: new Date().toISOString() })

  for (const track of demoTracks) await upsertCatalogTrack(track, 'seed')
  await logPlay(2, demoTracks[1])
  await logPlay(2, demoTracks[4])
  if (await favoritesDb.count({}) === 0) {
    await favoritesDb.insert([
      { id: Date.now() + 30, userId: 2, youtubeId: demoTracks[1].youtubeId, trackId: demoTracks[1].id, track: demoTracks[1], createdAt: now },
      { id: Date.now() + 31, userId: 2, youtubeId: demoTracks[4].youtubeId, trackId: demoTracks[4].id, track: demoTracks[4], createdAt: now },
    ])
  }
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, users: await usersDb.count({}), playlists: await playlistsDb.count({}), tracks: await tracksDb.count({}), history: await historyDb.count({}), favorites: await favoritesDb.count({}), youtubeConfigured: Boolean(YOUTUBE_API_KEY) })
})

app.get('/api/settings/public', async (_req, res) => {
  res.json({ settings: await getSiteSettings() })
})

app.get('/api/settings/admin', auth, adminOnly, async (_req, res) => {
  res.json({ settings: await getSiteSettings() })
})

app.patch('/api/settings/admin', auth, adminOnly, async (req, res) => {
  const allowed = Object.keys(DEFAULT_SETTINGS)
  const next = {}
  for (const key of allowed) {
    if (typeof req.body?.[key] === 'string') next[key] = req.body[key].trim()
  }
  const settings = await setSiteSettings(next)
  res.json({ settings })
})

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!name || !email || !password) return res.status(400).json({ message: 'Nom, email et mot de passe requis.' })
  if (password.length < 6) return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' })
  const exists = await usersDb.findOne({ email })
  if (exists) return res.status(409).json({ message: 'Cet email existe déjà.' })

  const now = new Date().toISOString()
  const user = { id: Date.now(), name, email, passwordHash: await bcrypt.hash(password, 10), role: 'user', plan: 'Free', status: 'active', avatarUrl: '', bio: '', createdAt: now, lastLoginAt: now }
  await usersDb.insert(user)
  await playlistsDb.insert({ id: Date.now() + 1, userId: user.id, title: 'Mes découvertes', description: 'Ta première playlist Viewly.', cover: '', createdAt: now, updatedAt: now, tracks: [] })
  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis.' })
  const user = await usersDb.findOne({ email })
  if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
  if (user.status !== 'active') return res.status(403).json({ message: 'Compte suspendu.' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
  const lastLoginAt = new Date().toISOString()
  await usersDb.update({ id: user.id }, { $set: { lastLoginAt } })
  res.json({ token: signToken({ ...user, lastLoginAt }), user: publicUser({ ...user, lastLoginAt }) })
})

app.get('/api/auth/me', auth, async (req, res) => res.json({ user: publicUser(req.user) }))



app.get('/api/discover', async (req, res) => {
  const limit = Math.max(1, Math.min(20, Number(req.query?.limit) || 8))
  res.json(await getDiscoveryFeed(limit))
})

app.get('/api/favorites', auth, async (req, res) => {
  const items = await favoritesDb.find({ userId: req.user.id }).sort({ createdAt: -1 })
  res.json({ items: items.map(item => normalizeTrack(item.track)).filter(Boolean), ids: await getFavoriteSet(req.user.id) })
})

app.post('/api/favorites/toggle', auth, async (req, res) => {
  try {
    const result = await toggleFavorite(req.user.id, req.body?.track)
    res.json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

app.get('/api/admin/analytics', auth, adminOnly, async (_req, res) => {
  res.json(await getAdminAnalytics())
})

app.patch('/api/auth/profile', auth, async (req, res) => {
  const patch = {}
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : ''
  const avatarDataUrl = typeof req.body?.avatarDataUrl === 'string' ? req.body.avatarDataUrl : ''
  if (name) patch.name = name
  if (typeof req.body?.bio === 'string') patch.bio = bio
  if (password) {
    if (password.length < 6) return res.status(400).json({ message: 'Mot de passe trop court.' })
    patch.passwordHash = await bcrypt.hash(password, 10)
  }
  if (avatarDataUrl) {
    try { patch.avatarUrl = saveAvatarFromDataUrl(avatarDataUrl, req.user.id) } catch (error) { return res.status(400).json({ message: error.message }) }
  }
  await usersDb.update({ id: req.user.id }, { $set: patch })
  const fresh = await usersDb.findOne({ id: req.user.id })
  res.json({ user: publicUser(fresh) })
})

app.patch('/api/billing/plan', auth, async (req, res) => {
  const plan = req.body?.plan === 'Studio' ? 'Studio' : 'Free'
  await usersDb.update({ id: req.user.id }, { $set: { plan } })
  const fresh = await usersDb.findOne({ id: req.user.id })
  res.json({ user: publicUser(fresh) })
})

app.get('/api/admin/users', auth, adminOnly, async (_req, res) => {
  const users = (await usersDb.find({}).sort({ createdAt: -1 })).map(publicUser)
  const stats = { total: users.length, admins: users.filter(user => user.role === 'admin').length, premium: users.filter(user => user.plan === 'Studio').length, active: users.filter(user => user.status === 'active').length }
  res.json({ users, stats })
})

app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const role = req.body?.role === 'admin' ? 'admin' : 'user'
  const plan = req.body?.plan === 'Studio' ? 'Studio' : 'Free'
  const status = req.body?.status === 'paused' ? 'paused' : 'active'
  if (!name || !email || !password) return res.status(400).json({ message: 'Nom, email et mot de passe requis.' })
  const exists = await usersDb.findOne({ email })
  if (exists) return res.status(409).json({ message: 'Cet email existe déjà.' })
  const user = { id: Date.now(), name, email, passwordHash: await bcrypt.hash(password, 10), role, plan, status, avatarUrl: '', bio: '', createdAt: new Date().toISOString(), lastLoginAt: null }
  await usersDb.insert(user)
  res.status(201).json({ user: publicUser(user) })
})

app.patch('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  const user = await usersDb.findOne({ id })
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' })
  const patch = {}
  if (typeof req.body?.name === 'string') patch.name = req.body.name.trim() || user.name
  if (req.body?.role) patch.role = req.body.role === 'admin' ? 'admin' : 'user'
  if (req.body?.plan) patch.plan = req.body.plan === 'Studio' ? 'Studio' : 'Free'
  if (req.body?.status) patch.status = req.body.status === 'paused' ? 'paused' : 'active'
  await usersDb.update({ id }, { $set: patch })
  res.json({ user: publicUser(await usersDb.findOne({ id })) })
})

app.get('/api/playlists', auth, async (req, res) => {
  const playlists = await playlistsDb.find({ userId: req.user.id }).sort({ updatedAt: -1 })
  res.json({ playlists: playlists.map(publicPlaylist) })
})

app.post('/api/playlists', auth, async (req, res) => {
  const title = String(req.body?.title || '').trim()
  const description = String(req.body?.description || '').trim()
  if (!title) return res.status(400).json({ message: 'Titre requis.' })
  const now = new Date().toISOString()
  const playlist = { id: Date.now(), userId: req.user.id, title, description, cover: '', createdAt: now, updatedAt: now, tracks: [] }
  const created = await playlistsDb.insert(playlist)
  res.status(201).json({ playlist: publicPlaylist(created) })
})

app.patch('/api/playlists/:id', auth, async (req, res) => {
  const id = Number(req.params.id)
  const playlist = await playlistsDb.findOne({ id, userId: req.user.id })
  if (!playlist) return res.status(404).json({ message: 'Playlist introuvable.' })
  const patch = { updatedAt: new Date().toISOString() }
  if (typeof req.body?.title === 'string') patch.title = req.body.title.trim() || playlist.title
  if (typeof req.body?.description === 'string') patch.description = req.body.description.trim()
  if (typeof req.body?.cover === 'string') patch.cover = req.body.cover.trim()
  if (Array.isArray(req.body?.tracks)) {
    patch.tracks = req.body.tracks.map(normalizeTrack).filter(Boolean)
    patch.cover = patch.cover || patch.tracks[0]?.thumbnail || playlist.cover || ''
  }
  await playlistsDb.update({ id, userId: req.user.id }, { $set: patch })
  res.json({ playlist: publicPlaylist(await playlistsDb.findOne({ id, userId: req.user.id })) })
})

app.delete('/api/playlists/:id', auth, async (req, res) => {
  await playlistsDb.remove({ id: Number(req.params.id), userId: req.user.id }, {})
  res.json({ ok: true })
})

app.get('/api/catalog', async (req, res) => {
  const query = String(req.query?.query || '').trim().toLowerCase()
  const limit = Math.max(1, Math.min(200, Number(req.query?.limit) || 50))
  const offset = Math.max(0, Number(req.query?.offset) || 0)
  let items = await tracksDb.find({}).sort({ importedAt: -1 })
  if (query) {
    items = items.filter(item => String(item.title || '').toLowerCase().includes(query) || String(item.artist || '').toLowerCase().includes(query) || String(item.tag || '').toLowerCase().includes(query))
  }
  const total = items.length
  res.json({ items: items.slice(offset, offset + limit).map(normalizeTrack), total, limit, offset, hasMore: offset + limit < total })
})

app.get('/api/catalog/stats', async (_req, res) => {
  const items = await tracksDb.find({})
  const channels = new Set(items.map(item => item.artist).filter(Boolean)).size
  res.json({ total: items.length, channels, youtubeConfigured: Boolean(YOUTUBE_API_KEY), latestImportAt: items.map(item => item.updatedAt || item.importedAt).filter(Boolean).sort().pop() || null })
})

app.get('/api/catalog/search-remote', async (req, res) => {
  const query = String(req.query?.query || '').trim()
  const pageToken = String(req.query?.pageToken || '').trim()
  const maxResults = Math.max(1, Math.min(25, Number(req.query?.maxResults) || 12))
  if (!query) return res.json({ items: [], nextPageToken: '', source: 'youtube-api' })
  try { res.json({ ...(await fetchYouTubeSearch(query, { pageToken, maxResults })), source: 'youtube-api' }) } catch (error) { res.status(400).json({ message: error.message }) }
})

app.post('/api/catalog/import', auth, adminOnly, async (req, res) => {
  const query = String(req.body?.query || '').trim()
  const maxPages = Math.max(1, Math.min(5, Number(req.body?.maxPages) || 1))
  const maxResults = Math.max(1, Math.min(25, Number(req.body?.maxResults) || 25))
  if (!query) return res.status(400).json({ message: 'Requête d’import requise.' })
  let pageToken = String(req.body?.pageToken || '').trim()
  let imported = 0
  let fetched = 0
  let nextPageToken = ''
  try {
    for (let i = 0; i < maxPages; i += 1) {
      const data = await fetchYouTubeSearch(query, { pageToken, maxResults })
      fetched += data.items.length
      for (const item of data.items) {
        const before = await tracksDb.findOne({ youtubeId: item.youtubeId })
        await upsertCatalogTrack(item, query)
        if (!before) imported += 1
      }
      nextPageToken = data.nextPageToken || ''
      if (!nextPageToken) break
      pageToken = nextPageToken
    }
    res.json({ ok: true, imported, fetched, total: await tracksDb.count({}), nextPageToken })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

app.post('/api/history/play', auth, async (req, res) => {
  const track = normalizeTrack(req.body?.track)
  if (!track) return res.status(400).json({ message: 'Track invalide.' })
  const entry = await logPlay(req.user.id, track)
  res.status(201).json({ entry })
})

app.get('/api/history/me', auth, async (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query?.limit) || 12))
  const entries = await historyDb.find({ userId: req.user.id }).sort({ lastPlayedAt: -1 })
  res.json({ items: entries.slice(0, limit) })
})

app.get('/api/recommendations/me', auth, async (req, res) => {
  const limit = Math.max(1, Math.min(30, Number(req.query?.limit) || 12))
  const items = await getRecommendationsForUser(req.user.id, limit)
  res.json({ items })
})

app.get('/api/taste-profile/me', auth, async (req, res) => {
  res.json({ profile: await getTasteProfile(req.user.id) })
})

ensureSeed()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Viewly backend running on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start backend:', error)
    process.exit(1)
  })
