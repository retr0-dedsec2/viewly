import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { api } from '../lib/api'
import ContentBlocksEditor from '../components/ContentBlocksEditor'
import styles from './Admin.module.css'

const blankForm = { name: '', email: '', password: '', role: 'user', plan: 'Free', status: 'active' }

export default function Admin() {
 const { currentUser, users, stats, createUser, updateUser, refreshUsers } = useAuth()
 const { settings, saveAdminSettings } = useSiteSettings()
 const [form, setForm] = useState(blankForm)
 const [message, setMessage] = useState('')
 const [cmsMessage, setCmsMessage] = useState('')
 const [loading, setLoading] = useState(false)
 const [savingCms, setSavingCms] = useState(false)
 const [catalogStats, setCatalogStats] = useState({ total: 0, channels: 0, latestImportAt: null })
 const [analytics, setAnalytics] = useState({ totals: {}, planMix: {}, recentUsers: [], latestPlaylists: [], topTracks: [] })
 const [cmsForm, setCmsForm] = useState(settings)
 const [aiConfig, setAiConfig] = useState({ providers: {}, usage: { limits: {} }, access: { limits: {} } })
 const [aiProvider, setAiProvider] = useState('openai')
 const [aiPrompt, setAiPrompt] = useState('Propose 3 idees de playlists pour lancer Viewly ce week-end.')
 const [aiResponse, setAiResponse] = useState('')
 const [testingAi, setTestingAi] = useState(false)

 useEffect(() => { setCmsForm(settings) }, [settings])

 const providerRows = useMemo(() => Object.entries(aiConfig.providers || {}), [aiConfig.providers])

 async function loadAll() {
 setLoading(true)
 try {
 await refreshUsers(currentUser)
 const [statsData, analyticsData, aiData] = await Promise.all([api.catalogStats(), api.adminAnalytics(), api.aiConfig()])
 setCatalogStats(statsData)
 setAnalytics(analyticsData)
 setAiConfig(aiData)
 setAiProvider(aiData.defaultProvider || 'openai')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => { loadAll().catch(() => setLoading(false)) }, [])

 async function handleCreate(e) {
 e.preventDefault()
 const result = await createUser(form)
 if (!result.ok) return setMessage(result.message)
 setMessage('Utilisateur cree.')
 setForm(blankForm)
 loadAll().catch(() => {})
 }

 async function togglePlan(user) {
 await updateUser({ ...user, plan: user.plan === 'Free' ? 'Studio' : 'Free' })
 loadAll().catch(() => {})
 }

 async function toggleStatus(user) {
 await updateUser({ ...user, status: user.status === 'active' ? 'paused' : 'active' })
 loadAll().catch(() => {})
 }

 async function saveCms(e) {
 e.preventDefault()
 setSavingCms(true)
 try {
 await saveAdminSettings(cmsForm)
 setCmsMessage('Contenu public mis a jour.')
 } finally {
 setSavingCms(false)
 }
 }

 async function saveBlocks(payload) {
 setSavingCms(true)
 try {
 await saveAdminSettings(payload)
 setCmsMessage('Blocs drag and drop publies.')
 } finally {
 setSavingCms(false)
 }
 }

 async function testAi(e) {
 e.preventDefault()
 setTestingAi(true)
 setAiResponse('')
 try {
 const data = await api.aiChat({ provider: aiProvider, prompt: aiPrompt, maxTokens: 500 })
 setAiResponse(data.text || 'Reponse vide.')
 setAiConfig(prev => ({ ...prev, usage: data.usage || prev.usage }))
 } catch (error) {
 setAiResponse(error.message)
 } finally {
 setTestingAi(false)
 }
 }

 return (
 <div className={styles.page}>
 <div className={styles.header}>
 <div><div className={styles.eyebrow}>admin</div><h1 className={styles.title}>Console Viewly</h1><p className={styles.sub}>CMS, analytics, catalogue et comptes depuis un seul espace.</p></div>
 <button className={styles.refreshBtn} onClick={() => loadAll().catch(() => {})}>Actualiser</button>
 </div>

 <div className={styles.statsGrid}>
 <div className={styles.statCard}><span>Utilisateurs</span><strong>{stats.total || analytics.totals.users || 0}</strong></div>
 <div className={styles.statCard}><span>Studio</span><strong>{stats.premium || analytics.planMix.studio || 0}</strong></div>
 <div className={styles.statCard}><span>Associes</span><strong>{stats.associates || analytics.roles?.associates || 0}</strong></div>
 <div className={styles.statCard}><span>Titres catalogue</span><strong>{catalogStats.total || analytics.totals.tracks || 0}</strong></div>
 <div className={styles.statCard}><span>Favoris</span><strong>{analytics.totals.favorites || 0}</strong></div>
 <div className={styles.statCard}><span>IA aujourd'hui</span><strong>{analytics.totals.aiRequestsToday || aiConfig.usage?.aiToday || 0}</strong></div>
 </div>

 <div className={styles.infoGrid}>
 <section className={styles.infoPanel}>
 <div className={styles.panelHead}><h2>Restrictions Free</h2><p>Limites appliquees cote serveur, pas seulement dans l'interface.</p></div>
 <div className={styles.limitList}>
 <div><span>Playlists</span><strong>3</strong></div>
 <div><span>Titres / playlist</span><strong>25</strong></div>
 <div><span>Favoris</span><strong>30</strong></div>
 <div><span>IA Free</span><strong>Bloquee</strong></div>
 </div>
 </section>
 <section className={styles.infoPanel}>
 <div className={styles.panelHead}><h2>Providers IA</h2><p>OpenAI, Ollama local et endpoint compatible OpenAI.</p></div>
 <div className={styles.providerGrid}>
 {providerRows.map(([key, provider]) => (
 <div key={key} className={styles.providerCard}>
 <strong>{key}</strong>
 <span>{provider.configured ? 'Configure' : 'A configurer'}</span>
 <small>{provider.model}</small>
 </div>
 ))}
 </div>
 </section>
 </div>

 <div className={styles.layout}>
 <section className={styles.panel}>
 <div className={styles.panelHead}><h2>Creer un utilisateur</h2><p>Ajoute un compte local pour tester les roles et plans.</p></div>
 <form className={styles.form} onSubmit={handleCreate}>
 <div className={styles.formGrid}>
 <label><span>Nom</span><input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} /></label>
 <label><span>Email</span><input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} /></label>
 <label><span>Mot de passe</span><input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} /></label>
 <label><span>Role</span><select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}><option value="user">user</option><option value="associate">associate</option><option value="admin">admin</option></select></label>
 <label><span>Plan</span><select value={form.plan} onChange={e => setForm(prev => ({ ...prev, plan: e.target.value }))}><option>Free</option><option>Studio</option></select></label>
 <label><span>Statut</span><select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}><option value="active">active</option><option value="paused">paused</option></select></label>
 </div>
 {message && <div className={styles.message}>{message}</div>}
 <button className={styles.submit} type="submit">Creer le compte</button>
 </form>

 <div className={styles.catalogBox}>
 <div className={styles.panelHead}><h2>Top titres</h2><p>Base sur l'historique local agrege.</p></div>
 <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Titre</th><th>Lectures</th></tr></thead><tbody>{analytics.topTracks.map((item, idx) => <tr key={`${item.track?.youtubeId}-${idx}`}><td><strong>{item.track?.title}</strong><span>{item.track?.artist}</span></td><td>{item.plays}</td></tr>)}</tbody></table></div>
 </div>
 </section>

 <section className={styles.panel}>
 <div className={styles.panelHead}><h2>CMS public</h2><p>Modifie le contenu visible sur la home et les plans.</p></div>
 <form className={styles.form} onSubmit={saveCms}>
 <div className={styles.formGrid}>
 <label><span>Nom de marque</span><input value={cmsForm.brandName || ''} onChange={e => setCmsForm(prev => ({ ...prev, brandName: e.target.value }))} /></label>
 <label><span>Accent logo</span><input value={cmsForm.logoAccent || ''} onChange={e => setCmsForm(prev => ({ ...prev, logoAccent: e.target.value }))} /></label>
 <label><span>Badge hero</span><input value={cmsForm.heroBadge || ''} onChange={e => setCmsForm(prev => ({ ...prev, heroBadge: e.target.value }))} /></label>
 <label><span>Titre hero</span><input value={cmsForm.heroTitle || ''} onChange={e => setCmsForm(prev => ({ ...prev, heroTitle: e.target.value }))} /></label>
 <label><span>Sous-titre hero</span><input value={cmsForm.heroSubtitle || ''} onChange={e => setCmsForm(prev => ({ ...prev, heroSubtitle: e.target.value }))} /></label>
 <label><span>CTA principal</span><input value={cmsForm.homePrimaryCta || ''} onChange={e => setCmsForm(prev => ({ ...prev, homePrimaryCta: e.target.value }))} /></label>
 <label><span>CTA secondaire</span><input value={cmsForm.homeSecondaryCta || ''} onChange={e => setCmsForm(prev => ({ ...prev, homeSecondaryCta: e.target.value }))} /></label>
 <label><span>Banniere</span><input value={cmsForm.marketingBanner || ''} onChange={e => setCmsForm(prev => ({ ...prev, marketingBanner: e.target.value }))} /></label>
 <label><span>Prix Free</span><input value={cmsForm.pricingFree || ''} onChange={e => setCmsForm(prev => ({ ...prev, pricingFree: e.target.value }))} /></label>
 <label><span>Prix Studio</span><input value={cmsForm.pricingStudio || ''} onChange={e => setCmsForm(prev => ({ ...prev, pricingStudio: e.target.value }))} /></label>
 <label><span>Banniere limites Free</span><input value={cmsForm.freeLimitBanner || ''} onChange={e => setCmsForm(prev => ({ ...prev, freeLimitBanner: e.target.value }))} /></label>
 </div>
 {cmsMessage && <div className={styles.message}>{cmsMessage}</div>}
 <button className={styles.submit} type="submit" disabled={savingCms}>{savingCms ? 'Sauvegarde...' : 'Publier les changements'}</button>
 </form>

 <div className={styles.editorBox}>
 <ContentBlocksEditor settings={cmsForm} onSave={saveBlocks} saving={savingCms} />
 </div>

 <form className={styles.aiTester} onSubmit={testAi}>
 <div className={styles.panelHead}><h2>Test IA serveur</h2><p>Teste le proxy sans exposer les cles API au navigateur.</p></div>
 <div className={styles.formGrid}>
 <label><span>Provider</span><select value={aiProvider} onChange={e => setAiProvider(e.target.value)}>{providerRows.map(([key]) => <option key={key} value={key}>{key}</option>)}</select></label>
 <label><span>Prompt</span><textarea rows="4" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} /></label>
 </div>
 <button className={styles.submit} type="submit" disabled={testingAi}>{testingAi ? 'Test en cours...' : 'Tester le provider'}</button>
 {aiResponse ? <pre className={styles.aiResponse}>{aiResponse}</pre> : null}
 </form>

 <div className={styles.tableWrap}>
 <table className={styles.table}>
 <thead><tr><th>Nom</th><th>Role</th><th>Plan</th><th>Statut</th><th>Infos</th><th>Actions</th></tr></thead>
 <tbody>{users.map(user => <tr key={user.id}><td><strong>{user.name}</strong><span>{user.email}</span></td><td><select className={styles.inlineSelect} value={user.role} onChange={e => updateUser({ ...user, role: e.target.value })}><option value="user">user</option><option value="associate">associate</option><option value="admin">admin</option></select></td><td>{user.plan}</td><td>{user.status}</td><td><span>Cree: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span><span>Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}</span></td><td><div className={styles.actions}><button onClick={() => togglePlan(user)}>{user.plan === 'Free' ? 'Passer Studio' : 'Passer Free'}</button><button onClick={() => toggleStatus(user)}>{user.status === 'active' ? 'Suspendre' : 'Reactiver'}</button></div></td></tr>)}</tbody>
 </table>
 </div>
 <p className={styles.helper}>{loading ? 'Chargement...' : `Chaines indexees : ${catalogStats.channels}  -  Dernier import : ${catalogStats.latestImportAt ? new Date(catalogStats.latestImportAt).toLocaleString() : 'aucun'}`}</p>
 </section>
 </div>
 </div>
 )
}
