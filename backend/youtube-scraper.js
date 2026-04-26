import fetch from 'node-fetch'
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

const scrapedDb = Datastore.create({ filename: path.join(dataDir, 'scraped.db'), autoload: true })

const RSS_FEEDS = {
  trending: 'https://www.youtube.com/feeds/trending.xml',
  music: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-9-kyTW8ZkZNDHQJ6FgpwQ',
  hipHop: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-',
  electro: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLrEnWoR732-DtKGaDtdPXEJia7DDn9Y1_',
}

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'

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
      const res = await fetch(url, {
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
      const videoId = this.extractBetween(entry, '<yt:videoId>', '</yt:videoId>')
      const title = this.extractBetween(entry, '<title>', '</title>')
      const channel = this.extractBetween(entry, '<author><name>', '</name>')
      const published = this.extractBetween(entry, '<published>', '</published>')

      if (videoId && title) {
        items.push({
          id: `yt-${videoId}`,
          youtubeId: videoId,
          title: this.decodeHtml(title),
          artist: this.decodeHtml(channel),
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
    if (!this.apiKey) {
      console.error('No API key for YouTube search')
      return []
    }

    await this.ensureRateLimit()

    try {
      const url = new URL(`${YT_API_BASE}/search`)
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('q', query)
      url.searchParams.set('maxResults', String(maxResults))
      url.searchParams.set('type', 'video')
      url.searchParams.set('videoEmbeddable', 'true')
      url.searchParams.set('key', this.apiKey)

      const res = await fetch(url)
      if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)

      const data = await res.json()
      return data.items.map(item => ({
        id: `yt-${item.id.videoId}`,
        youtubeId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        scrapedAt: new Date().toISOString(),
        source: 'api',
      }))
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
    console.log(`[Scraper] Scraping for "${query}"...`)
    const items = await this.searchYouTube(query, 25)
    const tagged = items.map(item => ({
      ...item,
      tags: [tag],
      query: query,
    }))
    await this.saveToDb(tagged, tag.toLowerCase().replace(/\s+/g, '-'))
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

    if (category) queryObj.category = category
    if (query) {
      queryObj.$or = [
        { title: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
      ]
    }

    return await scrapedDb.find(queryObj).sort({ scrapedAt: -1 }).limit(limit)
  }

  async markAsLiked(youtubeId) {
    await scrapedDb.update({ youtubeId }, { $set: { inLibrary: true, likedAt: new Date().toISOString() } })
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
export const scraper = new YouTubeScraper(process.env.VITE_YOUTUBE_API_KEY || '')
