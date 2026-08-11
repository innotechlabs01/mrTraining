CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    clerk_user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'athlete',
    role_type TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    specializations JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    cert_level TEXT DEFAULT 'beginner',
    bio TEXT,
    experience_years INT DEFAULT 0,
    website_url TEXT,
    instagram_handle TEXT,
    youtube_handle TEXT,
    athlete_count INT DEFAULT 0,
    max_athletes INT DEFAULT 50,
    is_verified BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    primary_sport TEXT,
    experience_level TEXT,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    body_fat_pct DECIMAL(4,2),
    injury_status TEXT DEFAULT 'healthy',
    training_status TEXT DEFAULT 'active',
    goals JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    coach_id UUID REFERENCES coaches(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    slug TEXT,
    category TEXT,
    sport_type TEXT,
    muscle_groups JSONB DEFAULT '[]',
    equipment JSONB DEFAULT '[]',
    difficulty TEXT,
    description TEXT,
    instructions TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    coach_id UUID NOT NULL REFERENCES coaches(id),
    name TEXT NOT NULL,
    description TEXT,
    sport_type TEXT,
    program_type TEXT DEFAULT 'custom',
    start_date DATE NOT NULL,
    end_date DATE,
    duration_weeks INT,
    status TEXT DEFAULT 'draft',
    is_template BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_program_assignments (
    program_id UUID NOT NULL REFERENCES workout_programs(id),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (program_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES workout_programs(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    coach_id UUID REFERENCES coaches(id),
    name TEXT NOT NULL,
    description TEXT,
    sport_type TEXT,
    scheduled_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled',
    rpe INT,
    athlete_notes TEXT,
    coach_notes TEXT,
    coach_feedback TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    source TEXT DEFAULT 'manual',
    source_id TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_athlete_scheduled ON workouts(athlete_id, scheduled_date);
CREATE INDEX idx_workouts_coach_status ON workouts(coach_id, status);
CREATE INDEX idx_workouts_program ON workouts(program_id);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercise_library(id),
    section TEXT,
    sort_order INT,
    notes TEXT,
    rest_seconds INT,
    tempo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);

CREATE TABLE IF NOT EXISTS workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INT NOT NULL,
    set_type TEXT,
    prescribed_reps INT,
    prescribed_weight DECIMAL(6,2),
    prescribed_rpe DECIMAL(3,1),
    actual_reps INT,
    actual_weight DECIMAL(6,2),
    is_completed BOOLEAN DEFAULT FALSE,
    is_skipped BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id);

CREATE TABLE IF NOT EXISTS user_organizations (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (user_id, organization_id)
);
