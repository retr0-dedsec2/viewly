import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Copy, Dna, Image as ImageIcon, Library, Mic2, Play, Radio, Search, Target, WandSparkles } from 'lucide-react'
import { usePlayer } from '../PlayerContext'
import { api } from '../lib/api'
import styles from './ExtraFeatures.module.css'

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

function createRoomCode() {
 const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
 const values = new Uint8Array(4)
 crypto.getRandomValues(values)
 return `ROOM-${Array.from(values, value => chars[value % chars.length]).join('')}`
}

function moodCopy(mood) {
 if (!mood) return 'en construction'
 if (mood === 'equilibre') return 'polyvalent'
 if (mood === 'energique') return 'energique'
 return mood
}

export default function ExtraFeatures() {
 const navigate = useNavigate()
 const { play } = usePlayer()
 const [profile, setProfile] = useState(null)
 const [recommendations, setRecommendations] = useState([])
 const [history, setHistory] = useState([])
 const [loading, setLoading] = useState(true)
 const [notify, setNotify] = useState(() => new Set())
 const [podcastText, setPodcastText] = useState('Resume-moi les nouveautes musicales de la semaine en deux minutes.')
 const [podcastState, setPodcastState] = useState('idle')
 const [coverTitle, setCoverTitle] = useState('Midnight Neon')
 const [coverMessage, setCoverMessage] = useState('')
 const [roomCode, setRoomCode] = useState(() => createRoomCode())

 useEffect(() => {
 let cancelled = false
 Promise.allSettled([
 api.myTasteProfile(),
 api.myRecommendations({ limit: 6 }),
 api.myHistory({ limit: 6 }),
 ]).then(([tasteResult, recResult, historyResult]) => {
 if (cancelled) return
 if (tasteResult.status === 'fulfilled') setProfile(tasteResult.value.profile)
 if (recResult.status === 'fulfilled') setRecommendations(recResult.value.items || [])
 if (historyResult.status === 'fulfilled') setHistory((historyResult.value.items || []).map(item => item.track || item))
 }).finally(() => {
 if (!cancelled) setLoading(false)
 })
 return () => { cancelled = true }
 }, [])

 const liveCover = useMemo(() => ({
 background: buildGradient(coverTitle),
 title: coverTitle || 'Untitled Mood',
 subtitle: profile?.topTags?.[0]?.name || 'Cover generee depuis tes gouts',
 }), [coverTitle, profile])

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
 setCoverMessage('Cover copiee.')
 }

 function sendRemixPrompt(track, index) {
 const prompt = `Remix ${track.title} de ${track.artist} en ${index === 0 ? 'lo-fi cinematique' : index === 1 ? 'club energique' : 'ambient nocturne'} avec une structure courte.`
 navigate('/studio', { state: { prompt } })
 }

 return (
 <section className={styles.extra}>
 <div className={styles.header}>
 <div>
 <span className={styles.kicker}>Pepites integrees</span>
 <h2>Fonctionnalites supplementaires</h2>
 <p>Des modules utiles rattaches au Studio, sans page dediee ni stockage navigateur.</p>
 </div>
 <WandSparkles size={22} />
 </div>

 <div className={styles.heroGrid}>
 <article className={`${styles.card} ${styles.featured}`}>
 <div className={styles.cardTop}><Dna size={19} /><span className={styles.badge}>Gouts</span></div>
 <h3>ADN musical</h3>
 <p>{profile?.summary || 'Connecte-toi et lance quelques lectures pour reveler ton profil.'}</p>
 <div className={styles.metricGrid}>
 <div><span>Energie</span><strong>{pct(profile?.energyScore)}</strong></div>
 <div><span>Diversite</span><strong>{pct(profile?.diversityScore)}</strong></div>
 <div><span>Decouverte</span><strong>{pct(profile?.discoveryScore)}</strong></div>
 </div>
 <div className={styles.tags}>{(profile?.topArtists || []).slice(0, 3).map(item => <span key={item.name}>{item.name}</span>)}</div>
 </article>

 <article className={styles.card}>
 <div className={styles.cardTop}><Target size={19} /><span className={styles.badge}>Actif</span></div>
 <h3>Mood detector</h3>
 <p>Ton humeur ecoute actuelle est <strong>{moodCopy(profile?.mood)}</strong>. Lance une reco adaptee ou explore le catalogue.</p>
 <div className={styles.tags}>{(profile?.topTags || []).slice(0, 4).map(item => <span key={item.name}>{item.name}</span>)}</div>
 <div className={styles.actions}>
 <button className={styles.primaryBtn} onClick={() => recommendations[0] && play(recommendations[0], recommendations)}>
 <Play size={14} fill="currentColor" /> Lancer une reco
 </button>
 <button className={styles.secondaryBtn} onClick={() => navigate('/search')}>
 <Search size={14} /> Explorer
 </button>
 </div>
 </article>
 </div>

 <div className={styles.grid}>
 <article className={styles.card}>
 <div className={styles.cardTop}><ImageIcon size={19} /><span className={styles.badge}>Cover</span></div>
 <h3>Cover generator</h3>
 <p>Cree une cover rapide depuis un titre ou une playlist pour poser une identite visuelle.</p>
 <input className={styles.input} value={coverTitle} onChange={e => setCoverTitle(e.target.value)} placeholder="Nom de playlist" />
 <div className={styles.coverPreview} style={{ background: liveCover.background }}>
 <strong>{liveCover.title}</strong>
 <span>{liveCover.subtitle}</span>
 </div>
 <div className={styles.actions}>
 <button className={styles.secondaryBtn} onClick={copyCoverCss}><Copy size={14} /> Copier la cover</button>
 {coverMessage ? <span className={styles.notice}>{coverMessage}</span> : null}
 </div>
 </article>

 <article className={styles.card}>
 <div className={styles.cardTop}><Mic2 size={19} /><span className={styles.badge}>Audio</span></div>
 <h3>Podcast mode</h3>
 <p>Transforme un texte en lecture audio directement dans le navigateur.</p>
 <textarea className={styles.textarea} rows="4" value={podcastText} onChange={e => setPodcastText(e.target.value)} />
 <div className={styles.actions}>
 <button className={styles.primaryBtn} onClick={speakPodcast}>{podcastState === 'speaking' ? 'Lecture...' : 'Lire'}</button>
 <button className={styles.secondaryBtn} onClick={stopPodcast}>Stop</button>
 </div>
 </article>

 <article className={styles.card}>
 <div className={styles.cardTop}><Radio size={19} /><span className={styles.badge}>Sync</span></div>
 <h3>Duo listen</h3>
 <p>Genere un code de room pour partager ce que tu ecoutes en un clic.</p>
 <div className={styles.roomCode}>{roomCode}</div>
 <div className={styles.actions}>
 <button className={styles.primaryBtn} onClick={() => navigator.clipboard?.writeText(roomCode)}><Copy size={14} /> Copier</button>
 <button className={styles.secondaryBtn} onClick={() => setRoomCode(createRoomCode())}>Nouveau</button>
 </div>
 </article>

 <article className={styles.card}>
 <div className={styles.cardTop}><WandSparkles size={19} /><span className={styles.badge}>Mix</span></div>
 <h3>Remix builder</h3>
 <p>Recupere des idees de prompt a partir de ton historique recent.</p>
 <div className={styles.promptList}>
 {history.slice(0, 3).map((track, index) => (
 <button key={`${track.youtubeId || track.id}-${index}`} className={styles.promptChip} onClick={() => sendRemixPrompt(track, index)}>
 Remix {track.title} en {index === 0 ? 'lo-fi cinematique' : index === 1 ? 'club energique' : 'ambient nocturne'}
 </button>
 ))}
 {!history.length ? <span className={styles.notice}>Lance quelques titres pour generer des idees.</span> : null}
 </div>
 </article>
 </div>

 <div className={styles.footerGrid}>
 <div className={styles.comingSoon}>
 <h3>Modules activables</h3>
 {[
 ['cover', 'Cover IA avancee'],
 ['voice', 'Chante et trouve'],
 ['radio', 'Radio monde'],
 ].map(([key, label]) => (
 <button key={key} className={styles.toggleRow} onClick={() => toggleNotify(key)}>
 <Bell size={15} />
 <span>{label}</span>
 <strong>{notify.has(key) ? 'Active' : 'Activer'}</strong>
 </button>
 ))}
 </div>

 <div className={styles.recos}>
 <div className={styles.recoHead}>
 <h3>Recommande pour toi</h3>
 <button className={styles.secondaryBtn} onClick={() => navigate('/library')}><Library size={14} /> Bibliotheque</button>
 </div>
 {loading ? <div className={styles.notice}>Chargement des modules...</div> : (
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
 </div>
 </div>
 </section>
 )
}
