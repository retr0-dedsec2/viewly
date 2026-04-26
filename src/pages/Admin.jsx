import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { api } from '../lib/api'
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

  useEffect(() => { setCmsForm(settings) }, [settings])

  async function loadAll() {
    setLoading(true)
    try {
      await refreshUsers(currentUser)
      const [statsData, analyticsData] = await Promise.all([api.catalogStats(), api.adminAnalytics()])
      setCatalogStats(statsData)
      setAnalytics(analyticsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll().catch(() => setLoading(false)) }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const result = await createUser(form)
    if (!result.ok) return setMessage(result.message)
    setMessage('Utilisateur créé.')
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
      setCmsMessage('Contenu public mis à jour.')
    } finally {
      setSavingCms(false)
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
        <div className={styles.statCard}><span>Titres catalogue</span><strong>{catalogStats.total || analytics.totals.tracks || 0}</strong></div>
        <div className={styles.statCard}><span>Favoris</span><strong>{analytics.totals.favorites || 0}</strong></div>
      </div>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>Créer un utilisateur</h2><p>Ajoute un compte local pour tester les rôles et plans.</p></div>
          <form className={styles.form} onSubmit={handleCreate}>
            <div className={styles.formGrid}>
              <label><span>Nom</span><input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} /></label>
              <label><span>Email</span><input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} /></label>
              <label><span>Mot de passe</span><input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} /></label>
              <label><span>Rôle</span><select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}><option value="user">user</option><option value="admin">admin</option></select></label>
              <label><span>Plan</span><select value={form.plan} onChange={e => setForm(prev => ({ ...prev, plan: e.target.value }))}><option>Free</option><option>Studio</option></select></label>
              <label><span>Statut</span><select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}><option value="active">active</option><option value="paused">paused</option></select></label>
            </div>
            {message && <div className={styles.message}>{message}</div>}
            <button className={styles.submit} type="submit">Créer le compte</button>
          </form>

          <div className={styles.catalogBox}>
            <div className={styles.panelHead}><h2>Top titres</h2><p>Basé sur l’historique local agrégé.</p></div>
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
              <label><span>Bannière</span><input value={cmsForm.marketingBanner || ''} onChange={e => setCmsForm(prev => ({ ...prev, marketingBanner: e.target.value }))} /></label>
              <label><span>Prix Free</span><input value={cmsForm.pricingFree || ''} onChange={e => setCmsForm(prev => ({ ...prev, pricingFree: e.target.value }))} /></label>
              <label><span>Prix Studio</span><input value={cmsForm.pricingStudio || ''} onChange={e => setCmsForm(prev => ({ ...prev, pricingStudio: e.target.value }))} /></label>
            </div>
            {cmsMessage && <div className={styles.message}>{cmsMessage}</div>}
            <button className={styles.submit} type="submit" disabled={savingCms}>{savingCms ? 'Sauvegarde…' : 'Publier les changements'}</button>
          </form>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Nom</th><th>Rôle</th><th>Plan</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>{users.map(user => <tr key={user.id}><td><strong>{user.name}</strong><span>{user.email}</span></td><td>{user.role}</td><td>{user.plan}</td><td>{user.status}</td><td><div className={styles.actions}><button onClick={() => togglePlan(user)}>{user.plan === 'Free' ? 'Passer Studio' : 'Passer Free'}</button><button onClick={() => toggleStatus(user)}>{user.status === 'active' ? 'Suspendre' : 'Réactiver'}</button></div></td></tr>)}</tbody>
            </table>
          </div>
          <p className={styles.helper}>{loading ? 'Chargement…' : `Chaînes indexées : ${catalogStats.channels} · Dernier import : ${catalogStats.latestImportAt ? new Date(catalogStats.latestImportAt).toLocaleString() : 'aucun'}`}</p>
        </section>
      </div>
    </div>
  )
}
