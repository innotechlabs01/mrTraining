-- Coach-Athlete Isolation Schema
-- Adds proper multi-coach support with Clerk user IDs

-- Users (Clerk is source of truth for identity)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'athlete',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Coaches (extended profile)
CREATE TABLE IF NOT EXISTS coaches (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    specializations TEXT DEFAULT '[]',
    certifications TEXT DEFAULT '[]',
    bio TEXT DEFAULT '',
    experience_years INTEGER DEFAULT 0,
    max_athletes INTEGER DEFAULT 50,
    is_accepting_athletes INTEGER DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Athlete profiles (extended profile)
CREATE TABLE IF NOT EXISTS athlete_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    sport TEXT DEFAULT '',
    experience_level TEXT DEFAULT 'beginner',
    height_cm REAL DEFAULT 0,
    weight_kg REAL DEFAULT 0,
    emergency_contact TEXT DEFAULT '',
    emergency_phone TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Coach-Athlete relationships (supports multiple coaches per athlete)
CREATE TABLE IF NOT EXISTS coach_athlete_links (
    coach_id TEXT NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    athlete_id TEXT NOT NULL REFERENCES athlete_profiles(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_primary INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    PRIMARY KEY (coach_id, athlete_id)
);

-- Pending invitations
CREATE TABLE IF NOT EXISTS pending_invites (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL REFERENCES coaches(id),
    email TEXT NOT NULL,
    clerk_invitation_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_coaches_active ON coaches(is_active);
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_sport ON athlete_profiles(sport);
CREATE INDEX IF NOT EXISTS idx_coach_athlete_links_coach ON coach_athlete_links(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_athlete_links_athlete ON coach_athlete_links(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_athlete_links_status ON coach_athlete_links(status);
CREATE INDEX IF NOT EXISTS idx_pending_invites_coach ON pending_invites(coach_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(email);
