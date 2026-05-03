import { NavLink } from 'react-router-dom'
import {
 CreditCard,
 Heart,
 Home,
 Library,
 LogIn,
 LogOut,
 Moon,
 PencilRuler,
 PlusCircle,
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

const LOGO_SRC = '/viewly-logo.png'

export default function Sidebar({ theme, onToggleTheme, themeLabel, isOpen = false, onClose = () => {} }) {
 const { currentUser, isAdmin, isStaff, isAuthenticated, logout } = useAuth()

 const nav = [
 {
 label: 'Votre musique',
 items: [
 { to: '/', label: 'Accueil', Icon: Home, end: true },
 { to: '/search', label: 'Recherche', Icon: Search },
 { to: '/library', label: 'Bibliotheque', Icon: Library },
 { to: '/liked', label: 'Favoris', Icon: Heart },
 ],
 },
 {
 label: 'Creation',
 items: [
 { to: '/studio', label: 'Studio', Icon: WandSparkles, badge: 'Plus', badgeColor: 'var(--accent2)' },
 ],
 },
 {
 label: 'Collaboration',
 items: [
 { to: '/rooms', label: 'Rooms', Icon: Radio, badge: 'Live', badgeColor: 'var(--accent)' },
 { to: '/social', label: 'Social', Icon: Users },
 ],
 },
 {
 label: 'Compte',
 items: [
 { to: '/subscriptions', label: 'Plans', Icon: CreditCard },
 { to: '/settings', label: 'Parametres', Icon: Settings },
 ...(isAuthenticated ? [] : [{ to: '/login', label: 'Connexion', Icon: LogIn }]),
 ...(isStaff ? [{ to: '/editor', label: 'Edition', Icon: PencilRuler, badge: 'CMS', badgeColor: 'var(--accent2)' }] : []),
 ...(isAdmin ? [{ to: '/admin', label: 'Admin', Icon: ShieldCheck, badge: 'Pro', badgeColor: 'var(--accent)' }] : []),
 ],
 },
 ]

 return (
 <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
 <div className={styles.mobileTop}>
 <div className={styles.mobileBrand}>Navigation</div>
 <button className={styles.mobileClose} onClick={onClose} aria-label="Fermer le menu"><X size={16} /></button>
 </div>

 <div className={styles.logoWrap}>
 <NavLink to="/" className={styles.logo} onClick={onClose} aria-label="Accueil Viewly">
 <img className={styles.logoIcon} src={LOGO_SRC} alt="" />
 <div>
 <span className={styles.logoName}>View<em>ly</em></span>
 <p className={styles.logoSub}>Music workspace</p>
 </div>
 </NavLink>

 <NavLink to="/library" className={styles.createBtn} onClick={onClose}>
 <PlusCircle size={17} />
 <span>Nouvelle playlist</span>
 </NavLink>

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
 ))}
 </div>
 ))}
 </nav>

 <div className={styles.footer}>
 <div className={styles.insightCard}>
 <span className={styles.insightEyebrow}>Session</span>
 <p>Lecture, recommandations et playlists restent accessibles depuis le player.</p>
 </div>

 <div className={styles.userPill}>
 <div className={styles.avatar} style={currentUser?.avatarUrl ? { backgroundImage: `url(${currentUser.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : {}}>{currentUser?.name?.slice(0, 2).toUpperCase() || 'TU'}</div>
 <div className={styles.userInfo}>
 <p>{currentUser?.name || 'Invite'}</p>
 <span>{currentUser ? `${currentUser.plan} / ${currentUser.role}` : 'Connecte-toi pour synchroniser'}</span>
 </div>
 {isAuthenticated ? (
 <button className={styles.settingsBtn} onClick={logout} aria-label="Deconnexion"><LogOut size={16} /></button>
 ) : (
 <NavLink to="/login" className={styles.settingsBtn} onClick={onClose} aria-label="Connexion"><LogIn size={16} /></NavLink>
 )}
 </div>
 </div>
 </aside>
 )
}
