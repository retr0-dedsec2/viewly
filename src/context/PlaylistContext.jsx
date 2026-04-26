import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const PlaylistContext = createContext(null)

export function PlaylistProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)

  async function refreshPlaylists() {
    if (!isAuthenticated) {
      setPlaylists([])
      return []
    }
    setLoading(true)
    try {
      const { playlists } = await api.listPlaylists()
      setPlaylists(playlists)
      return playlists
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      refreshPlaylists().catch(() => setPlaylists([]))
    }
  }, [isAuthenticated, authLoading])

  async function createPlaylist(payload) {
    const result = await api.createPlaylist(payload)
    await refreshPlaylists()
    return result.playlist
  }

  async function updatePlaylist(id, payload) {
    const result = await api.updatePlaylist(id, payload)
    await refreshPlaylists()
    return result.playlist
  }

  async function deletePlaylist(id) {
    await api.deletePlaylist(id)
    await refreshPlaylists()
  }

  const value = useMemo(() => ({
    playlists,
    loading,
    refreshPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
  }), [playlists, loading])

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>
}

export function usePlaylists() {
  return useContext(PlaylistContext)
}
