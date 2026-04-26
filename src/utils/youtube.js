export function thumbnailFromId(youtubeId, quality = 'hqdefault') {
  return `https://i.ytimg.com/vi/${youtubeId}/${quality}.jpg`
}

export function youtubeWatchUrl(youtubeId) {
  return `https://www.youtube.com/watch?v=${youtubeId}`
}

export function youtubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

export function normalizeVideoItem(item, index = 0) {
  const snippet = item?.snippet || {}
  const videoId = item?.id?.videoId || item?.id || ''
  const title = snippet.title || 'Titre YouTube'
  const artist = snippet.channelTitle || 'Chaîne YouTube'

  return {
    id: `yt-${videoId}-${index}`,
    title,
    artist,
    duration: 240,
    emoji: '▶',
    youtubeId: videoId,
    gradient: 'linear-gradient(135deg,#0c8f66,#10203c)',
    tag: 'Résultat YouTube',
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
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
  if (!apiKey || !query?.trim()) {
    return { items: [], nextPageToken: '' }
  }

  const {
    maxResults = 12,
    pageToken = '',
    order = 'relevance',
    safeSearch = 'moderate',
  } = options

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', query.trim())
  url.searchParams.set('maxResults', String(maxResults))
  url.searchParams.set('type', 'video')
  url.searchParams.set('videoEmbeddable', 'true')
  url.searchParams.set('safeSearch', safeSearch)
  url.searchParams.set('order', order)
  if (pageToken) url.searchParams.set('pageToken', pageToken)
  url.searchParams.set('key', apiKey)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`YouTube API search failed: ${res.status}`)
  }

  const data = await res.json()
  return {
    items: (data.items || []).map(normalizeVideoItem),
    nextPageToken: data.nextPageToken || '',
  }
}
