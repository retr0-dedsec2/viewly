export function safeYouTubeId(value) {
 const id = String(value || '').trim()
 return /^[A-Za-z0-9_-]{6,32}$/.test(id) ? id : ''
}

export function thumbnailFromId(youtubeId, quality = 'hqdefault') {
 const id = safeYouTubeId(youtubeId)
 return id ? `https://i.ytimg.com/vi/${id}/${quality}.jpg` : ''
}

export function youtubeWatchUrl(youtubeId) {
 const id = safeYouTubeId(youtubeId)
 return id ? `https://www.youtube.com/watch?v=${id}` : 'https://www.youtube.com/'
}

export function youtubeSearchUrl(query) {
 return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

export function normalizeVideoItem(item, index = 0) {
 const snippet = item?.snippet || {}
 const videoId = safeYouTubeId(item?.id?.videoId || item?.id || '')
 const title = snippet.title || 'Titre YouTube'
 const artist = snippet.channelTitle || 'Chaine YouTube'

 return {
 id: `yt-${videoId}-${index}`,
 title,
 artist,
 duration: 240,
 emoji: '',
 youtubeId: videoId,
 gradient: 'linear-gradient(135deg,#0c8f66,#10203c)',
 tag: 'Resultat YouTube',
 thumbnail:
 snippet?.thumbnails?.high?.url ||
 snippet?.thumbnails?.medium?.url ||
 snippet?.thumbnails?.default?.url ||
 thumbnailFromId(videoId),
 description: snippet?.description || '',
 publishedAt: snippet?.publishedAt || '',
 }
}

export async function searchYouTube(query, options = {}) {
 if (!query?.trim()) {
 return { items: [], nextPageToken: '' }
 }

 const {
 maxResults = 12,
 pageToken = '',
 } = options

 const url = new URL('/api/catalog/search-remote', window.location.origin)
 url.searchParams.set('query', query.trim())
 url.searchParams.set('maxResults', String(maxResults))
 if (pageToken) url.searchParams.set('pageToken', pageToken)

 const res = await fetch(url, { credentials: 'include' })
 if (!res.ok) {
 const data = await res.json().catch(() => ({}))
 throw new Error(data.message || `YouTube API search failed: ${res.status}`)
 }

 return res.json()
}
