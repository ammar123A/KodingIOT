-- KodingIoT Database Schema
-- PostgreSQL — For use with Supabase
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- Supabase Auth handles authentication; the public.users table stores
-- profile data linked via auth.users.id (UUID).

-- =============================================
-- 1. Users table (profile data)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY,                            -- matches auth.users.id
    username    VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'student',     -- student | teacher | admin
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. Projects table
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
    id              SERIAL PRIMARY KEY,
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT         NOT NULL DEFAULT '',
    tags            TEXT[]       NOT NULL DEFAULT '{}',      -- PostgreSQL array
    level           VARCHAR(20)  NOT NULL DEFAULT 'mudah',   -- mudah | menengah | sulit
    type            VARCHAR(20)  NOT NULL DEFAULT 'iot',     -- iot | game | sensor
    workspace_data  JSONB        NOT NULL DEFAULT '{}',      -- Blockly serialization
    code            TEXT         NOT NULL DEFAULT '',         -- generated JS
    is_featured     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_public       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id   ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects (is_public);
CREATE INDEX IF NOT EXISTS idx_projects_type      ON projects (type);
CREATE INDEX IF NOT EXISTS idx_projects_level     ON projects (level);
CREATE INDEX IF NOT EXISTS idx_projects_tags      ON projects USING GIN (tags);

-- =============================================
-- 4. Helper: auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 5. Row Level Security (RLS)
-- =============================================

-- Enable RLS on both tables
ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read profiles; users can update their own
CREATE POLICY "Public profiles are viewable by everyone"
    ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile on signup"
    ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: public projects readable by everyone
CREATE POLICY "Public projects are viewable by everyone"
    ON projects FOR SELECT USING (is_public = true);

-- Projects: owners can see all their own projects (public or private)
CREATE POLICY "Users can view own projects"
    ON projects FOR SELECT USING (auth.uid() = user_id);

-- Projects: owners can insert
CREATE POLICY "Users can create projects"
    ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects: owners can update their own
CREATE POLICY "Users can update own projects"
    ON projects FOR UPDATE USING (auth.uid() = user_id);

-- Projects: owners can delete their own
CREATE POLICY "Users can delete own projects"
    ON projects FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. Seed: default admin account
--    After running this schema, create the admin via Supabase Auth
--    (Dashboard → Authentication → Users → Add User), then:
-- =============================================
-- INSERT INTO users (id, username, email, role)
-- VALUES ('<admin-auth-uuid>', 'admin', 'admin@kodingiot.local', 'admin')
-- ON CONFLICT (username) DO NOTHING;
