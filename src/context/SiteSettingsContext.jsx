import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const SiteSettingsContext = createContext(null)

const fallback = {
  brandName: 'Viewly',
  logoAccent: 'ly',
  heroBadge: 'Musique, IA et catalogue local',
  heroTitle: 'Découvre, organise et personnalise ta musique.',
  heroSubtitle: 'Catalogue local, recherche YouTube, goûts musicaux, playlists et administration complète dans une seule interface.',
  homePrimaryCta: 'Lancer ma sélection',
  homeSecondaryCta: 'Voir les tendances',
  marketingBanner: 'Nouveau : profil de goûts musicaux, Pépites interactives et paramètres améliorés.',
  pricingFree: '0€',
  pricingStudio: '7,99€',
  adminAnnouncement: 'L’admin peut modifier le contenu public et enrichir le catalogue depuis la console.',
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
