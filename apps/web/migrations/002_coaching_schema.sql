-- Coaching schema for TursoDB (libSQL/SQLite compatible)

CREATE TABLE IF NOT EXISTS time_blocks (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'circle',
    display_order INTEGER NOT NULL DEFAULT 0,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coach_athletes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    sport TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    service_type TEXT DEFAULT '',
    plan_name TEXT DEFAULT '',
    plan_price REAL DEFAULT 0,
    plan_billing TEXT DEFAULT 'mensual',
    schedule_days TEXT DEFAULT '',
    schedule_time TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    emergency_contact TEXT DEFAULT '',
    sleep REAL DEFAULT 0,
    hrv REAL DEFAULT 0,
    recovery REAL DEFAULT 0,
    readiness_score REAL DEFAULT 0,
    flag_type TEXT DEFAULT '',
    flag_severity TEXT DEFAULT '',
    flag_message TEXT DEFAULT '',
    running_device_brand TEXT DEFAULT '',
    running_device_model TEXT DEFAULT '',
    running_device_synced INTEGER DEFAULT 0,
    running_device_last_sync TEXT DEFAULT '',
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS athlete_weight_history (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    weight REAL NOT NULL,
    muscle_mass REAL NOT NULL DEFAULT 0,
    body_fat REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coach_sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planned',
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_athletes (
    session_id TEXT NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
    athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS session_exercises (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 1,
    reps INTEGER NOT NULL DEFAULT 1,
    rest INTEGER NOT NULL DEFAULT 0,
    weight REAL,
    notes TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session_ai_adjustments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'adjustment',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    action_label TEXT NOT NULL DEFAULT 'Apply',
    applied INTEGER NOT NULL DEFAULT 0,
    dismissed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS message_threads (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS thread_participants (
    thread_id TEXT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT DEFAULT '',
    PRIMARY KEY (thread_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    msg_type TEXT NOT NULL DEFAULT 'text',
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_summaries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    athlete_count INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    completed_sessions INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    notes_count INTEGER NOT NULL DEFAULT 0,
    ai_recommendation TEXT DEFAULT '',
    tomorrow_athlete_count INTEGER NOT NULL DEFAULT 0,
    tomorrow_session_count INTEGER NOT NULL DEFAULT 0,
    tomorrow_focus TEXT DEFAULT '',
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_highlights (
    id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL REFERENCES daily_summaries(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS completed_session_names (
    id TEXT PRIMARY KEY,
    summary_id TEXT NOT NULL REFERENCES daily_summaries(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    ticket_number INTEGER NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'problem',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author TEXT NOT NULL DEFAULT 'coach',
    body TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_period TEXT NOT NULL DEFAULT 'monthly',
    max_athletes INTEGER NOT NULL DEFAULT 10,
    max_sessions_per_week INTEGER NOT NULL DEFAULT 12,
    is_active INTEGER NOT NULL DEFAULT 1,
    athlete_count INTEGER NOT NULL DEFAULT 0,
    coach_id TEXT NOT NULL,
    discount_type TEXT,
    discount_value REAL,
    discount_label TEXT,
    discount_valid_from TEXT,
    discount_valid_until TEXT,
    discount_code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_training_modes (
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    PRIMARY KEY (plan_id, mode)
);

CREATE TABLE IF NOT EXISTS plan_features (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    modality TEXT NOT NULL DEFAULT 'presencial',
    location TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'scheduled',
    format TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    running_distance_km REAL,
    running_pace TEXT,
    running_meeting_point TEXT,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_athletes (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS event_form_fields (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'text',
    options TEXT DEFAULT '',
    required INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS event_list_items (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assigned_workouts (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL REFERENCES coach_athletes(id) ON DELETE CASCADE,
    athlete_name TEXT NOT NULL DEFAULT '',
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'workout',
    content_name TEXT NOT NULL DEFAULT '',
    modality TEXT NOT NULL DEFAULT 'presencial',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_of_week TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    progress REAL NOT NULL DEFAULT 0,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'message',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    action_label TEXT NOT NULL DEFAULT 'Send',
    dismissed INTEGER NOT NULL DEFAULT 0,
    applied INTEGER NOT NULL DEFAULT 0,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS live_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    modality TEXT NOT NULL DEFAULT 'presencial',
    location TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    is_public INTEGER NOT NULL DEFAULT 0,
    capacity INTEGER NOT NULL DEFAULT 0,
    enrolled INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled',
    link TEXT DEFAULT '',
    distance_km REAL,
    pace TEXT DEFAULT '',
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    received REAL NOT NULL DEFAULT 0,
    gross REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL DEFAULT '',
    brand TEXT DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    unit_received REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL UNIQUE,
    monthly_revenue REAL NOT NULL DEFAULT 0,
    revenue_trend INTEGER NOT NULL DEFAULT 0,
    active_athletes INTEGER NOT NULL DEFAULT 0,
    athlete_trend INTEGER NOT NULL DEFAULT 0,
    new_athletes_this_month INTEGER NOT NULL DEFAULT 0,
    new_athlete_trend INTEGER NOT NULL DEFAULT 0,
    pending_payments REAL NOT NULL DEFAULT 0,
    pending_payment_count INTEGER NOT NULL DEFAULT 0,
    overdue_payment_count INTEGER NOT NULL DEFAULT 0,
    today_sessions INTEGER NOT NULL DEFAULT 0,
    today_sessions_completed INTEGER NOT NULL DEFAULT 0,
    upcoming_events INTEGER NOT NULL DEFAULT 0,
    revenue_goal REAL NOT NULL DEFAULT 0,
    new_athletes_goal INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS revenue_history (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    month TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plan_distribution (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    athletes INTEGER NOT NULL DEFAULT 0,
    revenue REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS recent_activity (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'user',
    text TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    bank TEXT NOT NULL DEFAULT '',
    holder TEXT NOT NULL DEFAULT '',
    account_type TEXT NOT NULL DEFAULT 'checking',
    account_number TEXT NOT NULL DEFAULT '',
    clabe TEXT NOT NULL DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS public_page_config (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL UNIQUE,
    brand_name TEXT NOT NULL DEFAULT '',
    tagline TEXT DEFAULT '',
    welcome_message TEXT DEFAULT '',
    footer_text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_coach ON time_blocks(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_coach ON coach_athletes(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach ON coach_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_coach ON message_threads(coach_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_coach ON daily_summaries(coach_id);
CREATE INDEX IF NOT EXISTS idx_tickets_coach ON support_tickets(coach_id);
CREATE INDEX IF NOT EXISTS idx_plans_coach ON plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_events_coach ON events(coach_id);
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_coach ON assigned_workouts(coach_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_coach ON ai_suggestions(coach_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_coach ON live_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_products_coach ON products(coach_id);
CREATE INDEX IF NOT EXISTS idx_sales_coach ON sales(coach_id);
