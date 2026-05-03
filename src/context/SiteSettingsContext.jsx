import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const SiteSettingsContext = createContext(null)

const fallback = {
 brandName: 'Viewly',
 logoAccent: 'ly',
 heroBadge: 'Musique, IA et catalogue local',
 heroTitle: 'Decouvre, organise et personnalise ta musique.',
 heroSubtitle: 'Catalogue local, recherche YouTube, gouts musicaux, playlists et administration complete dans une seule interface.',
 homePrimaryCta: 'Lancer ma selection',
 homeSecondaryCta: 'Voir les tendances',
 marketingBanner: 'Nouveau : profil de gouts musicaux, Pepites integrees au Studio et parametres ameliores.',
 pricingFree: '0 EUR',
 pricingStudio: '7,99 EUR',
 adminAnnouncement: 'Admin peut modifier le contenu public et enrichir le catalogue depuis la console.',
 freeLimitBanner: 'Plan Free : 3 playlists, 25 titres par playlist, 30 favoris et IA reservee au Studio.',
 contentBlocks: [
 { id: 'hero-flow', type: 'workflow', title: 'Accueil editorial', body: 'Mets en avant la promesse Viewly, les playlists du moment et les nouveautes catalogue.', cta: 'Editer la home', visible: true },
 { id: 'free-rules', type: 'notice', title: 'Plan Free cadre', body: 'Le plan gratuit reste utile, mais limite playlists, favoris et IA pour proteger les couts.', cta: 'Voir les limites', visible: true },
 { id: 'studio-lab', type: 'feature', title: 'Studio IA', body: 'Les membres Studio et associes peuvent brancher OpenAI, Ollama ou un fournisseur compatible.', cta: 'Tester IA', visible: true },
 ],
}

export function SiteSettingsProvider({ children }) {
 const [settings, setSettings] = useState(fallback)
 const [loading, setLoading] = useState(true)

 async function refresh() {
 try {
 const data = await api.publicSettings()
 setSettings(data.settings || fallback)
 return data.settings
 } finally {
 setLoading(false)
 }
 }

 async function saveAdminSettings(payload) {
 const data = await api.updateAdminSettings(payload)
 setSettings(data.settings || fallback)
 return data.settings
 }

 useEffect(() => {
 refresh().catch(() => setLoading(false))
 }, [])

 const value = useMemo(() => ({ settings, loading, refresh, saveAdminSettings }), [settings, loading])
 return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings() {
 return useContext(SiteSettingsContext)
}
