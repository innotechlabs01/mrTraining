-- Programs — named collections of workout templates ordered into a multi-week plan
CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    goal TEXT NOT NULL DEFAULT '',
    difficulty_level TEXT NOT NULL DEFAULT '',
    duration_weeks INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_programs_coach ON programs(coach_id);

-- Program Workouts — ordered workout templates that make up a program
CREATE TABLE IF NOT EXISTS program_workouts (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_program_workouts_program ON program_workouts(program_id, order_index);
CREATE INDEX IF NOT EXISTS idx_program_workouts_template ON program_workouts(template_id);