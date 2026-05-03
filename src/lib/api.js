const CSRF_COOKIE = 'viewly_csrf'
let csrfRequest = null

export function clearLegacyAuthToken() {
 // Auth is cookie-based; legacy bearer tokens are no longer read from browser storage.
}

function readCookie(name) {
 return document.cookie
 .split(';')
 .map(item => item.trim())
 .find(item => item.startsWith(`${name}=`))
 ?.slice(name.length + 1) || ''
}

async function ensureCsrfToken() {
 const existing = readCookie(CSRF_COOKIE)
 if (existing) return decodeURIComponent(existing)
 if (!csrfRequest) {
 csrfRequest = fetch('/api/auth/csrf', { credentials: 'include' })
 .finally(() => { csrfRequest = null })
 }
 await csrfRequest
 const next = readCookie(CSRF_COOKIE)
 return next ? decodeURIComponent(next) : ''
}

async function request(path, options = {}) {
 const method = String(options.method || 'GET').toUpperCase()
 const csrfToken = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? await ensureCsrfToken() : ''
 const headers = {
 ...(options.body ? { 'Content-Type': 'application/json' } : {}),
 ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
 ...(options.headers || {}),
 }
 const response = await fetch(path, {
 ...options,
 method,
 credentials: 'include',
 headers,
 })

 const data = await response.json().catch(() => ({}))
 if (response.status === 401) clearLegacyAuthToken()
 if (!response.ok) throw new Error(data.message || 'Erreur serveur')
 return data
}

export const api = {
 request,
 health: () => request('/api/health'),
 register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
 login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
 logout: () => request('/api/auth/logout', { method: 'POST' }),
 me: () => request('/api/auth/me'),
 usage: () => request('/api/me/usage'),
 updateProfile: (payload) => request('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
 updatePlan: (plan) => request('/api/billing/plan', { method: 'PATCH', body: JSON.stringify({ plan }) }),
 paypalConfig: () => request('/api/billing/paypal/config'),
 createPayPalOrder: (plan) => request('/api/billing/paypal/orders', { method: 'POST', body: JSON.stringify({ plan }) }),
 capturePayPalOrder: (orderId) => request(`/api/billing/paypal/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST' }),
 listUsers: () => request('/api/admin/users'),
 createUser: (payload) => request('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
 updateUser: (id, payload) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
 adminAnalytics: () => request('/api/admin/analytics'),
 aiConfig: () => request('/api/ai/config'),
 aiChat: (payload) => request('/api/ai/chat', { method: 'POST', body: JSON.stringify(payload) }),
 aiStudioGenerate: (payload) => request('/api/ai/studio/generate', { method: 'POST', body: JSON.stringify(payload) }),
 listPlaylists: () => request('/api/playlists'),
 createPlaylist: (payload) => request('/api/playlists', { method: 'POST', body: JSON.stringify(payload) }),
 updatePlaylist: (id, payload) => request(`/api/playlists/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
 deletePlaylist: (id) => request(`/api/playlists/${id}`, { method: 'DELETE' }),
 catalog: (params = {}) => request(`/api/catalog?${new URLSearchParams(params).toString()}`),
 catalogStats: () => request('/api/catalog/stats'),
 searchRemoteCatalog: (params = {}) => request(`/api/catalog/search-remote?${new URLSearchParams(params).toString()}`),
 importCatalog: (payload) => request('/api/catalog/import', { method: 'POST', body: JSON.stringify(payload) }),
 trackPlay: (track) => request('/api/history/play', { method: 'POST', body: JSON.stringify({ track }) }),
 myHistory: (params = {}) => request(`/api/history/me?${new URLSearchParams(params).toString()}`),
 myRecommendations: (params = {}) => request(`/api/recommendations/me?${new URLSearchParams(params).toString()}`),
 myTasteProfile: () => request('/api/taste-profile/me'),
 listFavorites: () => request('/api/favorites'),
 toggleFavorite: (track) => request('/api/favorites/toggle', { method: 'POST', body: JSON.stringify({ track }) }),
 publicSettings: () => request('/api/settings/public'),
 adminSettings: () => request('/api/settings/admin'),
 updateAdminSettings: (payload) => request('/api/settings/admin', { method: 'PATCH', body: JSON.stringify(payload) }),
 discover: (params = {}) => request(`/api/discover?${new URLSearchParams(params).toString()}`),
}
