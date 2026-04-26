import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import { PlayerProvider } from './PlayerContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlaylistProvider } from './context/PlaylistContext'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Studio from './pages/Studio'
import Gems from './pages/Gems'
import Login from './pages/Login'
import Admin from './pages/Admin'
import { Liked, Rooms, Social, Subscriptions, Settings } from './pages/OtherPages'
import styles from './App.module.css'

function RequireAuth({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function AppShell() {
  const { isAuthenticated, loading } = useAuth()
  const [theme, setTheme] = useState(() => localStorage.getItem('viewly-theme') || 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('viewly-theme', theme)
  }, [theme])

  useEffect(() => {
    const close = () => setSidebarOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [])

  const themeLabel = useMemo(() => theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre', [theme])
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <div className={styles.app}>
      <header className={styles.mobileHeader}>
        <button className={styles.mobileMenuBtn} onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu"><Menu size={20} /></button>
        <div className={styles.mobileBrand}>View<span>ly</span></div>
        <button className={styles.mobileThemeBtn} onClick={toggleTheme} aria-label={themeLabel}>{theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}</button>
      </header>

      <Sidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        themeLabel={themeLabel}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && <button className={styles.backdrop} onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" />}

      <main className={styles.main} onClick={() => sidebarOpen && setSidebarOpen(false)}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
          <Route path="/liked" element={<Liked />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/gems" element={<Gems />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/social" element={<Social />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/settings" element={<RequireAuth><Settings theme={theme} onToggleTheme={toggleTheme} /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
          <Route path="*" element={<Navigate to={loading ? '/' : (isAuthenticated ? '/' : '/login')} replace />} />
        </Routes>
      </main>
      <Player />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteSettingsProvider>
          <PlaylistProvider>
            <PlayerProvider>
              <AppShell />
            </PlayerProvider>
          </PlaylistProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
