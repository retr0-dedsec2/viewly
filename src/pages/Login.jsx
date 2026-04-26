import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

const initialRegister = { name: '', email: '', password: '' }
const initialLogin = { email: 'admin@viewly.local', password: 'admin123' }

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
    setMessage('Compte créé. Bienvenue sur Viewly.')
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Viewly Access</span>
          <h1>Connexion + inscription</h1>
          <p>Auth reliée au backend local, comptes persistés, avatar et playlists personnelles prêtes côté API.</p>
        </div>

        <div className={styles.panelCol}>
          <div className={styles.demoBox}>
            <strong>Comptes de démo</strong>
            <span>Admin : admin@viewly.local / admin123</span>
            <span>User : lina@viewly.local / demo123</span>
          </div>

          <div className={styles.switcher}>
            <button className={`${styles.switchBtn} ${mode === 'login' ? styles.switchBtnActive : ''}`} onClick={() => setMode('login')}>Connexion</button>
            <button className={`${styles.switchBtn} ${mode === 'register' ? styles.switchBtnActive : ''}`} onClick={() => setMode('register')}>Inscription</button>
          </div>

          {mode === 'login' ? (
            <form className={styles.form} onSubmit={handleLogin}>
              <label>
                <span>Email</span>
                <input type="email" value={loginForm.email} onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))} placeholder="admin@viewly.local" />
              </label>

              <label>
                <span>Mot de passe</span>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))} placeholder="••••••••" />
              </label>

              {error && <div className={styles.error}>{error}</div>}
              {message && <div className={styles.message}>{message}</div>}
              <button className={styles.submit} type="submit" disabled={submitting || loading}>{submitting ? 'Connexion…' : 'Se connecter'}</button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleRegister}>
              <label>
                <span>Nom</span>
                <input value={registerForm.name} onChange={e => setRegisterForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ton pseudo" />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={registerForm.email} onChange={e => setRegisterForm(prev => ({ ...prev, email: e.target.value }))} placeholder="toi@viewly.local" />
              </label>
              <label>
                <span>Mot de passe</span>
                <input type="password" value={registerForm.password} onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))} placeholder="6 caractères minimum" />
              </label>

              {error && <div className={styles.error}>{error}</div>}
              {message && <div className={styles.message}>{message}</div>}
              <button className={styles.submit} type="submit" disabled={submitting || loading}>{submitting ? 'Création…' : 'Créer mon compte'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
