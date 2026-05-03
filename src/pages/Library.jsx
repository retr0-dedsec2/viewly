import { useEffect, useMemo, useState } from 'react'
import { Play, X } from 'lucide-react'
import { usePlayer } from '../PlayerContext'
import { usePlaylists } from '../context/PlaylistContext'
import { useAuth } from '../context/AuthContext'
import styles from './Library.module.css'

function moveItem(list, fromIndex, toIndex) {
 const next = [...list]
 const [item] = next.splice(fromIndex, 1)
 next.splice(toIndex, 0, item)
 return next
}

export default function Library() {
 const { playlists, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists()
 const { currentUser } = useAuth()
 const { queue, play } = usePlayer()
 const [tab, setTab] = useState('Playlists')
 const [selectedId, setSelectedId] = useState(null)
 const [form, setForm] = useState({ title: '', description: '', cover: '' })
 const [search, setSearch] = useState('')
 const [message, setMessage] = useState('')
 const [draggedIndex, setDraggedIndex] = useState(null)
 const [coverDraft, setCoverDraft] = useState('')

 const selected = useMemo(() => playlists.find(item => item.id === selectedId) || playlists[0] || null, [playlists, selectedId])
 const limits = currentUser?.access?.limits || {}
 const playlistLimitReached = playlists.length >= (limits.playlists || 9999)
 const pickerTracks = useMemo(() => {
 const base = queue || []
 const q = search.trim().toLowerCase()
 return q
 ? base.filter(track => track.title.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q))
 : base.slice(0, 18)
 }, [queue, search])

 useEffect(() => {
 setCoverDraft(selected?.cover || '')
 }, [selected?.id, selected?.cover])

 async function handleCreate(e) {
 e.preventDefault()
 if (!form.title.trim()) return
 if (playlistLimitReached) return setMessage(`Limite atteinte : ${limits.playlists} playlists sur ton plan.`)
 try {
 const created = await createPlaylist(form)
 setSelectedId(created.id)
 setForm({ title: '', description: '', cover: '' })
 setMessage('Playlist creee.')
 } catch (error) {
 setMessage(error.message)
 }
 }

 async function handleAddTrack(track) {
 if (!selected) return
 const exists = selected.tracks?.some(item => item.youtubeId === track.youtubeId)
 if (exists) return setMessage('Titre deja present dans la playlist.')
 const nextTracks = [...(selected.tracks || []), track]
 if (limits.tracksPerPlaylist && nextTracks.length > limits.tracksPerPlaylist) return setMessage(`Limite atteinte : ${limits.tracksPerPlaylist} titres par playlist.`)
 try {
 await updatePlaylist(selected.id, { tracks: nextTracks })
 setMessage(`Ajoute : ${track.title}`)
 } catch (error) {
 setMessage(error.message)
 }
 }

 async function handleRemoveTrack(track) {
 if (!selected) return
 try {
 await updatePlaylist(selected.id, { tracks: (selected.tracks || []).filter(item => item.youtubeId !== track.youtubeId) })
 setMessage(`Retire : ${track.title}`)
 } catch (error) {
 setMessage(error.message)
 }
 }

 async function handleReorder(toIndex) {
 if (draggedIndex === null || !selected || draggedIndex === toIndex) return
 const nextTracks = moveItem(selected.tracks || [], draggedIndex, toIndex)
 setDraggedIndex(null)
 try {
 await updatePlaylist(selected.id, { tracks: nextTracks })
 } catch (error) {
 setMessage(error.message)
 }
 }

 async function handleCoverUpdate(e) {
 e.preventDefault()
 if (!selected) return
 try {
 await updatePlaylist(selected.id, { cover: coverDraft })
 setMessage('Cover mise a jour.')
 } catch (error) {
 setMessage(error.message)
 }
 }

 return (
 <div className={styles.page}>
 <div className={styles.header}>
 <div>
 <h1 className={styles.heading}>Bibliotheque</h1>
 <p className={styles.sub}>Playlists, covers et ordre des titres dans un workspace clair.</p>
 </div>
 <div className={styles.tabs}>
 {['Playlists', 'Builder'].map(item => (
 <button key={item} className={`${styles.tab} ${tab === item ? styles.tabActive : ''}`} onClick={() => setTab(item)}>{item}</button>
 ))}
 </div>
 </div>

 <div className={styles.playlistLayout}>
 <section className={styles.panel}>
 <div className={styles.panelHeadInline}>
 <div>
 <h2>Mes playlists</h2>
 <p>{playlists.length} playlist{playlists.length > 1 ? 's' : ''} stockee{playlists.length > 1 ? 's' : ''}</p>
 </div>
 {selected && <button className={styles.deleteBtn} onClick={() => deletePlaylist(selected.id)}>Supprimer</button>}
 </div>

 <form className={styles.form} onSubmit={handleCreate}>
 {currentUser?.plan === 'Free' ? <div className={styles.limitNote}>Free : {playlists.length}/{limits.playlists || 3} playlists, {limits.tracksPerPlaylist || 25} titres par playlist.</div> : null}
 <label><span>Titre</span><input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Ma playlist nuit" /></label>
 <label><span>Description</span><textarea rows="3" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Ambiance, mood, style..." /></label>
 <label><span>Cover URL (optionnel)</span><input value={form.cover} onChange={e => setForm(prev => ({ ...prev, cover: e.target.value }))} placeholder="https://...jpg" /></label>
 <button className={styles.submit} type="submit" disabled={playlistLimitReached}>{playlistLimitReached ? 'Limite Free atteinte' : 'Creer une playlist'}</button>
 </form>

 {message && <div className={styles.message}>{message}</div>}

 <div className={styles.playlistsList}>
 {playlists.map(item => (
 <button key={item.id} className={`${styles.playlistCard} ${selected?.id === item.id ? styles.playlistCardActive : ''}`} onClick={() => setSelectedId(item.id)}>
 <div className={styles.playlistCover} style={item.cover ? { backgroundImage: `url(${item.cover})` } : {}}>music</div>
 <div className={styles.playlistInfo}>
 <strong>{item.title}</strong>
 <span>{item.trackCount} titres</span>
 <small>{item.description || 'Aucune description'}</small>
 </div>
 </button>
 ))}
 </div>
 </section>

 <section className={styles.panel}>
 {!selected ? (
 <div className={styles.empty}><span>music</span><p>Aucune playlist selectionnee</p><span>Cree une playlist pour commencer.</span></div>
 ) : (
 <>
 <div className={styles.panelHeadInline}>
 <div>
 <h2>{selected.title}</h2>
 <p>{selected.description || 'Playlist personnalisee.'}</p>
 </div>
 <div className={styles.actionsInline}>
 <button className={styles.addBtn} onClick={() => selected.tracks?.[0] && play(selected.tracks[0], selected.tracks)}>Lancer la playlist</button>
 </div>
 </div>

 <form className={styles.coverEditor} onSubmit={handleCoverUpdate}>
 <input value={coverDraft} onChange={e => setCoverDraft(e.target.value)} placeholder="https://...jpg" />
 <button className={styles.tab} type="submit">Enregistrer la cover</button>
 </form>

 <div className={styles.list}>
 {(selected.tracks || []).map((track, index) => (
 <div
 key={`${track.youtubeId}-${index}`}
 className={styles.item}
 draggable
 onDragStart={() => setDraggedIndex(index)}
 onDragOver={e => e.preventDefault()}
 onDrop={() => handleReorder(index)}
 >
 <div className={styles.art} style={{ backgroundImage: `url(${track.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
 <div className={styles.info}>
 <strong className={styles.itemTitle}>{track.title}</strong>
 <span className={styles.itemMeta}>{track.artist}</span>
 </div>
 <button className={styles.tab} onClick={() => play(track, selected.tracks)} aria-label={`Lire ${track.title}`}><Play size={14} fill="currentColor" /></button>
 <button className={styles.tab} onClick={() => handleRemoveTrack(track)} aria-label={`Retirer ${track.title}`}><X size={14} /></button>
 </div>
 ))}
 {selected.tracks?.length === 0 && <div className={styles.empty}><span></span><p>Playlist vide</p><span>Ajoute des titres avec le builder ci-dessous.</span></div>}
 </div>

 {tab === 'Builder' && (
 <>
 <div className={styles.panelHead}>
 <h2>Builder</h2>
 <p>Ajoute rapidement des titres depuis la file active.</p>
 </div>
 <label className={styles.form}><span>Recherche dans la file</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Daft Punk, Stromae, pop..." /></label>
 <div className={styles.trackPicker}>
 {pickerTracks.map(track => {
 const selectedTrack = selected.tracks?.some(item => item.youtubeId === track.youtubeId)
 return (
 <button key={track.youtubeId || track.id} className={`${styles.trackChoice} ${selectedTrack ? styles.trackChoiceActive : ''}`} onClick={() => handleAddTrack(track)}>
 <img src={track.thumbnail} alt="" />
 <div><strong>{track.title}</strong><span>{track.artist}</span><em>{track.tag}</em></div>
 <span>{selectedTrack ? 'OK' : '+'}</span>
 </button>
 )
 })}
 </div>
 </>
 )}
 </>
 )}
 </section>
 </div>
 </div>
 )
}
