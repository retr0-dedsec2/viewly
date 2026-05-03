import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { thumbnailFromId } from './utils/youtube'
import { api } from './lib/api'
import { useAuth } from './context/AuthContext'

const PlayerContext = createContext(null)

function trackKey(track) {
 return String(track?.youtubeId || track?.id || '')
}

function normalizePlayableTrack(track = {}) {
 const fallback = TRACKS[0]
 const youtubeId = String(track.youtubeId || fallback.youtubeId)
 return {
 ...fallback,
 ...track,
 id: String(track.id || youtubeId || fallback.id),
 title: String(track.title || fallback.title),
 artist: String(track.artist || fallback.artist),
 duration: Number(track.duration) || fallback.duration || 180,
 youtubeId,
 thumbnail: track.thumbnail || thumbnailFromId(youtubeId),
 tag: track.tag || fallback.tag || 'YouTube',
 }
}

export const TRACKS = [
 { id: 1, title: 'Blinding Lights', artist: 'The Weeknd', duration: 200, emoji: '', youtubeId: '4NRXx6U8ABQ', gradient: 'linear-gradient(135deg,#0b7a5c,#10203c)', tag: 'YouTube Hit' },
 { id: 2, title: 'Alors on danse', artist: 'Stromae', duration: 208, emoji: '', youtubeId: 'VHoT4N43jK8', gradient: 'linear-gradient(135deg,#0d8e72,#16396b)', tag: 'Clip officiel' },
 { id: 3, title: 'One More Time', artist: 'Daft Punk', duration: 320, emoji: '', youtubeId: 'FGBhQbmPwH8', gradient: 'linear-gradient(135deg,#11a37f,#1b2c54)', tag: 'Classic club' },
 { id: 4, title: 'bad guy', artist: 'Billie Eilish', duration: 194, emoji: '', youtubeId: 'DyDfgMOUjCI', gradient: 'linear-gradient(135deg,#1a9d7f,#0f264a)', tag: 'Pop mood' },
 { id: 5, title: 'Derniere Danse', artist: 'Indila', duration: 212, emoji: '', youtubeId: 'K5KAc5CoCuk', gradient: 'linear-gradient(135deg,#19a27b,#14335e)', tag: 'French touch' },
 { id: 6, title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', duration: 270, emoji: '', youtubeId: 'OPf0YbXqDm0', gradient: 'linear-gradient(135deg,#0c8a6e,#112848)', tag: 'Party' },
 { id: 7, title: 'Je veux', artist: 'ZAZ', duration: 220, emoji: '', youtubeId: '0TFNGRYMz1U', gradient: 'linear-gradient(135deg,#10a37f,#16305a)', tag: 'Live vibe' },
 { id: 8, title: 'Turn Down for What', artist: 'DJ Snake & Lil Jon', duration: 214, emoji: '', youtubeId: 'HMUDVMiITOU', gradient: 'linear-gradient(135deg,#0e8e74,#172e57)', tag: 'Energy max' },
].map(track => ({ ...track, thumbnail: thumbnailFromId(track.youtubeId) }))

export function PlayerProvider({ children }) {
 const { isAuthenticated } = useAuth()
 const [queue, setQueue] = useState(TRACKS)
 const [currentTrack, setCurrentTrack] = useState(TRACKS[0])
 const [isPlaying, setIsPlaying] = useState(false)
 const [progress, setProgress] = useState(0)
 const [liked, setLiked] = useState(new Set(TRACKS.slice(0, 3).map(trackKey)))
 const [likedTracks, setLikedTracks] = useState(TRACKS.slice(0, 3))
 const [localHistory, setLocalHistory] = useState([])
 const [volume, setVolume] = useState(70)
 const [isMuted, setIsMuted] = useState(false)
 const [shuffle, setShuffle] = useState(false)
 const [repeatMode, setRepeatMode] = useState('off')
 const lastTrackedRef = useRef('')

 const queueIndex = useMemo(
 () => queue.findIndex(item => trackKey(item) === trackKey(currentTrack)),
 [currentTrack, queue]
 )
 const isLikedTrack = useCallback((track) => liked.has(trackKey(track)), [liked])

 useEffect(() => {
 let cancelled = false
 if (!isAuthenticated) {
 setLiked(new Set(TRACKS.slice(0, 3).map(trackKey)))
 setLikedTracks(TRACKS.slice(0, 3))
 return () => { cancelled = true }
 }
 api.listFavorites()
 .then(data => {
 if (!cancelled) {
 setLiked(new Set((data.ids || []).map(String)))
 setLikedTracks((data.items || []).map(normalizePlayableTrack))
 }
 })
 .catch(() => {})
 return () => { cancelled = true }
 }, [isAuthenticated])

 const play = useCallback((track, nextQueue = null) => {
 const playable = normalizePlayableTrack(track)
 if (nextQueue?.length) setQueue(nextQueue.map(normalizePlayableTrack))
 setCurrentTrack(playable)
 setIsPlaying(true)
 setProgress(0)
 setLocalHistory(prev => [playable, ...prev.filter(item => trackKey(item) !== trackKey(playable))].slice(0, 30))
 }, [])

 const togglePlay = useCallback(() => setIsPlaying(p => !p), [])

 const toggleLike = useCallback(async (trackOrId) => {
 const track = normalizePlayableTrack(typeof trackOrId === 'object' ? trackOrId : queue.find(item => trackKey(item) === String(trackOrId) || String(item.id) === String(trackOrId)) || currentTrack)
 const key = trackKey(track)
 const wasLiked = liked.has(key)
 setLiked(prev => {
 const next = new Set(prev)
 next.has(key) ? next.delete(key) : next.add(key)
 return next
 })
 setLikedTracks(prev => (
 wasLiked
 ? prev.filter(item => trackKey(item) !== key)
 : [track, ...prev.filter(item => trackKey(item) !== key)]
 ))
 if (isAuthenticated && track) {
 try {
 const result = await api.toggleFavorite(track)
 setLiked(prev => {
 const next = new Set(prev)
 if (result.liked) next.add(key)
 else next.delete(key)
 return next
 })
 setLikedTracks(prev => (
 result.liked
 ? [normalizePlayableTrack(result.track || track), ...prev.filter(item => trackKey(item) !== key)]
 : prev.filter(item => trackKey(item) !== key)
 ))
 } catch {
 setLiked(prev => {
 const next = new Set(prev)
 next.has(key) ? next.delete(key) : next.add(key)
 return next
 })
 setLikedTracks(prev => (
 wasLiked
 ? [track, ...prev.filter(item => trackKey(item) !== key)]
 : prev.filter(item => trackKey(item) !== key)
 ))
 }
 }
 }, [currentTrack, isAuthenticated, liked, queue])

 const skipNext = useCallback(() => {
 const idx = queue.findIndex(t => trackKey(t) === trackKey(currentTrack))
 if (queue.length === 0) return
 if (shuffle && queue.length > 1) {
 const pool = queue.filter(item => trackKey(item) !== trackKey(currentTrack))
 const random = pool[Math.floor(Math.random() * pool.length)]
 if (random) play(random)
 return
 }
 const nextIndex = idx + 1
 if (nextIndex >= queue.length && repeatMode === 'off') {
 setIsPlaying(false)
 setProgress(100)
 return
 }
 const next = queue[nextIndex % queue.length]
 if (next) play(next)
 }, [currentTrack, play, queue, repeatMode, shuffle])

 const skipPrev = useCallback(() => {
 const idx = queue.findIndex(t => trackKey(t) === trackKey(currentTrack))
 if (queue.length === 0) return
 const prevIndex = idx <= 0 ? (repeatMode === 'off' ? 0 : queue.length - 1) : idx - 1
 const prev = queue[prevIndex]
 if (prev) play(prev)
 }, [currentTrack, play, queue, repeatMode])

 const toggleMute = useCallback(() => setIsMuted(prev => !prev), [])
 const toggleShuffle = useCallback(() => setShuffle(prev => !prev), [])
 const toggleRepeat = useCallback(() => {
 setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')
 }, [])

 const removeFromQueue = useCallback((index) => {
 setQueue(prev => {
 const next = prev.filter((_, itemIndex) => itemIndex !== index)
 const removedCurrent = trackKey(prev[index]) === trackKey(currentTrack)
 if (removedCurrent && next.length) {
 const nextTrack = next[Math.min(index, next.length - 1)]
 setCurrentTrack(nextTrack)
 setProgress(0)
 }
 if (!next.length) return currentTrack ? [currentTrack] : []
 return next
 })
 }, [currentTrack])

 const clearQueue = useCallback(() => {
 setQueue(currentTrack ? [currentTrack] : [])
 }, [currentTrack])

 useEffect(() => {
 if (!isAuthenticated || !isPlaying || !currentTrack?.youtubeId) return
 const key = `${currentTrack.youtubeId}:${isPlaying}`
 if (lastTrackedRef.current === key) return
 lastTrackedRef.current = key
 api.trackPlay(currentTrack).catch(() => {})
 }, [currentTrack, isAuthenticated, isPlaying])

 return (
 <PlayerContext.Provider value={{
 queue,
 queueIndex,
 currentTrack,
 isPlaying,
 progress,
 liked,
 likedTracks,
 localHistory,
 volume,
 isMuted,
 shuffle,
 repeatMode,
 play,
 togglePlay,
 toggleLike,
 skipNext,
 skipPrev,
 removeFromQueue,
 clearQueue,
 setProgress,
 setVolume,
 toggleMute,
 toggleShuffle,
 toggleRepeat,
 setIsPlaying,
 setQueue,
 isLikedTrack,
 trackKey,
 }}>
 {children}
 </PlayerContext.Provider>
 )
}

export const usePlayer = () => useContext(PlayerContext)
