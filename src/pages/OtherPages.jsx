import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, Heart, MessageCircle, Play, Plus, Radio, Send, Settings as SettingsIcon, Share2, Users } from 'lucide-react'
import { usePlayer } from '../PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { usePlaylists } from '../context/PlaylistContext'
import { api } from '../lib/api'
import TrackRow from '../components/TrackRow'
import styles from './Placeholder.module.css'

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function createRoomCode() {
  return `ROOM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function usePrefs() {
  const [prefs, setPrefs] = useState(() => ({
    autoplay: JSON.parse(localStorage.getItem('viewly-pref-autoplay') || 'true'),
    notifications: JSON.parse(localStorage.getItem('viewly-pref-notifications') || 'false'),
    highQuality: JSON.parse(localStorage.getItem('viewly-pref-highQuality') || 'true'),
    publicProfile: JSON.parse(localStorage.getItem('viewly-pref-publicProfile') || 'false'),
  }))
  useEffect(() => {
    Object.entries(prefs).forEach(([key, value]) => localStorage.setItem(`viewly-pref-${key}`, JSON.stringify(value)))
  }, [prefs])
  return [prefs, setPrefs]
}

export function Liked() {
  const { likedTracks } = usePlayer()
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Favoris</h1>
      <p className={styles.sub}>{likedTracks.length} titre{likedTracks.length !== 1 ? 's' : ''} sauvegardé{likedTracks.length !== 1 ? 's' : ''}</p>
      {likedTracks.length === 0 ? (
        <div className={styles.empty}>
          <Heart size={46} />
          <p>Aucun favori pour l'instant</p>
          <span>Ajoute des titres aux favoris depuis les cartes ou le player.</span>
        </div>
      ) : (
        <div className={styles.list}>{likedTracks.map(t => <TrackRow key={t.youtubeId || t.id} track={t} />)}</div>
      )}
    </div>
  )
}

export function Rooms() {
  const { currentTrack, isPlaying, queue, play, togglePlay } = usePlayer()
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState(() => readJson('viewly-rooms', []))
  const [activeCode, setActiveCode] = useState(() => localStorage.getItem('viewly-active-room') || '')
  const [joinCode, setJoinCode] = useState('')
  const [chatText, setChatText] = useState('')
  const [message, setMessage] = useState('')

  const activeRoom = useMemo(() => rooms.find(room => room.code === activeCode) || null, [activeCode, rooms])
  const listenerName = currentUser?.name || 'Invité'

  useEffect(() => {
    localStorage.setItem('viewly-rooms', JSON.stringify(rooms.slice(0, 8)))
  }, [rooms])

  useEffect(() => {
    if (activeCode) localStorage.setItem('viewly-active-room', activeCode)
  }, [activeCode])

  function createRoom() {
    const code = createRoomCode()
    const room = {
      code,
      host: listenerName,
      track: currentTrack,
      queue: queue.slice(0, 18),
      state: isPlaying ? 'playing' : 'paused',
      listeners: [listenerName],
      messages: [{ id: Date.now(), author: 'Viewly', text: `${listenerName} a créé la room.`, at: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    }
    setRooms(prev => [room, ...prev.filter(item => item.code !== code)])
    setActiveCode(code)
    setMessage('Room créée.')
  }

  function syncRoom() {
    if (!activeRoom) {
      createRoom()
      return
    }
    setRooms(prev => prev.map(room => room.code === activeRoom.code ? {
      ...room,
      track: currentTrack,
      queue: queue.slice(0, 18),
      state: isPlaying ? 'playing' : 'paused',
      listeners: Array.from(new Set([...room.listeners, listenerName])),
      updatedAt: new Date().toISOString(),
    } : room))
    setMessage('Lecture synchronisée avec la room.')
  }

  function joinRoom(e) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    const room = rooms.find(item => item.code === code)
    if (!room) {
      setMessage('Room introuvable sur cet appareil. Crée une room ou colle un code déjà enregistré.')
      return
    }
    setRooms(prev => prev.map(item => item.code === code ? { ...item, listeners: Array.from(new Set([...item.listeners, listenerName])) } : item))
    setActiveCode(code)
    setJoinCode('')
    setMessage(`Connecté à ${code}.`)
  }

  function playRoom() {
    if (!activeRoom?.track) return
    play(activeRoom.track, activeRoom.queue?.length ? activeRoom.queue : [activeRoom.track])
  }

  function postMessage(e) {
    e.preventDefault()
    if (!activeRoom || !chatText.trim()) return
    const nextMessage = { id: Date.now(), author: listenerName, text: chatText.trim(), at: new Date().toISOString() }
    setRooms(prev => prev.map(room => room.code === activeRoom.code ? { ...room, messages: [...room.messages, nextMessage].slice(-20) } : room))
    setChatText('')
  }

  async function copyInvite() {
    if (!activeRoom) return
    await navigator.clipboard?.writeText(activeRoom.code)
    setMessage('Code copié.')
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Rooms</h1>
      <p className={styles.sub}>Écoute synchronisée, code de partage et chat de session persistés localement.</p>

      <div className={styles.workspace}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>Session active</h2><p>Synchronise le titre courant et la file de lecture.</p></div>
            <Radio size={22} />
          </div>

          <div className={styles.roomHero}>
            <span>Code room</span>
            <strong>{activeRoom?.code || 'Aucune room'}</strong>
            <p>{activeRoom ? `${activeRoom.listeners.length} participant${activeRoom.listeners.length > 1 ? 's' : ''} · ${activeRoom.state}` : 'Crée une room pour démarrer une écoute partagée.'}</p>
          </div>

          {activeRoom?.track ? (
            <div className={styles.nowPlaying}>
              <img src={activeRoom.track.thumbnail} alt="" />
              <div><strong>{activeRoom.track.title}</strong><span>{activeRoom.track.artist}</span></div>
            </div>
          ) : null}

          <div className={styles.actionRow}>
            <button className={styles.primaryBtn} onClick={createRoom}><Plus size={16} />Créer une room</button>
            <button className={styles.secondaryBtn} onClick={syncRoom}><Share2 size={16} />Synchroniser</button>
            <button className={styles.secondaryBtn} onClick={playRoom} disabled={!activeRoom?.track}><Play size={16} fill="currentColor" />Lire la room</button>
            <button className={styles.secondaryBtn} onClick={togglePlay}>{isPlaying ? 'Pause locale' : 'Lecture locale'}</button>
          </div>

          <form className={styles.inlineForm} onSubmit={joinRoom}>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="ROOM-ABCD" />
            <button type="submit" className={styles.secondaryBtn}>Rejoindre</button>
          </form>
          {message ? <div className={styles.message}>{message}</div> : null}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>Chat de room</h2><p>Messages de session enregistrés dans le navigateur.</p></div>
            <button className={styles.iconBtn} onClick={copyInvite} disabled={!activeRoom} aria-label="Copier le code"><Copy size={16} /></button>
          </div>
          <div className={styles.messageList}>
            {(activeRoom?.messages || []).map(item => (
              <div key={item.id} className={styles.messageItem}>
                <strong>{item.author}</strong>
                <span>{item.text}</span>
              </div>
            ))}
            {!activeRoom ? <div className={styles.emptyInline}>Aucune room sélectionnée.</div> : null}
          </div>
          <form className={styles.inlineForm} onSubmit={postMessage}>
            <input value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Message à la room" />
            <button type="submit" className={styles.primaryBtn} disabled={!activeRoom}><Send size={15} />Envoyer</button>
          </form>
        </section>
      </div>
    </div>
  )
}

export function Social() {
  const { currentTrack } = usePlayer()
  const { currentUser } = useAuth()
  const { playlists } = usePlaylists()
  const [posts, setPosts] = useState(() => readJson('viewly-social-posts', [
    { id: 1, author: 'Viewly', type: 'update', text: 'Bienvenue dans le flux local. Publie un titre, une playlist ou une découverte.', likes: 2, liked: false, createdAt: new Date().toISOString() },
  ]))
  const [draft, setDraft] = useState('')

  useEffect(() => {
    localStorage.setItem('viewly-social-posts', JSON.stringify(posts.slice(0, 40)))
  }, [posts])

  function publish(text, type = 'post', track = null) {
    const body = text.trim()
    if (!body) return
    setPosts(prev => [{
      id: Date.now(),
      author: currentUser?.name || 'Invité',
      type,
      text: body,
      track,
      likes: 0,
      liked: false,
      createdAt: new Date().toISOString(),
    }, ...prev])
  }

  function publishDraft(e) {
    e.preventDefault()
    publish(draft)
    setDraft('')
  }

  function shareNowPlaying() {
    publish(`J'écoute ${currentTrack.title} de ${currentTrack.artist}.`, 'track', currentTrack)
  }

  function sharePlaylist(playlist) {
    publish(`Playlist partagée : ${playlist.title} (${playlist.trackCount || playlist.tracks?.length || 0} titres).`, 'playlist', playlist.tracks?.[0] || null)
  }

  function toggleLike(id) {
    setPosts(prev => prev.map(post => post.id === id ? { ...post, liked: !post.liked, likes: Math.max(0, post.likes + (post.liked ? -1 : 1)) } : post))
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Social</h1>
      <p className={styles.sub}>Flux local pour publier tes écoutes, partager des playlists et simuler l’engagement produit.</p>

      <div className={styles.workspace}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>Composer</h2><p>Publie un statut ou partage ton titre courant.</p></div>
            <MessageCircle size={22} />
          </div>
          <form className={styles.compose} onSubmit={publishDraft}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows="4" placeholder="Partage une découverte, une ambiance, une playlist..." />
            <div className={styles.actionRow}>
              <button className={styles.primaryBtn} type="submit"><Send size={15} />Publier</button>
              <button className={styles.secondaryBtn} type="button" onClick={shareNowPlaying}><Share2 size={15} />Titre courant</button>
            </div>
          </form>
          <div className={styles.shareList}>
            {playlists.slice(0, 4).map(playlist => (
              <button key={playlist.id} onClick={() => sharePlaylist(playlist)}>
                <span>{playlist.title}</span>
                <strong>{playlist.trackCount || playlist.tracks?.length || 0} titres</strong>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>Flux</h2><p>{posts.length} publication{posts.length > 1 ? 's' : ''}</p></div>
            <Users size={22} />
          </div>
          <div className={styles.feed}>
            {posts.map(post => (
              <article key={post.id} className={styles.post}>
                <div className={styles.postTop}><strong>{post.author}</strong><span>{post.type}</span></div>
                <p>{post.text}</p>
                {post.track ? (
                  <div className={styles.nowPlaying}>
                    <img src={post.track.thumbnail} alt="" />
                    <div><strong>{post.track.title}</strong><span>{post.track.artist}</span></div>
                  </div>
                ) : null}
                <button className={`${styles.likePost} ${post.liked ? styles.likePostActive : ''}`} onClick={() => toggleLike(post.id)}>
                  <Heart size={14} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export function Subscriptions() {
  const navigate = useNavigate()
  const { currentUser, updatePlan } = useAuth()
  const { settings } = useSiteSettings()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState('')

  async function choosePlan(plan) {
    if (!currentUser) {
      navigate('/login')
      return
    }
    setSaving(plan)
    const result = await updatePlan(plan)
    setSaving('')
    setMessage(result.ok ? `Plan ${plan} activé.` : result.message)
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Abonnements</h1>
      <p className={styles.sub}>Choisis l’offre adaptée à ton usage. Le changement est persisté sur ton compte local.</p>
      {message ? <div className={styles.message}>{message}</div> : null}
      <div className={styles.plans}>
        <div className={styles.plan}>
          <div className={styles.planName}>Free</div>
          <div className={styles.planPrice}>{settings.pricingFree}<span>/mois</span></div>
          <ul className={styles.planFeatures}>
            <li><Check size={14} /> Catalogue local et favoris</li>
            <li><Check size={14} /> Recherche et lecture YouTube</li>
            <li><Check size={14} /> Pépites essentielles</li>
            <li className={styles.mutedFeature}>Export audio avancé</li>
            <li className={styles.mutedFeature}>Analyses poussées</li>
          </ul>
          <button className={styles.planBtn} onClick={() => choosePlan('Free')} disabled={saving === 'Free' || currentUser?.plan === 'Free'}>
            {currentUser?.plan === 'Free' ? 'Plan actuel' : saving === 'Free' ? 'Activation...' : 'Revenir au Free'}
          </button>
        </div>
        <div className={`${styles.plan} ${styles.planPro}`}>
          <div className={styles.planBadge}>Recommandé</div>
          <div className={styles.planName}>Studio</div>
          <div className={styles.planPrice}>{settings.pricingStudio}<span>/mois</span></div>
          <ul className={styles.planFeatures}>
            <li><Check size={14} /> Tout du plan Free</li>
            <li><Check size={14} /> Recommandations et profil avancé</li>
            <li><Check size={14} /> Générations Studio IA</li>
            <li><Check size={14} /> Covers et outils créatifs</li>
            <li><Check size={14} /> Priorité sur les nouveautés</li>
          </ul>
          <button className={styles.planBtn} onClick={() => choosePlan('Studio')} disabled={saving === 'Studio' || currentUser?.plan === 'Studio'}>
            {currentUser?.plan === 'Studio' ? 'Tu es déjà sur Studio' : saving === 'Studio' ? 'Activation...' : 'Passer à Studio'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Settings({ theme = 'dark', onToggleTheme = () => {} }) {
  const { currentUser, updateProfile } = useAuth()
  const [prefs, setPrefs] = usePrefs()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: currentUser?.name || '', bio: currentUser?.bio || '', password: '' })
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [message, setMessage] = useState('')
  const initials = useMemo(() => currentUser?.name?.slice(0, 2).toUpperCase() || 'TU', [currentUser])

  useEffect(() => { setForm({ name: currentUser?.name || '', bio: currentUser?.bio || '', password: '' }) }, [currentUser])
  useEffect(() => { api.myTasteProfile().then(data => setProfile(data.profile)).catch(() => {}) }, [])
  async function onFileChange(e) { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setAvatarDataUrl(String(reader.result || '')); reader.readAsDataURL(file) }
  async function handleSubmit(e) { e.preventDefault(); const result = await updateProfile({ ...form, avatarDataUrl }); if (!result.ok) return setMessage(result.message); setMessage('Profil mis à jour.'); setForm(prev => ({ ...prev, password: '' })); setAvatarDataUrl('') }
  function togglePref(key) { setPrefs(prev => ({ ...prev, [key]: !prev[key] })) }

  return (
    <div className={styles.page}><h1 className={styles.heading}>Paramètres</h1><p className={styles.sub}>Profil, préférences et goûts musicaux synchronisés avec ton compte.</p>
      <div className={styles.settingsLayout}>
        <form className={styles.profileCard} onSubmit={handleSubmit}>
          <div className={styles.profileTop}><div className={styles.bigAvatar} style={(avatarDataUrl || currentUser?.avatarUrl) ? { backgroundImage: `url(${avatarDataUrl || currentUser?.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : {}}>{initials}</div><div><strong>{currentUser?.name}</strong><span>{currentUser?.email}</span><small>{currentUser?.plan} · {currentUser?.role}</small></div></div>
          <label className={styles.uploadField}><span>Avatar</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} /></label>
          <label><span>Nom</span><input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} /></label>
          <label><span>Bio</span><textarea rows="4" value={form.bio} onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))} placeholder="Décris ton univers musical" /></label>
          <label><span>Nouveau mot de passe</span><input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Laisse vide pour conserver l’actuel" /></label>
          {message && <div className={styles.message}>{message}</div>}
          <button className={styles.planBtn} type="submit">Enregistrer le profil</button>
        </form>
        <div className={styles.settingsGroup}>
          <div className={styles.settingsLabel}>Préférences</div>
          <button className={styles.settingsItem} onClick={onToggleTheme}><span>Thème ({theme === 'dark' ? 'Sombre' : 'Clair'})</span><SettingsIcon size={16} /></button>
          {[
            ['highQuality', 'Qualité audio élevée'],
            ['notifications', 'Notifications produit'],
            ['autoplay', 'Lecture automatique'],
            ['publicProfile', 'Profil visible socialement'],
          ].map(([key, label]) => <button key={key} className={styles.settingsItem} onClick={() => togglePref(key)}><span>{label}</span><strong>{prefs[key] ? 'Activé' : 'Désactivé'}</strong></button>)}
          <div className={styles.profileCard}>
            <span className={styles.settingsLabel}>Goûts musicaux</span>
            <strong className={styles.tasteTitle}>{profile?.mood ? `Profil ${profile.mood}` : 'Profil en construction'}</strong>
            <p className={styles.tasteText}>{profile?.summary || 'Écoute quelques titres et ajoute des favoris pour alimenter l’algorithme.'}</p>
            <div className={styles.tasteStats}><div><span>Énergie</span><strong>{Math.round(profile?.energyScore || 0)}%</strong></div><div><span>Diversité</span><strong>{Math.round(profile?.diversityScore || 0)}%</strong></div><div><span>Découverte</span><strong>{Math.round(profile?.discoveryScore || 0)}%</strong></div></div>
            <div className={styles.tasteTags}>{(profile?.topArtists || []).slice(0, 4).map(item => <span key={item.name}>{item.name}</span>)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
