import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearLegacyAuthToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
 const [users, setUsers] = useState([])
 const [stats, setStats] = useState({ total: 0, admins: 0, associates: 0, premium: 0, free: 0, active: 0 })
 const [currentUser, setCurrentUser] = useState(null)
 const [loading, setLoading] = useState(true)

 async function refreshAdminData(user = currentUser) {
 if (user?.role === 'admin') {
 const data = await api.listUsers()
 setUsers(data.users)
 setStats(data.stats)
 return data
 }
 setUsers([])
 setStats({ total: 0, admins: 0, associates: 0, premium: 0, free: 0, active: 0 })
 return null
 }

 async function refreshMe() {
 const { user } = await api.me()
 setCurrentUser(user)
 await refreshAdminData(user)
 return user
 }

 useEffect(() => {
 let mounted = true

 async function bootstrap() {
 try {
 const { user } = await api.me()
 if (!mounted) return
 setCurrentUser(user)
 if (user.role === 'admin') {
 const data = await api.listUsers()
 if (!mounted) return
 setUsers(data.users)
 setStats(data.stats)
 }
 } catch {
 clearLegacyAuthToken()
 } finally {
 if (mounted) setLoading(false)
 }
 }

 bootstrap()
 return () => { mounted = false }
 }, [])

 async function login(email, password) {
 try {
 const data = await api.login(email, password)
 clearLegacyAuthToken()
 setCurrentUser(data.user)
 await refreshAdminData(data.user)
 return { ok: true, user: data.user }
 } catch (error) {
 return { ok: false, message: error.message }
 }
 }

 async function register(payload) {
 try {
 const data = await api.register(payload)
 clearLegacyAuthToken()
 setCurrentUser(data.user)
 await refreshAdminData(data.user)
 return { ok: true, user: data.user }
 } catch (error) {
 return { ok: false, message: error.message }
 }
 }

 function logout() {
 api.logout().catch(() => {})
 clearLegacyAuthToken()
 setCurrentUser(null)
 setUsers([])
 setStats({ total: 0, admins: 0, associates: 0, premium: 0, free: 0, active: 0 })
 }

 async function createUser(payload) {
 try {
 const result = await api.createUser(payload)
 await refreshAdminData(currentUser)
 return { ok: true, user: result.user }
 } catch (error) {
 return { ok: false, message: error.message }
 }
 }

 async function updateUser(nextUser) {
 try {
 const result = await api.updateUser(nextUser.id, nextUser)
 await refreshAdminData(currentUser)
 if (currentUser?.id === nextUser.id) setCurrentUser(result.user)
 return { ok: true, user: result.user }
 } catch (error) {
 return { ok: false, message: error.message }
 }
 }

 async function updateProfile(payload) {
 try {
 const result = await api.updateProfile(payload)
 setCurrentUser(result.user)
 await refreshAdminData(result.user)
 return { ok: true, user: result.user }
 } catch (error) {
 return { ok: false, message: error.message }
 }
 }

 async function updatePlan(plan) {
 try {
 const result = await api.updatePlan(plan)
 setCurrentUser(result.user)
 await refreshAdminData(result.user)
 return { ok: true, user: result.user }
 } catch (error) {
 return { ok: false, message: error.message }
 }
 }

 const value = useMemo(() => ({
 users,
 stats,
 currentUser,
 loading,
 isAuthenticated: Boolean(currentUser),
 isAdmin: currentUser?.role === 'admin',
 isStaff: currentUser?.role === 'admin' || currentUser?.role === 'associate',
 canManageSite: Boolean(currentUser?.access?.canManageSite || currentUser?.role === 'admin' || currentUser?.role === 'associate'),
 canUseAi: Boolean(currentUser?.access?.canUseAi),
 login,
 register,
 logout,
 createUser,
 updateUser,
 updateProfile,
 updatePlan,
 refreshUsers: refreshAdminData,
 refreshMe,
 }), [users, stats, currentUser, loading])

 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
 return useContext(AuthContext)
}
