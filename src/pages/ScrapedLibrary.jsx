import { useEffect, useState } from 'react'
import { usePlayer } from '../PlayerContext'
import { api } from '../lib/api'
import TrackCard from '../components/TrackCard'
import styles from './Search.module.css'

export default function ScrapedLibrary() {
 const { play, addToQueue } = usePlayer()
 const [items, setItems] = useState([])
 const [loading, setLoading] = useState(true)
 const [filter, setFilter] = useState('all')
 const [categories, setCategories] = useState([])

 useEffect(() => {
 loadLibrary()
 }, [filter])

 async function loadLibrary() {
 setLoading(true)
 try {
 const result = await api.getScrapedLibrary({
 category: filter === 'all' ? undefined : filter,
 limit: 50,
 })
 setItems(result.items || [])

 // Extract unique categories
 const cats = [...new Set(result.items?.map(i => i.category).filter(Boolean))]
 setCategories(['all', ...cats])
 } catch (error) {
 console.error('Error loading scraped library:', error)
 } finally {
 setLoading(false)
 }
 }

 function normalizeTrack(item) {
 return {
 id: item.id || `yt-${item.youtubeId}`,
 title: item.title || 'Titre inconnu',
 artist: item.artist || 'Artiste inconnu',
 duration: item.duration || 240,
 emoji: '',
 youtubeId: item.youtubeId,
 gradient: 'linear-gradient(135deg,#0c8f66,#10203c)',
 tag: item.source === 'api' ? 'YouTube API' : 'Scraper',
 thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`,
 }
 }

 return (
 <div className={styles.page}>
 <div className={styles.headerRow}>
 <div>
 <h1 className={styles.heading}>Bibliotheque Scrapee</h1>
 <p className={styles.sub}>Contenu importe automatiquement depuis YouTube.</p>
 </div>
 <button className={styles.refreshBtn} onClick={loadLibrary} disabled={loading}>
 {loading ? 'Chargement...' : ' Rafraichir'}
 </button>
 </div>

 <div className={styles.cats}>
 {categories.map(cat => (
 <button
 key={cat}
 className={`${styles.cat} ${filter === cat ? styles.catActive : ''}`}
 onClick={() => setFilter(cat)}
 >
 {cat === 'all' ? 'Tout' : cat}
 </button>
 ))}
 </div>

 {loading ? (
 <div className={styles.empty}>
 <span></span>
 <p>Chargement de la bibliotheque...</p>
 </div>
 ) : items.length === 0 ? (
 <div className={styles.empty}>
 <span></span>
 <p>Aucun contenu scrape</p>
 <span className={styles.emptySub}>
 Utilise le scraper dans le panel Admin pour importer du contenu
 </span>
 </div>
 ) : (
 <section>
 <div className={styles.sectionTitleRow}>
 <div className={styles.sectionTitle}>{items.length} titres</div>
 </div>
 <div className={styles.grid}>
 {items.map((item, idx) => {
 const track = normalizeTrack(item)
 return (
 <TrackCard
 key={track.id}
 track={track}
 onPlay={() => play(track, items.map(normalizeTrack))}
 />
 )
 })}
 </div>
 </section>
 )}
 </div>
 )
}
