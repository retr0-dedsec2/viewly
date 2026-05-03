import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Heart, Play, Sparkles } from 'lucide-react'
import { usePlayer } from '../PlayerContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { thumbnailFromId } from '../utils/youtube'
import ExtraFeatures from '../components/ExtraFeatures'
import styles from './Studio.module.css'

const STYLES = ['Lo-fi', 'Electro', 'Cinematique', 'Jazz', 'Ambient', 'Hip-Hop', 'Orchestral', 'Vaporwave']
const MOODS = ['Melancolique', 'Energique', 'Romantique', 'Epique', 'Detendu', 'Mysterieux']
const ALLOW_LOCAL_STUDIO_DEMO = !import.meta.env.PROD
const PREVIEW_BY_STYLE = {
 'Lo-fi': 'jfKfPfyJRdk',
 'Electro': 'FGBhQbmPwH8',
 Cinematique: '2Vv-BfVoq4g',
 Jazz: 'Dx5qFachd3A',
 Ambient: 'DWcJFNfaw9c',
 'Hip-Hop': 'OPf0YbXqDm0',
 Orchestral: 'K5KAc5CoCuk',
 Vaporwave: '4NRXx6U8ABQ',
}

const HISTORY = [
 { id: 'h1', name: 'Epic Trailer Synth', style: 'Cinematique', duration: '3:20', durationSeconds: 200, youtubeId: '2Vv-BfVoq4g', gradient: 'linear-gradient(135deg,#5856d6,#af52de)' },
 { id: 'h2', name: 'Morning Chill', style: 'Ambient', duration: '4:05', durationSeconds: 245, youtubeId: 'DWcJFNfaw9c', gradient: 'linear-gradient(135deg,#00cec9,#55efc4)' },
 { id: 'h3', name: 'Midnight Lo-fi', style: 'Lo-fi', duration: '2:50', durationSeconds: 170, youtubeId: 'jfKfPfyJRdk', gradient: 'linear-gradient(135deg,#6c5ce7,#a29bfe)' },
]

function WaveBar({ delay }) {
 return (
 <div
 className={styles.waveBar}
 style={{ animationDelay: `${delay}s` }}
 />
 )
}

export default function Studio() {
 const location = useLocation()
 const { currentUser, isAuthenticated } = useAuth()
 const [prompt, setPrompt] = useState(() => location.state?.prompt || '')
 const [selectedStyles, setSelectedStyles] = useState(['Lo-fi'])
 const [selectedMood, setSelectedMood] = useState('Melancolique')
 const [generating, setGenerating] = useState(false)
 const [generated, setGenerated] = useState(null)
 const [studioMessage, setStudioMessage] = useState('')
 const [aiConfig, setAiConfig] = useState({ providers: {}, defaultProvider: 'openai', usage: { limits: {} }, access: {} })
 const [provider, setProvider] = useState('openai')
 const { play, toggleLike, isLikedTrack } = usePlayer()
 const providerOptions = useMemo(() => Object.entries(aiConfig.providers || {}), [aiConfig.providers])
 const canUseAi = Boolean(currentUser?.access?.canUseAi || aiConfig.access?.canUseAi)

 useEffect(() => {
 if (!isAuthenticated) return
 api.aiConfig()
 .then(data => {
 setAiConfig(data)
 setProvider(data.defaultProvider || 'openai')
 })
 .catch(() => {})
 }, [isAuthenticated])

 function toggleStyle(s) {
 setSelectedStyles(prev =>
 prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
 )
 }

 function buildLocalGenerated(idea = null, source = 'Demo local') {
 const name = prompt.trim()
 ? (idea?.title || prompt.slice(0, 28) + (prompt.length > 28 ? '...' : ''))
 : `${selectedStyles[0] || 'Mix'} - ${selectedMood}`
 const mainStyle = idea?.style || selectedStyles[0] || 'Lo-fi'
 const youtubeId = PREVIEW_BY_STYLE[mainStyle] || PREVIEW_BY_STYLE['Lo-fi']
 const track = {
 id: `studio-${Date.now()}`,
 title: name,
 artist: source,
 duration: 167,
 emoji: 'music',
 youtubeId,
 thumbnail: thumbnailFromId(youtubeId),
 gradient: 'linear-gradient(135deg,#5856d6,#af52de)',
 tag: idea?.tags?.[0] || `${mainStyle} preview`,
 }
 return { name, style: idea?.style || selectedStyles.join('  -  '), duration: '2:47', track, description: idea?.description || '' }
 }

 async function generate() {
 if (generating) return
 if (!isAuthenticated) {
 setStudioMessage('Connecte-toi pour utiliser le Studio IA.')
 return
 }
 if (!canUseAi) {
 setStudioMessage('Le plan Free ne peut pas generer avec IA. Passe en Studio ou utilise un compte associe.')
 return
 }
 setGenerating(true)
 setGenerated(null)
 setStudioMessage('')
 try {
 const data = await api.aiStudioGenerate({ provider, prompt, styles: selectedStyles, mood: selectedMood })
 setGenerated(buildLocalGenerated(data.idea, `${data.provider} IA`))
 setAiConfig(prev => ({ ...prev, usage: data.usage || prev.usage }))
 setStudioMessage(`Genere via ${data.provider} (${data.model}).`)
 } catch (error) {
 if (ALLOW_LOCAL_STUDIO_DEMO && /non configure|fetch failed|ECONNREFUSED|manquante/i.test(error.message)) {
 await new Promise(r => setTimeout(r, 900))
 setGenerated(buildLocalGenerated(null, 'Demo local'))
 setStudioMessage(`${error.message} Mode demo local affiche pour garder le flow.`)
 } else {
 setStudioMessage(error.message)
 }
 }
 setGenerating(false)
 }

 function exportGenerated() {
 if (!generated) return
 const blob = new Blob([JSON.stringify({
 title: generated.name,
 style: generated.style,
 mood: selectedMood,
 prompt,
 duration: generated.duration,
 createdAt: new Date().toISOString(),
 }, null, 2)], { type: 'application/json' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.href = url
 link.download = `${generated.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'viewly-studio'}.json`
 link.click()
 URL.revokeObjectURL(url)
 }

 function historyTrack(item) {
 return {
 id: item.id,
 title: item.name,
 artist: 'Studio IA',
 duration: item.durationSeconds,
 youtubeId: item.youtubeId,
 thumbnail: thumbnailFromId(item.youtubeId),
 gradient: item.gradient,
 tag: item.style,
 }
 }

 return (
 <div className={styles.page}>
 {/* Hero */}
 <div className={styles.hero}>
 <div className={styles.heroLeft}>
 <div className={styles.heroTag}> Studio IA</div>
 <h1 className={styles.heroTitle}>Genere ta musique,<br /><em>decris une ambiance.</em></h1>
 <p className={styles.heroSub}>Notre IA compose un morceau original en 10 secondes a partir de ta description.</p>
 </div>
 <div className={styles.heroVisual} aria-hidden>
 {[...Array(20)].map((_, i) => (
 <div
 key={i}
 className={styles.heroBar}
 style={{
 height: `${20 + Math.sin(i * 0.8) * 40 + 30}px`,
 animationDelay: `${i * 0.08}s`,
 opacity: 0.15 + (i / 20) * 0.5,
 }}
 />
 ))}
 </div>
 </div>

 {/* Prompt */}
 <div className={styles.card}>
 {studioMessage ? <div className={styles.notice}>{studioMessage}</div> : null}
 {currentUser?.plan === 'Free' ? <div className={styles.notice}>Free est limite: les generations IA sont reservees au plan Studio et aux associes.</div> : null}
 {providerOptions.length ? (
 <label className={styles.label}>Provider IA</label>
 ) : null}
 {providerOptions.length ? (
 <div className={styles.providerRow}>
 {providerOptions.map(([key, item]) => (
 <button key={key} className={`${styles.providerBtn} ${provider === key ? styles.providerBtnActive : ''}`} onClick={() => setProvider(key)}>
 <span>{key}</span>
 <small>{item.configured ? item.model : 'a configurer'}</small>
 </button>
 ))}
 </div>
 ) : null}
 <label className={styles.label}>Decris ton morceau</label>
 <textarea
 className={styles.textarea}
 placeholder="Ex : une melodie lo-fi planante pour etudier tard le soir, avec piano et pluie en fond, un peu melancolique..."
 value={prompt}
 onChange={e => setPrompt(e.target.value)}
 rows={3}
 />

 <div className={styles.row}>
 <div className={styles.pickerCol}>
 <span className={styles.pickerLabel}>Style</span>
 <div className={styles.chips}>
 {STYLES.map(s => (
 <button
 key={s}
 className={`${styles.chip} ${selectedStyles.includes(s) ? styles.chipActive : ''}`}
 onClick={() => toggleStyle(s)}
 >
 {s}
 </button>
 ))}
 </div>
 </div>
 <div className={styles.pickerCol}>
 <span className={styles.pickerLabel}>Humeur</span>
 <div className={styles.chips}>
 {MOODS.map(m => (
 <button
 key={m}
 className={`${styles.chip} ${selectedMood === m ? styles.chipMood : ''}`}
 onClick={() => setSelectedMood(m)}
 >
 {m}
 </button>
 ))}
 </div>
 </div>
 </div>

 <button
 className={`${styles.genBtn} ${generating ? styles.genBtnLoading : ''}`}
 onClick={generate}
 disabled={generating}
 >
 {generating ? (
 <><span className={styles.spinner} />Composition en cours...</>
 ) : <><Sparkles size={16} />Generer le morceau</>}
 </button>
 </div>

 {/* Result */}
 {(generated || generating) && (
 <div className={`${styles.card} ${styles.resultCard}`}>
 {generating ? (
 <div className={styles.genLoading}>
 <div className={styles.waveform}>
 {[...Array(28)].map((_, i) => <WaveBar key={i} delay={i * 0.06} />)}
 </div>
 <span className={styles.loadingText}>L'IA compose votre morceau...</span>
 </div>
 ) : generated && (
 <>
 <div className={styles.resultTrack}>
 <div className={styles.resultArt}>music</div>
 <div className={styles.resultInfo}>
 <span className={styles.resultName}>{generated.name}</span>
 <span className={styles.resultMeta}>{generated.style}  -  {generated.duration}  -  Genere par IA</span>
 </div>
 <div className={styles.resultActions}>
 <button
 className={styles.actionBtn}
 onClick={() => play(generated.track, [generated.track])}
 >
 <Play size={14} fill="currentColor" /> Ecouter
 </button>
 <button className={styles.actionBtn} onClick={exportGenerated}><Download size={14} /> Export</button>
 <button className={`${styles.actionBtn} ${isLikedTrack(generated.track) ? styles.actionBtnActive : ''}`} onClick={() => toggleLike(generated.track)} aria-label="Ajouter aux favoris"><Heart size={14} fill={isLikedTrack(generated.track) ? 'currentColor' : 'none'} /></button>
 </div>
 </div>
 <div className={styles.waveform}>
 {[...Array(28)].map((_, i) => <WaveBar key={i} delay={i * 0.06} />)}
 </div>
 <p className={styles.resultNote}>Morceau genere selon ton style ecoute, les parametres selectionnes et ta description.</p>
 {generated.description ? <p className={styles.resultNote}>{generated.description}</p> : null}
 </>
 )}
 </div>
 )}

 {/* History */}
 <section>
 <div className={styles.sectionHead}>
 <h2 className={styles.sectionTitle}>Historique des generations</h2>
 </div>
 <div className={styles.histList}>
 {HISTORY.map(h => (
 <div key={h.id} className={styles.histItem}>
 <div className={styles.histArt} style={{ background: h.gradient }}>music</div>
 <div className={styles.histInfo}>
 <span className={styles.histName}>{h.name}</span>
 <span className={styles.histMeta}>{h.style}  -  {h.duration}</span>
 </div>
 <button className={styles.histPlay} onClick={() => play(historyTrack(h), [historyTrack(h)])} aria-label={`Lire ${h.name}`}><Play size={14} fill="currentColor" /></button>
 </div>
 ))}
 </div>
 </section>

 <ExtraFeatures />
 </div>
 )
}
