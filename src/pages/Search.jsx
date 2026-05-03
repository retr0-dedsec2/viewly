import { useEffect, useMemo, useState } from 'react'
import { Search as SearchIcon, X } from 'lucide-react'
import { TRACKS } from '../PlayerContext'
import TrackRow from '../components/TrackRow'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import styles from './Search.module.css'

const GENRES = [
 { label: 'Hip-Hop', gradient: 'linear-gradient(135deg,#b4495f,#3b1f2b)' },
 { label: 'Electro', gradient: 'linear-gradient(135deg,#0e926f,#10203c)' },
 { label: 'Jazz', gradient: 'linear-gradient(135deg,#d59b45,#5a3514)' },
 { label: 'Pop FR', gradient: 'linear-gradient(135deg,#e0578a,#57243d)' },
 { label: 'R&B', gradient: 'linear-gradient(135deg,#7a64d8,#2a2358)' },
 { label: 'Classique', gradient: 'linear-gradient(135deg,#7a8c70,#263222)' },
 { label: 'Ambient', gradient: 'linear-gradient(135deg,#4e9aa5,#18373d)' },
 { label: 'Rock', gradient: 'linear-gradient(135deg,#d55a38,#4b2018)' },
 { label: 'Soul', gradient: 'linear-gradient(135deg,#b98244,#3c2518)' },
]

const CATS = ['Tout', 'Catalogue local', 'YouTube live']

export default function Search() {
 const { isAuthenticated, isAdmin } = useAuth()
 const [query, setQuery] = useState('')
 const [activeCat, setActiveCat] = useState('Tout')
 const [remoteResults, setRemoteResults] = useState([])
 const [localCatalog, setLocalCatalog] = useState([])
 const [catalogTotal, setCatalogTotal] = useState(0)
 const [catalogStats, setCatalogStats] = useState({ total: 0, youtubeConfigured: false, channels: 0 })
 const [nextPageToken, setNextPageToken] = useState('')
 const [loading, setLoading] = useState(false)
 const [loadingMore, setLoadingMore] = useState(false)
 const [catalogLoading, setCatalogLoading] = useState(false)
 const [apiError, setApiError] = useState('')
 const [importing, setImporting] = useState(false)
 const [importMessage, setImportMessage] = useState('')

 const localResults = useMemo(() => {
 if (query.length <= 1) return []
 return TRACKS.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.artist.toLowerCase().includes(query.toLowerCase()))
 }, [query])

 useEffect(() => {
 api.catalogStats().then(setCatalogStats).catch(() => setCatalogStats({ total: TRACKS.length, youtubeConfigured: false, channels: 0 }))
 }, [])

 useEffect(() => {
 let cancelled = false
 setCatalogLoading(true)
 api.catalog({ query: query.trim(), limit: 50, offset: 0 })
 .then(data => {
 if (cancelled) return
 setLocalCatalog(data.items || [])
 setCatalogTotal(data.total || 0)
 })
 .catch(() => {
 if (cancelled) return
 setLocalCatalog([])
 setCatalogTotal(0)
 })
 .finally(() => !cancelled && setCatalogLoading(false))
 return () => { cancelled = true }
 }, [query])

 useEffect(() => {
 let cancelled = false
 if (query.trim().length <= 1) {
 setRemoteResults([])
 setNextPageToken('')
 setApiError('')
 return
 }
 setLoading(true)
 setApiError('')
 const timer = setTimeout(async () => {
 try {
 const data = await api.searchRemoteCatalog({ query, maxResults: 12 })
 if (!cancelled) {
 setRemoteResults(data.items || [])
 setNextPageToken(data.nextPageToken || '')
 }
 } catch (error) {
 if (!cancelled) {
 setApiError(error.message || 'Recherche YouTube indisponible.')
 setRemoteResults([])
 setNextPageToken('')
 }
 } finally {
 if (!cancelled) setLoading(false)
 }
 }, 450)
 return () => { cancelled = true; clearTimeout(timer) }
 }, [query])

 async function loadMore() {
 if (!nextPageToken || !query.trim() || loadingMore) return
 setLoadingMore(true)
 try {
 const data = await api.searchRemoteCatalog({ query, maxResults: 12, pageToken: nextPageToken })
 setRemoteResults(prev => [...prev, ...(data.items || [])])
 setNextPageToken(data.nextPageToken || '')
 } catch (error) {
 setApiError(error.message || 'Impossible de charger plus de resultats.')
 } finally {
 setLoadingMore(false)
 }
 }

 async function importCurrentQuery() {
 if (!isAdmin || !query.trim() || importing) return
 setImporting(true)
 setImportMessage('')
 try {
 const data = await api.importCatalog({ query, maxPages: 3, maxResults: 25 })
 setImportMessage(`${data.imported} nouveaux titres importes dans la DB locale (${data.total} au total).`)
 const [catalog, stats] = await Promise.all([api.catalog({ query: query.trim(), limit: 50, offset: 0 }), api.catalogStats()])
 setLocalCatalog(catalog.items || [])
 setCatalogTotal(catalog.total || 0)
 setCatalogStats(stats)
 } catch (error) {
 setImportMessage(error.message)
 } finally {
 setImporting(false)
 }
 }

 const results = useMemo(() => {
 if (activeCat === 'Catalogue local') return isAuthenticated ? localCatalog : (localCatalog.length ? localCatalog : localResults)
 if (activeCat === 'YouTube live') return remoteResults
 const baseLocal = isAuthenticated ? localCatalog : (localCatalog.length ? localCatalog : localResults)
 return [...baseLocal, ...remoteResults.filter(item => !baseLocal.some(local => local.youtubeId === item.youtubeId))]
 }, [activeCat, isAuthenticated, localResults, localCatalog, remoteResults])

 return (
 <div className={styles.page}>
 <div className={styles.headerRow}>
 <div>
 <h1 className={styles.heading}>Recherche</h1>
 <p className={styles.sub}>Catalogue local persiste + recherche YouTube live. La base locale reste disponible meme sans connexion utilisateur.</p>
 </div>
 </div>

 <div className={styles.quickStats}>
 <div className={styles.quickStat}><span>Catalogue local</span><strong>{catalogStats.total || TRACKS.length}</strong></div>
 <div className={styles.quickStat}><span>Chaines indexees</span><strong>{catalogStats.channels || 0}</strong></div>
 <div className={styles.quickStat}><span>Source live</span><strong>{catalogStats.youtubeConfigured ? 'YouTube API' : 'Demo locale'}</strong></div>
 </div>

 <div className={styles.searchBox}>
 <span className={styles.searchIcon}><SearchIcon size={17} /></span>
 <input className={styles.input} type="text" placeholder="Recherche dans le catalogue local et sur YouTube..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
 {query && <button className={styles.clear} onClick={() => setQuery('')} aria-label="Effacer la recherche"><X size={15} /></button>}
 </div>

 <div className={styles.cats}>{CATS.map(c => <button key={c} className={`${styles.cat} ${activeCat === c ? styles.catActive : ''}`} onClick={() => setActiveCat(c)}>{c}</button>)}</div>

 {!catalogStats.youtubeConfigured ? <div className={styles.notice}>Ajoute <code>YOUTUBE_API_KEY</code> dans le backend et redemarre le serveur pour activer la recherche/import YouTube.</div> : null}
 {apiError ? <div className={styles.notice}>{apiError}</div> : null}
 {importMessage ? <div className={styles.notice}>{importMessage}</div> : null}

 {isAdmin && query.trim() ? <div className={styles.adminRow}><button className={styles.importBtn} onClick={importCurrentQuery} disabled={importing || !catalogStats.youtubeConfigured}>{importing ? 'Import...' : 'Importer 3 pages dans la DB locale'}</button><span className={styles.adminHint}>Import reste reserve a l'admin.</span></div> : null}

 {query.length > 1 ? (
 <section>
 <div className={styles.sectionTitleRow}><div className={styles.sectionTitle}>{loading || catalogLoading ? 'Recherche...' : results.length > 0 ? `${results.length} resultat${results.length > 1 ? 's' : ''}` : 'Aucun resultat'}</div><span className={styles.resultMeta}>{catalogTotal} titres en DB locale</span></div>
 <div className={styles.list}>{results.map((t, idx) => <TrackRow key={`${t.id}-${idx}`} track={t} index={idx + 1} />)}</div>
 {activeCat !== 'Catalogue local' && remoteResults.length > 0 && nextPageToken ? <div className={styles.actionsRow}><button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Chargement...' : 'Charger plus de resultats live'}</button></div> : null}
 {!loading && !catalogLoading && results.length === 0 && <div className={styles.empty}><span>Recherche</span><p>Aucun titre trouve pour " {query} "</p><span className={styles.emptySub}>Essaie un autre mot-cle, ou importe des pages dans la DB locale pour enrichir ton catalogue.</span></div>}
 </section>
 ) : (
 <>
 <section>
 <div className={styles.sectionTitle}>Genres populaires</div>
 <div className={styles.genreGrid}>{GENRES.map(g => <div key={g.label} className={styles.genreCard} style={{ background: g.gradient }} onClick={() => setQuery(g.label)}><span>{g.label}</span></div>)}</div>
 </section>
 <section>
 <div className={styles.sectionTitle}>Catalogue deja disponible</div>
 <div className={styles.list}>{(localCatalog.length ? localCatalog.slice(0, 8) : TRACKS.slice(0, 5)).map((t, idx) => <TrackRow key={t.id || t.youtubeId} track={t} index={idx + 1} />)}</div>
 </section>
 </>
 )}
 </div>
 )
}
