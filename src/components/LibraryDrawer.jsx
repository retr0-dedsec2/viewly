import { useState } from 'react'
import { Heart, History, ListMusic, Music, Play, X } from 'lucide-react'
import { TRACKS, usePlayer } from '../PlayerContext'
import { usePlaylists } from '../context/PlaylistContext'
import styles from './LibraryDrawer.module.css'

export default function LibraryDrawer({ isOpen, onClose }) {
 const { localHistory, likedTracks, liked, play, trackKey } = usePlayer()
 const { playlists } = usePlaylists()
 const [activeTab, setActiveTab] = useState('liked')

 if (!isOpen) return null

 const visibleLikedTracks = likedTracks.length
 ? likedTracks
 : TRACKS.filter(track => liked.has(trackKey(track)))

 return (
 <>
 <div className={styles.backdrop} onClick={onClose} />
 <div className={styles.drawer}>
 <div className={styles.header}>
 <h2>Bibliotheque</h2>
 <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer la bibliotheque">
 <X size={16} />
 </button>
 </div>

 <div className={styles.tabs}>
 <button
 className={`${styles.tab} ${activeTab === 'liked' ? styles.active : ''}`}
 onClick={() => setActiveTab('liked')}
 >
 Favoris ({visibleLikedTracks.length})
 </button>
 <button
 className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
 onClick={() => setActiveTab('history')}
 >
 Historique
 </button>
 <button
 className={`${styles.tab} ${activeTab === 'playlists' ? styles.active : ''}`}
 onClick={() => setActiveTab('playlists')}
 >
 Playlists
 </button>
 </div>

 <div className={styles.list}>
 {activeTab === 'liked' && (
 visibleLikedTracks.length === 0 ? (
 <div className={styles.empty}>
 <Heart className={styles.emptyIcon} size={44} />
 <p>Aucun favori</p>
 <span className={styles.emptySub}>Like des titres pour les voir ici</span>
 </div>
 ) : (
 visibleLikedTracks.map(track => (
 <div key={trackKey(track)} className={styles.item} onClick={() => play(track)}>
 <div className={styles.art} style={{ backgroundImage: `url(${track.thumbnail})` }} />
 <div className={styles.info}>
 <span className={styles.title}>{track.title}</span>
 <span className={styles.artist}>{track.artist}</span>
 </div>
 <div className={styles.actions}>
 <button className={styles.actionBtn} aria-label={`Lire ${track.title}`}><Play size={14} fill="currentColor" /></button>
 </div>
 </div>
 ))
 )
 )}

 {activeTab === 'history' && (
 localHistory.length === 0 ? (
 <div className={styles.empty}>
 <History className={styles.emptyIcon} size={44} />
 <p>Aucun historique</p>
 <span className={styles.emptySub}>Les titres ecoutes apparaitront ici</span>
 </div>
 ) : (
 localHistory.map(track => (
 <div key={trackKey(track)} className={styles.item} onClick={() => play(track)}>
 <div className={styles.art} style={{ backgroundImage: `url(${track.thumbnail})` }} />
 <div className={styles.info}>
 <span className={styles.title}>{track.title}</span>
 <span className={styles.artist}>{track.artist}</span>
 <span className={styles.meta}>
 <span className={styles.tag}>Ecoute</span>
 </span>
 </div>
 </div>
 ))
 )
 )}

 {activeTab === 'playlists' && (
 playlists.length === 0 ? (
 <div className={styles.empty}>
 <ListMusic className={styles.emptyIcon} size={44} />
 <p>Aucune playlist</p>
 <span className={styles.emptySub}>Cree ta premiere playlist</span>
 </div>
 ) : (
 playlists.map(playlist => (
 <div key={playlist.id} className={styles.item} onClick={() => playlist.tracks?.[0] && play(playlist.tracks[0], playlist.tracks)}>
 <div className={styles.art} style={playlist.cover ? { backgroundImage: `url(${playlist.cover})` } : { background: 'var(--surface3)' }}>
 {!playlist.cover && <Music size={18} />}
 </div>
 <div className={styles.info}>
 <span className={styles.title}>{playlist.title}</span>
 <span className={styles.meta}>{playlist.trackCount || playlist.tracks?.length || 0} titres</span>
 </div>
 <div className={styles.actions}>
 <button className={styles.actionBtn} aria-label={`Lire ${playlist.title}`}><Play size={14} fill="currentColor" /></button>
 </div>
 </div>
 ))
 )
 )}
 </div>
 </div>
 </>
 )
}
