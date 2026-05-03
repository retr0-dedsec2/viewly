import { Heart, Pause, Play } from 'lucide-react'
import { usePlayer } from '../PlayerContext'
import styles from './TrackCard.module.css'

export default function TrackCard({ track, size = 'md' }) {
 const { play, currentTrack, isPlaying, toggleLike, isLikedTrack, trackKey } = usePlayer()
 const isActive = trackKey(currentTrack) === trackKey(track)
 const isLiked = isLikedTrack(track)

 return (
 <div className={`${styles.card} ${styles[size]} ${isActive ? styles.active : ''}`} onClick={() => play(track)}>
 <div className={styles.art} style={{ backgroundImage: `url(${track.thumbnail})` }}>
 <div className={styles.artShade} />
 <span className={styles.tag}>{track.tag || 'YouTube'}</span>
 <div className={styles.playOverlay}>{isActive && isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}</div>
 {isActive && isPlaying && (
 <div className={styles.playingBadge} aria-hidden>
 <span /><span /><span />
 </div>
 )}
 </div>

 <div className={styles.info}>
 <span className={styles.title}>{track.title}</span>
 <span className={styles.artist}>{track.artist}</span>
 </div>

 <div className={styles.actions}>
 <button
 className={`${styles.like} ${isLiked ? styles.liked : ''}`}
 onClick={e => { e.stopPropagation(); toggleLike(track) }}
 aria-label="Favori"
 >
 <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
 </button>
 </div>
 </div>
 )
}
