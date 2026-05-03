# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Viewly Music is a music streaming web application with a React frontend and Node.js backend. It features YouTube API integration, JWT authentication, user management, and a music player with real-time playback controls.

## Commands

```bash
npm run dev          # Start Vite frontend dev server (port 5173)
npm run server       # Start Express backend (port 8787)
npm run dev:full     # Run both frontend and backend concurrently
npm run build        # Build frontend for production (outputs to dist/)
npm run preview      # Preview production build
```

## Development Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure:
   - `VITE_YOUTUBE_API_KEY` - YouTube Data API v3 key for search functionality
   - `PORT` - Backend server port (default: 8787)
   - `JWT_SECRET` - Secret for JWT token signing

## Architecture

### Frontend (React + Vite)

**State Management:**
- `src/context/AuthContext.jsx` - Authentication state, user session, admin user management
- `src/PlayerContext.jsx` - Global music player state, contains hardcoded track list with YouTube IDs

**Routing (react-router-dom):**
- Protected routes via `RequireAuth` component with admin-only support
- Public routes: Home, Search, Library, Studio, Gems, Rooms, Social, Settings
- Admin panel at `/admin` (admin-only access)

**Key Components:**
- `src/App.jsx` - Root component with theme management (dark/light), sidebar, player layout
- `src/components/Sidebar.jsx` - Main navigation with sectioned links
- `src/components/Player.jsx` - Bottom player bar with playback controls
- `src/components/TrackCard.jsx` / `TrackRow.jsx` - Track display components

**YouTube Integration:**
- `src/utils/youtube.js` - YouTube API client with search, thumbnail generation, URL helpers
- Search uses YouTube Data API v3 with safe search and embeddable video filtering

**API Client:**
- `src/lib/api.js` - Fetch wrapper with JWT token handling, auto-attaches auth headers

### Backend (Express + NeDB)

**Single file server:** `backend/server.js`

**Features:**
- JWT authentication with bcrypt password hashing
- NeDB file-based persistence (`backend/data/users.db`)
- Auto-seeds two demo accounts on first run

**API Endpoints:**
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user (protected)
- `GET /api/admin/users` - List all users + stats (admin-only)
- `POST /api/admin/users` - Create user (admin-only)
- `PATCH /api/admin/users/:id` - Update user (admin-only)
- `GET /api/health` - Health check with user count

**Middleware:**
- `auth` - Validates JWT token, attaches user to request
- `adminOnly` - Requires admin role

## Demo Accounts

- Admin: `admin@viewly.local` / `admin123`
- User: `lina@viewly.local` / `demo123`

## Technical Details

- **Styling:** CSS Modules (`.module.css` files)
- **Icons:** Unicode symbols + Lucide React
- **Database:** NeDB (file-based NoDB, stores users in `backend/data/`)
- **Token expiry:** 7 days
- **Theme persistence:** localStorage (`viewly-theme` key)
