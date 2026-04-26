import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { usePlayer } from '../PlayerContext'
import styles from './Gems.module.css'

function pct(value) {
  return `${Math.max(0, Math.min(100, Math.round(value || 0)))}%`
}

function buildGradient(seed = '') {
  const presets = [
    'linear-gradient(135deg,#0b7a5c,#10203c)',
    'linear-gradient(135deg,#10a37f,#16305a)',
    'linear-gradient(135deg,#1aa889,#153b66)',
    'linear-gradient(135deg,#13806a,#203a5d)',
  ]
  const index = Math.abs(String(seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % presets.length
  return presets[index]
}

export default function Gems() {
  const navigate = useNavigate()
  const { play } = usePlayer()
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [notify, setNotify] = useState(() => new Set(JSON.parse(localStorage.getItem('viewly-gems-notify') || '[]')))
  const [podcastText, setPodcastText] = useState('Résume-moi les nouveautés musicales de la semaine en deux minutes.')
  const [podcastState, setPodcastState] = useState('idle')
  const [coverTitle, setCoverTitle] = useState('Midnight Neon')
  const [coverMessage, setCoverMessage] = useState('')
  const [roomCode, setRoomCode] = useState('ROOM-' + Math.random().toString(36).slice(2, 6).toUpperCase())

  useEffect(() => {
    localStorage.setItem('viewly-gems-notify', JSON.stringify([...notify]))
  }, [notify])

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([api.myTasteProfile(), api.myRecommendations({ limit: 6 }), api.myHistory({ limit: 6 })])
      .then(([tasteResult, recResult, historyResult]) => {
        if (cancelled) return
        if (tasteResult.status === 'fulfilled') setProfile(tasteResult.value.profile)
        if (recResult.status === 'fulfilled') setRecommendations(recResult.value.items || [])
        if (historyResult.status === 'fulfilled') setHistory((historyResult.value.items || []).map(item => item.track || item))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const moodLabel = useMemo(() => {
    if (!profile?.mood) return 'en construction'
    return profile.mood === 'équilibré' ? 'polyvalent' : profile.mood
  }, [profile])

  function toggleNotify(key) {
    setNotify(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function speakPodcast() {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(podcastText)
    utterance.lang = 'fr-FR'
    utterance.onstart = () => setPodcastState('speaking')
    utterance.onend = () => setPodcastState('idle')
    window.speechSynthesis.speak(utterance)
  }

  function stopPodcast() {
    window.speechSynthesis?.cancel()
    setPodcastState('idle')
  }

  async function copyCoverCss() {
    const css = `background: ${buildGradient(coverTitle)}; title: ${coverTitle || 'Untitled Mood'};`
    await navigator.clipboard?.writeText(css)
    setCoverMessage('Cover copiée.')
  }

  function sendRemixPrompt(track, index) {
    const prompt = `Remix ${track.title} de ${track.artist} en ${index === 0 ? 'lo-fi cinématique' : index === 1 ? 'club énergique' : 'ambient nocturne'} avec une structure courte.`
    localStorage.setItem('viewly-studio-prompt', prompt)
    navigate('/studio')
  }

  const liveCover = {
    background: buildGradient(coverTitle),
    title: coverTitle || 'Untitled Mood',
    subtitle: profile?.topTags?.[0]?.name || 'Cover générée depuis tes goûts',
  }

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.heading}>◈ Pépites</h1>
        <p className={styles.sub}>Des modules utiles reliés à ton historique, tes favoris et ton profil musical.</p>
      </div>

      <div className={styles.heroGrid}>
        <section className={`${styles.gemCard} ${styles.featured}`}>
          <div className={styles.gemTop}><span className={styles.gemIcon}>🧬</span><span className={`${styles.badge} ${styles.ai}`}>Goûts</span></div>
          <h3 className={styles.gemTitle}>ADN musical</h3>
          <p className={styles.gemDesc}>{profile?.summary || 'Connecte-toi et lance quelques lectures pour révéler ton profil.'}</p>
          <div className={styles.metricGrid}>
            <div className={styles.metric}><span>Énergie</span><strong>{pct(profile?.energyScore)}</strong></div>
            <div className={styles.metric}><span>Diversité</span><strong>{pct(profile?.diversityScore)}</strong></div>
            <div className={styles.metric}><span>Découverte</span><strong>{pct(profile?.discoveryScore)}</strong></div>
          </div>
          <div className={styles.tags}>{(profile?.topArtists || []).slice(0, 3).map(item => <span key={item.name} className={styles.tag}>{item.name}</span>)}</div>
        </section>

        <section className={styles.gemCard}>
          <div className={styles.gemTop}><span className={styles.gemIcon}>🎯</span><span className={`${styles.badge} ${styles.new}`}>Actif</span></div>
          <h3 className={styles.gemTitle}>Mood detector</h3>
          <p className={styles.gemDesc}>Ton humeur d’écoute actuelle est <strong>{moodLabel}</strong>. Ouvre la recherche ou lance une reco adaptée.</p>
          <div className={styles.inlineList}>{(profile?.topTags || []).slice(0, 4).map(item => <span key={item.name} className={styles.inlineChip}>{item.name}</span>)}</div>
          <div className={styles.actionRow}>
            <button className={styles.primaryBtn} onClick={() => recommendations[0] && play(recommendations[0], recommendations)}>Lancer une reco</button>
            <button className={styles.secondaryBtn} onClick={() => navigate('/search')}>Explorer</button>
          </div>
        </section>
      </div>

      <div className={styles.grid}>
        <section className={styles.gemCard}>
          <div className={styles.gemTop}><span className={styles.gemIcon}>🪄</span><span className={`${styles.badge} ${styles.ai}`}>Cover</span></div>
          <h3 className={styles.gemTitle}>Cover generator</h3>
          <p className={styles.gemDesc}>Crée une cover rapide depuis un titre de playlist. Pratique pour donner une identité visuelle sans passer par un outil externe.</p>
          <input className={styles.input} value={coverTitle} onChange={e => setCoverTitle(e.target.value)} placeholder="Nom de playlist" />
          <div className={styles.coverPreview} style={{ background: liveCover.background }}>
            <strong>{liveCover.title}</strong>
            <span>{liveCover.subtitle}</span>
          </div>
          <div className={styles.actionRow}>
            <button className={styles.secondaryBtn} onClick={copyCoverCss}>Copier la cover</button>
            {coverMessage ? <span className={styles.notice}>{coverMessage}</span> : null}
          </div>
        </section>

        <section className={styles.gemCard}>
          <div className={styles.gemTop}><span className={styles.gemIcon}>📻</span><span className={`${styles.badge} ${styles.beta}`}>Audio</span></div>
          <h3 className={styles.gemTitle}>Podcast mode</h3>
          <p className={styles.gemDesc}>Transforme un texte en lecture audio directement dans le navigateur grâce à la synthèse vocale intégrée.</p>
          <textarea className={styles.textarea} rows="4" value={podcastText} onChange={e => setPodcastText(e.target.value)} />
          <div className={styles.actionRow}>
            <button className={styles.primaryBtn} onClick={speakPodcast}>{podcastState === 'speaking' ? 'Lecture…' : 'Lire'}</button>
            <button className={styles.secondaryBtn} onClick={stopPodcast}>Stop</button>
          </div>
        </section>

        <section className={styles.gemCard}>
          <div className={styles.gemTop}><span className={styles.gemIcon}>🤝</span><span className={`${styles.badge} ${styles.live}`}>Sync</span></div>
          <h3 className={styles.gemTitle}>Duo listen</h3>
          <p className={styles.gemDesc}>Génère un code de room pour partager ce que tu écoutes avec un ami. Tu peux le copier et l’envoyer en un clic.</p>
          <div className={styles.roomCode}>{roomCode}</div>
          <div className={styles.actionRow}>
            <button className={styles.primaryBtn} onClick={() => navigator.clipboard?.writeText(roomCode)}>Copier le code</button>
            <button className={styles.secondaryBtn} onClick={() => setRoomCode('ROOM-' + Math.random().toString(36).slice(2, 6).toUpperCase())}>Nouveau code</button>
          </div>
        </section>

        <section className={styles.gemCard}>
          <div className={styles.gemTop}><span className={styles.gemIcon}>🎛️</span><span className={`${styles.badge} ${styles.new}`}>Mix</span></div>
          <h3 className={styles.gemTitle}>Remix builder</h3>
          <p className={styles.gemDesc}>À partir de ton historique récent, récupère des idées de prompt pour remixer un titre dans le Studio.</p>
          <div className={styles.promptList}>
            {(history.slice(0, 3)).map((track, index) => (
              <button key={`${track.youtubeId || track.id}-${index}`} className={styles.promptChip} onClick={() => sendRemixPrompt(track, index)}>
                Remix {track.title} en {index === 0 ? 'lo-fi cinématique' : index === 1 ? 'club énergique' : 'ambient nocturne'}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.comingSoon}>
        <h2 className={styles.comingTitle}>Alertes et fonctionnalités activables</h2>
        <div className={styles.comingList}>
          {[
            ['cover', '🪄', 'Cover IA', 'Recevoir une alerte quand la génération d’images de cover avancée est disponible.'],
            ['voice', '🎙️', 'Chante & trouve', 'Être notifié quand la reconnaissance vocale de mélodie est prête.'],
            ['radio', '🌍', 'Radio monde', 'Activer une vue radios et scènes locales basée sur les genres.'],
          ].map(([key, icon, title, desc]) => (
            <div key={key} className={styles.comingItem}>
              <span className={styles.comingIcon}>{icon}</span>
              <div className={styles.comingInfo}>
                <span className={styles.comingName}>{title}</span>
                <span className={styles.comingDesc}>{desc}</span>
              </div>
              <button className={styles.notifyBtn} onClick={() => toggleNotify(key)}>{notify.has(key) ? 'Activé' : 'Activer'}</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.comingTitle}>Recommandé pour toi</h2>
          <button className={styles.secondaryBtn} onClick={() => navigate('/library')}>Voir ma bibliothèque</button>
        </div>
        {loading ? <div className={styles.notice}>Chargement de tes modules…</div> : (
          <div className={styles.recoGrid}>
            {recommendations.slice(0, 4).map(track => (
              <button key={track.youtubeId || track.id} className={styles.recoCard} onClick={() => play(track, recommendations)}>
                <img src={track.thumbnail} alt={track.title} />
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
