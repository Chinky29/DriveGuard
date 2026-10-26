-- ==============================================================================
-- DriveGuard Supabase Database Migration
-- 
-- Implements:
-- 1. Tables: profiles, calibrations, sessions, metric_points, events
-- 2. Row Level Security (RLS) on EVERY table
-- 3. Clerk JWT Integration: Policies scoped strictly to Clerk User ID (sub claim)
-- ==============================================================================

-- 1. Helper function to extract the authenticated Clerk user ID from JWT claims
CREATE OR REPLACE FUNCTION requesting_user_id() RETURNS TEXT AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      (current_setting('request.jwt.claim.sub', true))
    ),
    ''
  )::text;
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------------------------
-- 2. Table: profiles
-- Stores user identity synchronized from Clerk
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, -- Clerk User ID (e.g. user_2...)
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = requesting_user_id());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = requesting_user_id());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = requesting_user_id());

-- ------------------------------------------------------------------------------
-- 3. Table: calibrations
-- Stores personalized driver facial baseline EAR & MAR measurements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  baseline_ear NUMERIC(6, 4) NOT NULL,
  baseline_mar NUMERIC(6, 4) NOT NULL,
  ear_low_threshold NUMERIC(6, 4) NOT NULL,
  ear_very_low_threshold NUMERIC(6, 4) NOT NULL,
  ear_reopen_threshold NUMERIC(6, 4) NOT NULL,
  mar_open_threshold NUMERIC(6, 4) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sample_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_calibration UNIQUE (user_id)
);

ALTER TABLE calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calibration" ON calibrations
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own calibration" ON calibrations
  FOR INSERT WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own calibration" ON calibrations
  FOR UPDATE USING (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own calibration" ON calibrations
  FOR DELETE USING (user_id = requesting_user_id());

-- ------------------------------------------------------------------------------
-- 4. Table: sessions
-- Driver monitoring sessions summary and aggregates
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  avg_fatigue_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  peak_fatigue_score INTEGER NOT NULL DEFAULT 0,
  notice_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own sessions" ON sessions
  FOR DELETE USING (user_id = requesting_user_id());

-- ------------------------------------------------------------------------------
-- 5. Table: metric_points
-- Time-series telemetry points for historical trend and sparkline charts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp_sec NUMERIC(8, 2) NOT NULL,
  fatigue_score INTEGER NOT NULL,
  ear NUMERIC(6, 4) NOT NULL,
  mar NUMERIC(6, 4) NOT NULL,
  pitch NUMERIC(6, 2) NOT NULL,
  yaw NUMERIC(6, 2) NOT NULL,
  roll NUMERIC(6, 2) NOT NULL,
  perclos NUMERIC(6, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE metric_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metric points" ON metric_points
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own metric points" ON metric_points
  FOR INSERT WITH CHECK (user_id = requesting_user_id());

-- ------------------------------------------------------------------------------
-- 6. Table: events
-- Observable physiological advisory events triggered during monitoring
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp_sec NUMERIC(8, 2) NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Notice', 'Warning', 'Critical')),
  score INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (user_id = requesting_user_id());

-- ------------------------------------------------------------------------------
-- 7. Indexes for Query Performance
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_calibrations_user_id ON calibrations(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_metric_points_session_id ON metric_points(session_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
