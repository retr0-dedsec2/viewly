const TOKEN_KEY = 'viewly-token'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getStoredToken()
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Erreur serveur')
  return data
}

export const api = {
  tokenKey: TOKEN_KEY,
  request,
  health: () => request('/api/health'),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/api/auth/me'),
  updateProfile: (payload) => request('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  updatePlan: (plan) => request('/api/billing/plan', { method: 'PATCH', body: JSON.stringify({ plan }) }),
  listUsers: () => request('/api/admin/users'),
  createUser: (payload) => request('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  adminAnalytics: () => request('/api/admin/analytics'),
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
