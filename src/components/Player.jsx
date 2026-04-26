import { useEffect, useRef, useState } from 'react'
import {
  Heart,
  Library as LibraryIcon,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayer } from '../PlayerContext'
import LibraryDrawer from './LibraryDrawer'
import QueueDrawer from './QueueDrawer'
import styles from './Player.module.css'

function fmtTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safe / 60)
  const sec = safe % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT)

  return new Promise(resolve => {
    const existing = document.getElementById('youtube-iframe-api')
    if (!existing) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }

    const check = setInterval(() => {
      if (window.YT?.Player) {
        clearInterval(check)
        resolve(window.YT)
      }
    }, 150)
  })
}

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    progress,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    togglePlay,
    toggleLike,
    isLikedTrack,
    skipNext,
    skipPrev,
    setProgress,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setIsPlaying,
  } = usePlayer()

  const playerRef = useRef(null)
  const mountRef = useRef(null)
  const progressTimerRef = useRef(null)
  const skipNextRef = useRef(skipNext)
  const repeatModeRef = useRef(repeatMode)
  const [duration, setDuration] = useState(currentTrack.duration)
  const [ready, setReady] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  useEffect(() => { skipNextRef.current = skipNext }, [skipNext])
  useEffect(() => { repeatModeRef.current = repeatMode }, [repeatMode])

  useEffect(() => {
    let cancelled = false

    loadYouTubeAPI().then(YT => {
      if (cancelled || playerRef.current) return

      playerRef.current = new YT.Player(mountRef.current, {
        width: '100%',
        height: '100%',
        videoId: currentTrack.youtubeId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: event => {
            setReady(true)
            event.target.setVolume(volume)
            if (isMuted) event.target.mute()
            setDuration(event.target.getDuration() || currentTrack.duration)
          },
          onStateChange: event => {
            if (event.data === YT.PlayerState.ENDED) {
              if (repeatModeRef.current === 'one') {
                event.target.seekTo(0, true)
                event.target.playVideo()
                setIsPlaying(true)
                return
              }
              skipNextRef.current()
            }
            if (event.data === YT.PlayerState.PLAYING) setIsPlaying(true)
            if (event.data === YT.PlayerState.PAUSED) setIsPlaying(false)
          },
        },
      })
    })

    return () => {
      cancelled = true
      clearInterval(progressTimerRef.current)
    }
  }, [currentTrack.duration, currentTrack.youtubeId, isMuted, isPlaying, setIsPlaying, skipNext, volume])

  useEffect(() => {
    if (!playerRef.current || !ready) return

    playerRef.current.loadVideoById({
      videoId: currentTrack.youtubeId,
      startSeconds: 0,
    })

    setDuration(currentTrack.duration)
    setProgress(0)
  }, [currentTrack, ready, setProgress])

  useEffect(() => {
    if (!playerRef.current || !ready) return

    if (isPlaying) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [isPlaying, ready])

  useEffect(() => {
    if (!playerRef.current || !ready) return

    if (isMuted || volume === 0) {
      playerRef.current.mute()
    } else {
      playerRef.current.unMute()
      playerRef.current.setVolume(volume)
    }
  }, [volume, isMuted, ready])

  useEffect(() => {
    clearInterval(progressTimerRef.current)
    if (!playerRef.current || !ready) return

    progressTimerRef.current = setInterval(() => {
      const player = playerRef.current
      const current = player.getCurrentTime?.() || 0
      const total = player.getDuration?.() || duration || currentTrack.duration
      if (total > 0) {
        setDuration(total)
        setProgress((current / total) * 100)
      }
    }, 500)

    return () => clearInterval(progressTimerRef.current)
  }, [ready, duration, currentTrack.duration, setProgress])

  const currentSec = (progress / 100) * duration
  const isLiked = isLikedTrack(currentTrack)

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const targetSec = (pct / 100) * duration
    setProgress(pct)
    playerRef.current?.seekTo(targetSec, true)
  }

  function handleVolume(e) {
    const next = Number(e.target.value)
    setVolume(next)
    if (next > 0 && isMuted) toggleMute()
  }

  return (
    <footer className={styles.player}>
      <div className={styles.hiddenEmbed} aria-hidden>
        <div ref={mountRef} />
      </div>

      <LibraryDrawer isOpen={libraryOpen} onClose={() => setLibraryOpen(false)} />
      <QueueDrawer isOpen={queueOpen} onClose={() => setQueueOpen(false)} />

      <div className={styles.trackInfo}>
        <div className={styles.artWrap}>
          <div className={styles.art} style={{ backgroundImage: `url(${currentTrack.thumbnail})` }} />
          <span className={styles.liveBadge}>YT</span>
        </div>

        <div className={styles.info}>
          <div className={styles.metaTop}>
            <span className={styles.title}>{currentTrack.title}</span>
            <span className={styles.tag}>{currentTrack.tag}</span>
          </div>
          <span className={styles.artist}>{currentTrack.artist}</span>
          <a
            className={styles.youtubeLink}
            href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir sur YouTube ↗
          </a>
        </div>

        <button
          className={`${styles.likeBtn} ${isLiked ? styles.liked : ''}`}
          onClick={() => toggleLike(currentTrack)}
          aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.center}>
        <div className={styles.controls}>
          <button className={`${styles.ctrl} ${shuffle ? styles.ctrlActive : ''}`} onClick={toggleShuffle} aria-label="Aléatoire" aria-pressed={shuffle}>
            <Shuffle size={16} />
          </button>
          <button className={styles.ctrl} onClick={skipPrev} aria-label="Précédent">
            <SkipBack size={17} />
          </button>
          <button
            className={styles.playBtn}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button className={styles.ctrl} onClick={skipNext} aria-label="Suivant">
            <SkipForward size={17} />
          </button>
          <button className={`${styles.ctrl} ${repeatMode !== 'off' ? styles.ctrlActive : ''}`} onClick={toggleRepeat} aria-label={repeatMode === 'one' ? 'Répéter un titre' : 'Répéter la file'} aria-pressed={repeatMode !== 'off'}>
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        <div className={styles.progressRow}>
          <span className={styles.time}>{fmtTime(currentSec)}</span>
          <div className={styles.progressTrack} onClick={handleSeek} role="slider" aria-label="Progression">
            <div className={styles.progressFill} style={{ width: `${Math.min(progress, 100)}%` }} />
            <div className={styles.progressThumb} style={{ left: `${Math.min(progress, 100)}%` }} />
          </div>
          <span className={styles.time}>{fmtTime(duration)}</span>
        </div>
      </div>

      <div className={styles.right}>
        <button className={styles.ctrl} onClick={() => setLibraryOpen(true)} aria-label="Ouvrir la bibliothèque">
          <LibraryIcon size={16} />
        </button>
        <button className={styles.ctrl} onClick={() => setQueueOpen(true)} aria-label="Ouvrir la file">
          <ListMusic size={16} />
        </button>

        <div className={styles.statusPill}>
          <span className={styles.statusDot} />
          {ready ? 'YouTube connecté' : 'Chargement…'}
        </div>

        <button className={styles.ctrl} onClick={toggleMute} aria-label="Couper le son">
          {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <input
          className={styles.volTrack}
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolume}
          aria-label="Volume"
        />
      </div>
    </footer>
  )
}
