import { NavLink } from 'react-router-dom'
import {
  CreditCard,
  Gem,
  Heart,
  Home,
  Library,
  LogIn,
  LogOut,
  Moon,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './Sidebar.module.css'

export default function Sidebar({ theme, onToggleTheme, themeLabel, isOpen = false, onClose = () => {} }) {
  const { currentUser, isAdmin, isAuthenticated, logout } = useAuth()

  const nav = [
    {
      label: 'Découvrir',
      items: [
        { to: '/', label: 'Accueil', Icon: Home, end: true },
        { to: '/search', label: 'Recherche', Icon: Search },
        { to: '/library', label: 'Bibliothèque', Icon: Library },
        { to: '/liked', label: 'Favoris', Icon: Heart },
      ]
    },
    {
      label: 'Créer',
      items: [
        { to: '/studio', label: 'Studio', Icon: WandSparkles, badge: 'IA', badgeColor: 'var(--accent2)' },
        { to: '/gems', label: 'Pépites', Icon: Gem },
      ]
    },
    {
      label: 'Communauté',
      items: [
        { to: '/rooms', label: 'Rooms', Icon: Radio, badge: 'Live', badgeColor: 'var(--accent)' },
        { to: '/social', label: 'Social', Icon: Users },
      ]
    },
    {
      label: 'Compte',
      items: [
        { to: '/subscriptions', label: 'Abonnements', Icon: CreditCard },
        { to: '/settings', label: 'Paramètres', Icon: Settings },
        ...(isAuthenticated ? [] : [{ to: '/login', label: 'Connexion', Icon: LogIn }]),
        ...(isAdmin ? [{ to: '/admin', label: 'Admin', Icon: ShieldCheck, badge: 'Pro', badgeColor: 'var(--accent)' }] : []),
      ]
    },
  ]

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.mobileTop}>
        <div className={styles.mobileBrand}>Navigation</div>
        <button className={styles.mobileClose} onClick={onClose} aria-label="Fermer le menu"><X size={16} /></button>
      </div>

      <div className={styles.logoWrap}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>V</div>
          <div>
            <span className={styles.logoName}>View<em>ly</em></span>
            <p className={styles.logoSub}>Player web moderne</p>
          </div>
        </div>

        <button className={styles.themeToggle} onClick={onToggleTheme} aria-label={themeLabel}>
          <span>{theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}</span>
          <strong>{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</strong>
        </button>
      </div>

      <nav className={styles.nav}>
        {nav.map(section => (
          <div key={section.label} className={styles.section}>
            <span className={styles.sectionLabel}>{section.label}</span>
            {section.items.map(item => (
              item.Icon ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.icon}><item.Icon size={15} /></span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.badge && (
                  <span className={styles.badge} style={{ background: item.badgeColor }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
              ) : null
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.insightCard}>
          <span className={styles.insightEyebrow}>En ligne</span>
          <p>Palette vert + bleu nuit, miniatures YouTube réelles, paramètres corrigés et profil de goûts musicaux.</p>
        </div>

        <div className={styles.userPill}>
          <div className={styles.avatar} style={currentUser?.avatarUrl ? { backgroundImage: `url(${currentUser.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : {}}>{currentUser?.name?.slice(0, 2).toUpperCase() || 'TU'}</div>
          <div className={styles.userInfo}>
            <p>{currentUser?.name || 'Invité'}</p>
            <span>{currentUser ? `${currentUser.plan} · ${currentUser.role}` : 'Connecte-toi pour synchroniser tes goûts'}</span>
          </div>
          {isAuthenticated ? (
            <button className={styles.settingsBtn} onClick={logout} aria-label="Déconnexion"><LogOut size={16} /></button>
          ) : (
            <NavLink to="/login" className={styles.settingsBtn} onClick={onClose} aria-label="Connexion"><LogIn size={16} /></NavLink>
          )}
        </div>
      </div>
    </aside>
  )
}
