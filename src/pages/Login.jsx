import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

const initialRegister = { name: '', email: '', password: '' }
const initialLogin = { email: '', password: '' }

export default function Login() {
 const { login, register, isAuthenticated, loading } = useAuth()
 const navigate = useNavigate()
 const location = useLocation()
 const [mode, setMode] = useState('login')
 const [loginForm, setLoginForm] = useState(initialLogin)
 const [registerForm, setRegisterForm] = useState(initialRegister)
 const [error, setError] = useState('')
 const [message, setMessage] = useState('')
 const [submitting, setSubmitting] = useState(false)

 if (!loading && isAuthenticated) {
 return <Navigate to={location.state?.from?.pathname || '/'} replace />
 }

 async function handleLogin(e) {
 e.preventDefault()
 setSubmitting(true)
 setError('')
 setMessage('')
 const result = await login(loginForm.email, loginForm.password)
 setSubmitting(false)
 if (!result.ok) return setError(result.message)
 navigate(location.state?.from?.pathname || '/', { replace: true })
 }

 async function handleRegister(e) {
 e.preventDefault()
 setSubmitting(true)
 setError('')
 setMessage('')
 const result = await register(registerForm)
 setSubmitting(false)
 if (!result.ok) return setError(result.message)
 setMessage('Compte cree. Bienvenue sur Viewly.')
 navigate('/', { replace: true })
 }

 return (
 <div className={styles.wrap}>
 <div className={styles.card}>
 <section className={styles.hero}>
 <span className={styles.eyebrow}>Acces securise</span>
 <h1>Connecte ton workspace Viewly</h1>
 <p>Session par cookie HttpOnly, jeton CSRF et synchronisation des favoris, playlists et parametres.</p>
 <div className={styles.securityList}>
 <span><ShieldCheck size={15} /> Auth serveur</span>
 <span><Lock size={15} /> Cookie protege</span>
 </div>
 </section>

 <section className={styles.panelCol}>
 <div className={styles.switcher}>
 <button className={`${styles.switchBtn} ${mode === 'login' ? styles.switchBtnActive : ''}`} onClick={() => setMode('login')}>Connexion</button>
 <button className={`${styles.switchBtn} ${mode === 'register' ? styles.switchBtnActive : ''}`} onClick={() => setMode('register')}>Inscription</button>
 </div>

 {mode === 'login' ? (
 <form className={styles.form} onSubmit={handleLogin}>
 <label>
 <span>Email</span>
 <input required maxLength={200} autoComplete="email" type="email" value={loginForm.email} onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))} placeholder="toi@viewly.app" />
 </label>

 <label>
 <span>Mot de passe</span>
 <input required minLength={6} maxLength={200} autoComplete="current-password" type="password" value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Mot de passe" />
 </label>

 {error && <div className={styles.error}>{error}</div>}
 {message && <div className={styles.message}>{message}</div>}
 <button className={styles.submit} type="submit" disabled={submitting || loading}>{submitting ? 'Connexion...' : 'Se connecter'}</button>
 </form>
 ) : (
 <form className={styles.form} onSubmit={handleRegister}>
 <label>
 <span>Nom</span>
 <input required maxLength={100} autoComplete="name" value={registerForm.name} onChange={e => setRegisterForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ton nom" />
 </label>
 <label>
 <span>Email</span>
 <input required maxLength={200} autoComplete="email" type="email" value={registerForm.email} onChange={e => setRegisterForm(prev => ({ ...prev, email: e.target.value }))} placeholder="toi@viewly.app" />
 </label>
 <label>
 <span>Mot de passe</span>
 <input required minLength={6} maxLength={200} autoComplete="new-password" type="password" value={registerForm.password} onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))} placeholder="6 caracteres minimum" />
 </label>

 {error && <div className={styles.error}>{error}</div>}
 {message && <div className={styles.message}>{message}</div>}
 <button className={styles.submit} type="submit" disabled={submitting || loading}>{submitting ? 'Creation...' : 'Creer mon compte'}</button>
 </form>
 )}
 </section>
 </div>
 </div>
 )
}
