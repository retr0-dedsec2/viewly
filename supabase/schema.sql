create extension if not exists "uuid-ossp";
create table profiles(id uuid primary key, email text unique, plan text default 'free', created_at timestamptz default now());
create table workspaces(id uuid primary key default uuid_generate_v4(), owner_id uuid references profiles(id), name text not null, created_at timestamptz default now());
create table tracks(id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id), title text not null, artist text, youtube_id text, bpm int, mood text, energy int, created_at timestamptz default now());
create table playlists(id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id), name text not null, type text default 'music', created_at timestamptz default now());
create table playlist_tracks(id uuid primary key default uuid_generate_v4(), playlist_id uuid references playlists(id) on delete cascade, track_id uuid references tracks(id), position int default 0);
create table listens(id uuid primary key default uuid_generate_v4(), profile_id uuid references profiles(id), track_id uuid references tracks(id), listened_at timestamptz default now());
create table ai_requests(id uuid primary key default uuid_generate_v4(), workspace_id uuid references workspaces(id), profile_id uuid references profiles(id), prompt text not null, response jsonb, created_at timestamptz default now());
alter table profiles enable row level security;alter table workspaces enable row level security;alter table tracks enable row level security;alter table playlists enable row level security;alter table playlist_tracks enable row level security;alter table listens enable row level security;alter table ai_requests enable row level security;
