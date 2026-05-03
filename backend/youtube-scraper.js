import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'))
fs.mkdirSync(dataDir, { recursive: true })

const scrapedDb = Datastore.create({ filename: path.join(dataDir, 'scraped.db'), autoload: true })

const RSS_FEEDS = {
 trending: 'https://www.youtube.com/feeds/trending.xml',
 music: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-9-kyTW8ZkZNDHQJ6FgpwQ',
 hipHop: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-',
 electro: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLrEnWoR732-DtKGaDtdPXEJia7DDn9Y1_',
}

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'
const ALLOWED_RSS_ORIGINS = new Set(['https://www.youtube.com'])

function cleanString(value, max = 200) {
 return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function readLimitedNumber(value, fallback, min, max) {
 const parsed = Number(value)
 if (!Number.isFinite(parsed)) return fallback
 return Math.max(min, Math.min(max, parsed))
}

function escapeRegExp(value) {
 return cleanString(value, 120).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sanitizeYouTubeId(value) {
 const id = cleanString(value, 40)
 return /^[A-Za-z0-9_-]{6,32}$/.test(id) ? id : ''
}

export class YouTubeScraper {
 constructor(apiKey) {
 this.apiKey = apiKey
 this.rateLimitDelay = 100
 this.lastRequest = 0
 }

 async delay(ms) {
 return new Promise(resolve => setTimeout(resolve, ms))
 }

 async ensureRateLimit() {
 const now = Date.now()
 const elapsed = now - this.lastRequest
 if (elapsed < this.rateLimitDelay) {
 await this.delay(this.rateLimitDelay - elapsed)
 }
 this.lastRequest = Date.now()
 }

 async fetchRSS(url) {
 try {
 const feedUrl = new URL(url)
 if (!ALLOWED_RSS_ORIGINS.has(feedUrl.origin) || !feedUrl.pathname.startsWith('/feeds/')) {
 throw new Error('RSS feed origin not allowed')
 }
 const res = await fetch(feedUrl, {
 headers: {
 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
 },
 })
 if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
 const text = await res.text()
 return this.parseRSS(text)
 } catch (error) {
 console.error('RSS scrape error:', error.message)
 return []
 }
 }

 parseRSS(xml) {
 const items = []
 const entries = xml.split('<entry>')

 for (let i = 1; i < entries.length; i++) {
 const entry = entries[i]
 const videoId = sanitizeYouTubeId(this.extractBetween(entry, '<yt:videoId>', '</yt:videoId>'))
 const title = cleanString(this.decodeHtml(this.extractBetween(entry, '<title>', '</title>')), 180)
 const channel = cleanString(this.decodeHtml(this.extractBetween(entry, '<author><name>', '</name>')), 140)
 const published = cleanString(this.extractBetween(entry, '<published>', '</published>'), 80)

 if (videoId && title) {
 items.push({
 id: `yt-${videoId}`,
 youtubeId: videoId,
 title,
 artist: channel,
 publishedAt: published,
 scrapedAt: new Date().toISOString(),
 source: 'rss',
 })
 }
 }

 return items
 }

 extractBetween(str, start, end) {
 const startIndex = str.indexOf(start)
 if (startIndex === -1) return ''
 const contentStart = startIndex + start.length
 const endIndex = str.indexOf(end, contentStart)
 return endIndex === -1 ? '' : str.slice(contentStart, endIndex)
 }

 decodeHtml(html) {
 const txt = {
 '&quot;': '"',
 '&#39;': "'",
 '&amp;': '&',
 '&lt;': '<',
 '&gt;': '>',
 }
 return html.replace(/&quot;|&#39;|&amp;|&lt;|&gt;/g, m => txt[m])
 }

 async searchYouTube(query, maxResults = 20) {
 const cleanQuery = cleanString(query, 120)
 const safeMaxResults = readLimitedNumber(maxResults, 20, 1, 25)
 if (!this.apiKey || !cleanQuery) {
 console.error('No API key or empty query for YouTube search')
 return []
 }

 await this.ensureRateLimit()

 try {
 const url = new URL(`${YT_API_BASE}/search`)
 url.searchParams.set('part', 'snippet')
 url.searchParams.set('q', cleanQuery)
 url.searchParams.set('maxResults', String(safeMaxResults))
 url.searchParams.set('type', 'video')
 url.searchParams.set('videoEmbeddable', 'true')
 url.searchParams.set('key', this.apiKey)

 const res = await fetch(url)
 if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)

 const data = await res.json()
 return data.items.map(item => {
 const youtubeId = sanitizeYouTubeId(item.id?.videoId)
 if (!youtubeId) return null
 return {
 id: `yt-${youtubeId}`,
 youtubeId,
 title: cleanString(item.snippet?.title, 180) || 'Titre YouTube',
 artist: cleanString(item.snippet?.channelTitle, 140) || 'Chaine YouTube',
 description: cleanString(item.snippet?.description, 500),
 publishedAt: cleanString(item.snippet?.publishedAt, 80),
 thumbnail: cleanString(item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url, 1000),
 scrapedAt: new Date().toISOString(),
 source: 'api',
 }
 }).filter(Boolean)
 } catch (error) {
 console.error('YouTube API search error:', error.message)
 return []
 }
 }

 async scrapeTrending() {
 console.log('[Scraper] Scraping trending videos...')
 const items = await this.fetchRSS(RSS_FEEDS.trending)
 await this.saveToDb(items, 'trending')
 return items
 }

 async scrapeMusic() {
 console.log('[Scraper] Scraping music videos...')
 const items = await this.fetchRSS(RSS_FEEDS.music)
 await this.saveToDb(items, 'music')
 return items
 }

 async scrapeByQuery(query, tag) {
 const cleanQuery = cleanString(query, 120)
 const cleanTag = cleanString(tag, 80) || 'music'
 console.log(`[Scraper] Scraping for "${cleanQuery}"...`)
 const items = await this.searchYouTube(cleanQuery, 25)
 const tagged = items.map(item => ({
 ...item,
 tags: [cleanTag],
 query: cleanQuery,
 }))
 await this.saveToDb(tagged, cleanTag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'music')
 return tagged
 }

 async saveToDb(items, category) {
 for (const item of items) {
 try {
 const existing = await scrapedDb.findOne({ youtubeId: item.youtubeId })
 if (!existing) {
 await scrapedDb.insert({
 ...item,
 category,
 views: 0,
 likes: 0,
 inLibrary: false,
 })
 }
 } catch (error) {
 console.error('Error saving to DB:', error.message)
 }
 }
 console.log(`[Scraper] Saved ${items.length} items for ${category}`)
 }

 async getScrapedItems(options = {}) {
 const { category, limit = 50, query } = options
 const queryObj = {}

 const cleanCategory = cleanString(category, 80)
 const cleanQuery = escapeRegExp(query)

 if (cleanCategory) queryObj.category = cleanCategory
 if (cleanQuery) {
 queryObj.$or = [
 { title: { $regex: cleanQuery, $options: 'i' } },
 { artist: { $regex: cleanQuery, $options: 'i' } },
 ]
 }

 return await scrapedDb.find(queryObj).sort({ scrapedAt: -1 }).limit(readLimitedNumber(limit, 50, 1, 100))
 }

 async markAsLiked(youtubeId) {
 const id = sanitizeYouTubeId(youtubeId)
 if (!id) return
 await scrapedDb.update({ youtubeId: id }, { $set: { inLibrary: true, likedAt: new Date().toISOString() } })
 }

 async startAutoScrape(intervalMinutes = 30) {
 console.log(`[Scraper] Starting auto-scrape every ${intervalMinutes} minutes...`)

 setInterval(async () => {
 try {
 await this.scrapeMusic()
 await this.scrapeTrending()
 } catch (error) {
 console.error('[Scraper] Auto-scrape error:', error.message)
 }
 }, intervalMinutes * 60 * 1000)

 // Initial scrape
 await this.scrapeMusic()
 await this.scrapeTrending()
 }
}

// Export singleton for use in server
export const scraper = new YouTubeScraper(process.env.YOUTUBE_API_KEY || '')
