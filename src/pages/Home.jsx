import { useEffect, useMemo, useState } from 'react'
import { TRACKS, usePlayer } from '../PlayerContext'
import { youtubeWatchUrl } from '../utils/youtube'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import TrackCard from '../components/TrackCard'
import TrackRow from '../components/TrackRow'
import styles from './Home.module.css'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Nuit blanche,'
  if (h < 12) return 'Bonjour,'
  if (h < 18) return 'Bon après-midi,'
  return 'Bonsoir,'
}

export default function Home() {
  const { play, currentTrack } = usePlayer()
  const { isAuthenticated } = useAuth()
  const { settings } = useSiteSettings()
  const [history, setHistory] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [discovery, setDiscovery] = useState({ hot: [], editors: [] })

  useEffect(() => {
    api.discover({ limit: 8 }).then(setDiscovery).catch(() => {})
  }, [currentTrack.youtubeId])

  useEffect(() => {
    if (!isAuthenticated) {
      setHistory([])
      setRecommendations([])
      return
    }
    Promise.all([api.myHistory({ limit: 6 }), api.myRecommendations({ limit: 6 })])
      .then(([h, r]) => {
        setHistory((h.items || []).map(item => item.track).filter(Boolean))
        setRecommendations(r.items || [])
      }).catch(() => {})
  }, [isAuthenticated, currentTrack.youtubeId])

  const heroTrack = recommendations[0] || discovery.hot[0] || TRACKS[1]
  const trending = useMemo(() => (recommendations.length ? recommendations : (discovery.hot.length ? discovery.hot : TRACKS.slice(0, 6))), [recommendations, discovery])
  const recent = useMemo(() => (history.length ? history : (discovery.editors.length ? discovery.editors : TRACKS.slice(0, 6))), [history, discovery])

  return (
    <div className={styles.page}>
      <div className={styles.banner}>{settings.marketingBanner}</div>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>{settings.heroBadge}</span>
          <h1 className={styles.greeting}>{getGreeting()} <em>{settings.heroTitle}</em></h1>
          <p className={styles.sub}>{settings.heroSubtitle}</p>
          <div className={styles.heroActions}>
            <button className={styles.primaryBtn} onClick={() => play(heroTrack, trending)}>{settings.homePrimaryCta}</button>
            <a className={styles.secondaryBtn} href={youtubeWatchUrl(heroTrack.youtubeId)} target="_blank" rel="noreferrer">{settings.homeSecondaryCta} ↗</a>
          </div>
          <div className={styles.heroMetrics}>
            <div><strong>{discovery.hot.length || 6}</strong><span>titres chauds</span></div>
            <div><strong>{isAuthenticated ? 'sync' : 'guest'}</strong><span>mode compte</span></div>
            <div><strong>local</strong><span>DB persistante</span></div>
          </div>
        </div>

        <div className={styles.heroVisual} style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}>
          <div className={styles.heroGlass}>
            <span className={styles.heroBadge}>Lecture en cours</span>
            <strong>{currentTrack.title}</strong>
            <span>{currentTrack.artist}</span>
            <div className={styles.heroStats}><span>catalogue</span><span>favoris</span><span>historique</span></div>
          </div>
        </div>
      </section>

      <section>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>Recommandé pour toi</h2><span className={styles.aiBadge}>{isAuthenticated ? 'personnalisé' : 'public intelligent'}</span></div>
        <div className={styles.scroll}>{trending.map(t => <TrackCard key={`${t.youtubeId || t.id}-rec`} track={t} />)}</div>
      </section>

      <section>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>Repris récemment</h2><span className={styles.aiBadge}>{isAuthenticated ? 'persisté côté backend' : 'sélection éditeur'}</span></div>
        <div className={styles.scroll}>{recent.map(t => <TrackCard key={`${t.youtubeId || t.id}-recent`} track={t} />)}</div>
      </section>

      <section>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>File tendance</h2><button className={styles.seeAll} onClick={() => trending[0] && play(trending[0], trending)}>Lancer la file</button></div>
        <div className={styles.trackList}>{trending.slice(0, 5).map((t, index) => <TrackRow key={`${t.youtubeId || t.id}-row`} track={t} index={index + 1} />)}</div>
      </section>
    </div>
  )
}
