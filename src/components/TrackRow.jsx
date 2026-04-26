import { ExternalLink, Heart } from 'lucide-react'
import { usePlayer } from '../PlayerContext'
import { youtubeWatchUrl } from '../utils/youtube'
import styles from './TrackRow.module.css'

function fmtTime(s) {
  const safe = Math.max(0, Math.floor(Number(s) || 0))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export default function TrackRow({ track, index }) {
  const { play, currentTrack, isPlaying, toggleLike, isLikedTrack, trackKey } = usePlayer()
  const isActive = trackKey(currentTrack) === trackKey(track)
  const isLiked = isLikedTrack(track)

  return (
    <div className={`${styles.row} ${isActive ? styles.active : ''}`} onClick={() => play(track)}>
      <div className={styles.left}>
        {index ? <span className={styles.index}>{String(index).padStart(2, '0')}</span> : null}
        <div className={styles.art} style={{ backgroundImage: `url(${track.thumbnail})` }}>
          <div className={styles.artShade} />
          {isActive && isPlaying && <div className={styles.playingDots}><span /><span /><span /></div>}
        </div>
        <div className={styles.info}>
          <span className={styles.title}>{track.title}</span>
          <span className={styles.artist}>{track.artist}</span>
        </div>
      </div>
      <div className={styles.right}>
        <a className={styles.open} href={youtubeWatchUrl(track.youtubeId)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} aria-label={`Ouvrir ${track.title} sur YouTube`}>YT <ExternalLink size={12} /></a>
        <button className={`${styles.like} ${isLiked ? styles.liked : ''}`} onClick={e => { e.stopPropagation(); toggleLike(track) }} aria-label="Favori"><Heart size={14} fill={isLiked ? 'currentColor' : 'none'} /></button>
        <span className={styles.duration}>{fmtTime(track.duration)}</span>
      </div>
    </div>
  )
}
