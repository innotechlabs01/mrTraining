# Inventario de Esquema — Migración Turso/libSQL → PostgreSQL

**Estado:** Fase B1 — Inventario provisional (basado en archivos SQL del repositorio)
**Bloqueo:** Esquema real exportado de Turso no disponible. Todas las definiciones son equivalentes aproximados de los `.sql` del repositorio.

---

## 1. Tablas por grupo funcional

### A. Membresías y pagos (Go API — `apps/api/migrations/001_memberships.sql`)

| Tabla | Columnas | Tipos (SQLite) | PK | FK | Índices |
|-------|----------|----------------|----|----|---------|
| `athlete_memberships` | id, athlete_id, coach_id, plan_name, plan_price, billing_period, status, current_period_start, current_period_end, grace_period_days, payment_due_date, created_at, updated_at | TEXT, TEXT, TEXT, TEXT, REAL, TEXT CHECK, TEXT CHECK, TEXT, TEXT, INTEGER, TEXT, TEXT DEFAULT datetime('now'), TEXT DEFAULT datetime('now') | id | coach_id → coaches? (implícito), athlete_id → coach_athletes? (implícito) | idx_athlete_memberships_athlete_id, idx_athlete_memberships_coach_id, idx_athlete_memberships_status |
| `membership_payments` | id, membership_id, amount, currency, status, polar_order_id, period_start, period_end, paid_at, created_at | TEXT, TEXT, REAL, TEXT DEFAULT 'USD', TEXT CHECK, TEXT, TEXT, TEXT, TEXT, TEXT DEFAULT datetime('now') | id | membership_id → athlete_memberships(id) ON DELETE CASCADE | idx_membership_payments_membership_id, idx_membership_payments_polar_order_id |

### B. Gamificación (Go API — `004_gamification.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `gamification_streaks` | id, athlete_id, current_streak, longest_streak, last_workout_date, created_at, updated_at | TEXT, TEXT UNIQUE, INTEGER DEFAULT 0, INTEGER DEFAULT 0, TEXT, TEXT DEFAULT datetime('now'), TEXT DEFAULT datetime('now') | id | — | idx_gamification_streaks_athlete |
| `gamification_workout_days` | id, athlete_id, workout_date, workout_id, created_at | TEXT, TEXT, TEXT, TEXT, TEXT DEFAULT datetime('now') | id | — | idx_gamification_workout_days_athlete, idx_gamification_workout_days_date |
| `gamification_badges` | id, athlete_id, badge_id, unlocked_at | TEXT, TEXT, TEXT, TEXT DEFAULT datetime('now') | id | — | idx_gamification_badges_athlete |
| `gamification_prs` | id, athlete_id, exercise_id, best_value, unit, achieved_at, previous_best | TEXT, TEXT, TEXT, REAL NOT NULL, TEXT NOT NULL, TEXT DEFAULT datetime('now'), REAL | id | — | idx_gamification_prs_athlete, idx_gamification_prs_exercise |

### C. Líderes (Go API — `005_leaderboard.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `leaderboard_entries` | id, athlete_id, score, period, created_at | TEXT, TEXT, REAL, TEXT, TEXT DEFAULT datetime('now') | id | — | (pendiente de ver archivo completo) |

### D. Coach feed (Go API — `006_coach_feed.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `coach_feed_posts` | id, ... | TEXT, ... | id | — | (pendiente de ver archivo completo) |

### E. Video analytics (Go API — `007_video_analytics.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `video_analytics_sessions` | id, ... | TEXT, ... | id | — | (pendiente de ver archivo completo) |

### F. Video challenges (Go API — `008_video_challenges.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `challenges` | id, ... | TEXT, ... | id | — | (pendiente de ver archivo completo) |

### G. Challenge exercises (Go API — `010_challenge_exercises.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `challenge_exercises` | id, ... | TEXT, ... | id | — | (pendiente de ver archivo completo) |

### H. Form recordings (Go API — `011_form_recordings.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `form_recordings` | id, ... | TEXT, ... | id | — | (pendiente de ver archivo completo) |

### I. Programas (Go API — `012_programs.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `programs` | id, coach_id, name, description, goal, difficulty_level, duration_weeks, created_at, updated_at | TEXT, TEXT NOT NULL, TEXT NOT NULL, TEXT DEFAULT '', TEXT DEFAULT '', TEXT DEFAULT '', INTEGER DEFAULT 0, TEXT DEFAULT datetime('now'), TEXT DEFAULT datetime('now') | id | — | idx_programs_coach |
| `program_workouts` | id, program_id, template_id, order_index, created_at | TEXT, TEXT NOT NULL, TEXT NOT NULL, INTEGER DEFAULT 0, TEXT DEFAULT datetime('now') | id | — | idx_program_workouts_program, idx_program_workouts_template |

### J. Event RSVP (Go API — `013_event_rsvp.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `event_registrations` (extendida) | attendee_identity, response_token, ... | ... | ... | ... | (pendiente de ver archivo completo) |

### K. Planes (Go API — `014_plans.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `plans` (enriquecida) | id, coach_id, name, ..., currency, is_active, athlete_count, ..., TRM snapshot | TEXT, TEXT, TEXT, ..., TEXT (COP/USD), INTEGER, INTEGER, ... | id | — | (pendiente de ver archivo completo) |

### L. Soporte/notificaciones (Go API — `015_support_notifications.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `support_tickets` | id, ..., updated_at, ... | ..., TEXT (agregado por 019_support_tickets_updated_at) | id | — | (pendiente) |
| `ticket_messages` | id, ticket_id, ..., created_at | ..., TEXT REFERENCES support_tickets(id) ON DELETE CASCADE | id | ticket_id → support_tickets(id) | (pendiente) |

### M. Atletas favoritos (Go API — `016_athlete_favorites.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `athlete_favorites` | id, ... | TEXT, ... | id | — | (pendiente) |

### N. Store purchases (Go API — `017_store_purchases.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `store_purchases` | id, ... | TEXT, ... | id | — | (pendiente) |

### O. Store orders (Go API — `018_store_orders.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `store_orders` | id, ... | TEXT, ... | id | — | (pendiente) |
| `store_order_items` | id, ... | TEXT, ... | id | — | (pendiente) |

### P. Allies (Go API — `019_allies.sql` a `026_settlements.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `allies` | id, ..., money stored as INTEGER cents | ... | id | — | (pendiente) |
| `ally_locations` | id, ... | ... | id | — | (pendiente) |
| `ally_members` | id, ... | ... | id | — | (pendiente) |
| `coach_ally_relationships` | id, ... | ... | id | — | (pendiente) |
| `ally_invitations` | id, ..., token as SHA-256 hash | ... | id | — | (pendiente) |
| `commission_agreements` | id, ..., rate_bps, fixed_amount_cents | ... | id | — | (pendiente) |
| `financial_audit` | id, ... (append-only, triggers H-05) | ... | id | — | (pendiente) |
| `ally_products` / `ally_services` | id, ..., price_cents | ... | id | ally_id → allies(id) | (pendiente) |
| `ally_operations` / `ally_reservations` / `ally_qr_tickets` | id, ... | ... | id | — | (pendiente) |
| `ally_payment_declarations` | id, ..., supersedes_id | ... | id | — | (pendiente) |
| `commission_entries` | id, ..., base_cents, rate_bps, fixed_amount_cents, amount_cents | ... | id | agreement_id | (pendiente) |
| `coach_settlements` | id, ..., coach_id, ally_id, period, currency | ... | id | coach_id, ally_id | (pendiente) |

### Q. Running GPS (Go API — `027_running_gps_points.sql` a `031_running_session_devices.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `running_gps_points` | id, session_id, lat, lng, alt, timestamp, accuracy, created_at | TEXT, TEXT REFERENCES running_sessions(id) ON DELETE CASCADE, REAL, REAL, REAL, TEXT RFC3339 UTC, REAL, TEXT DEFAULT datetime('now') | id | session_id → running_sessions(id) | idx_running_gps_points_session, idx_running_gps_points_session_timestamp |
| `wearable_oauth_tokens` | id, user_id, ... | TEXT, TEXT NOT NULL, ... | id | — | (pendiente) |
| `readiness_checkins` | id, athlete_id, ... | TEXT, TEXT NOT NULL, ... | id | — | (pendiente) |
| `running_session_devices` | id, session_id, device | ... | id | session_id → running_sessions(id) | (pendiente) |

### R. Workout templates (Go API — `009_workout_templates.sql`)

| Tabla | Columnas | Tipos | PK | FK | Índices |
|-------|----------|-------|----|----|---------|
| `workout_templates` | id, coach_id, name, description, category, difficulty_level, duration_minutes, is_public, created_at, updated_at | TEXT, TEXT NOT NULL, TEXT NOT NULL, TEXT, TEXT, TEXT, INTEGER, BOOLEAN DEFAULT 0, TEXT DEFAULT datetime('now'), TEXT DEFAULT datetime('now') | id | — | idx_workout_templates_coach |
| `workout_template_exercises` | id, template_id, exercise_id, order_index, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, created_at, updated_at | TEXT, TEXT REFERENCES workout_templates(id) ON DELETE CASCADE, TEXT REFERENCES exercises(id) ON DELETE RESTRICT, INTEGER DEFAULT 0, INTEGER DEFAULT 3, INTEGER DEFAULT 8, INTEGER DEFAULT 12, INTEGER DEFAULT 90, REAL, TEXT, TEXT DEFAULT datetime('now'), TEXT DEFAULT datetime('now') | id | template_id → workout_templates(id), exercise_id → exercises(id) | idx_workout_template_exercises_template |

---

### S. Esquema de coaching (Web — `apps/web/migrations/002_coaching_schema.sql`)

| Tabla | Columnas notables |
|-------|-------------------|
| `time_blocks` | id, label, time, end_time, icon, display_order, coach_id, created_at, updated_at |
| `coach_athletes` | id, name, avatar_url, sport, email, phone, service_type, plan_name, plan_price, plan_billing, schedule_days, schedule_time, start_date, emergency_contact, sleep, hrv, recovery, readiness_score, flag_type, flag_severity, flag_message, running_device_brand, running_device_model, running_device_synced, running_device_last_sync, coach_id, created_at, updated_at |
| `athlete_weight_history` | id, athlete_id REFERENCES coach_athletes(id) ON DELETE CASCADE, date, weight, muscle_mass, body_fat |
| `coach_sessions` | id, name, time, end_time, location, status, coach_id, created_at, updated_at |
| `session_athletes` | session_id REFERENCES coach_sessions(id), athlete_id REFERENCES coach_athletes(id), PRIMARY KEY (session_id, athlete_id) |
| `session_exercises` | id, session_id REFERENCES coach_sessions(id), name, sets, reps, rest, weight, notes, sort_order |
| `session_ai_adjustments` | id, session_id REFERENCES coach_sessions(id), type, title, description, reasoning, action_label, applied, dismissed |
| `message_threads` | id, coach_id, created_at, updated_at |
| `thread_participants` | thread_id REFERENCES message_threads(id), athlete_id REFERENCES coach_athletes(id), name, avatar_url, PRIMARY KEY (thread_id, athlete_id) |
| `messages` | id, thread_id REFERENCES message_threads(id), sender_id, sender_name, content, msg_type, timestamp, created_at |
| `daily_summaries` | id, date, ..., coach_id, created_at |
| `daily_highlights` | id, summary_id REFERENCES daily_summaries(id), text, sort_order |
| `completed_session_names` | id, summary_id REFERENCES daily_summaries(id), name |
| `support_tickets` | id, ticket_number, subject, category, priority, status, coach_id, created_at, resolved_at |
| `ticket_messages` | id, ticket_id REFERENCES support_tickets(id), author, body, image_url, created_at |
| `plans` | id, name, description, price, currency, billing_period, max_athletes, max_sessions_per_week, is_active, athlete_count, coach_id, ..., created_at, updated_at |
| `plan_training_modes` | plan_id REFERENCES plans(id), mode, PRIMARY KEY (plan_id, mode) |
| `plan_features` | id, plan_id REFERENCES plans(id), feature, sort_order |
| `events` | id, title, date, time, end_time, type, modality, location, description, status, format, is_public, running_distance_km, running_pace, running_meeting_point, coach_id, created_at, updated_at |
| `event_athletes` | event_id REFERENCES events(id), athlete_id REFERENCES coach_athletes(id), PRIMARY KEY (event_id, athlete_id) |
| `event_form_fields` | id, event_id REFERENCES events(id), label, kind, options, required, sort_order |
| `event_list_items` | id, event_id REFERENCES events(id), item, sort_order |
| `assigned_workouts` | id, athlete_id REFERENCES coach_athletes(id) ON DELETE CASCADE, athlete_name, content_id, content_type, content_name, modality, start_date, end_date, days_of_week, status, progress, coach_id, created_at, updated_at |
| `ai_suggestions` | id, type, title, description, reasoning, action_label, dismissed, applied, coach_id, created_at |
| `live_sessions` | id, title, description, date, start_time, end_time, modality, location, notes, is_public, capacity, enrolled, status, link, distance_km, pace, coach_id, created_at, updated_at |
| `products` | id, name, brand, image_url, price, received, gross, stock, low_stock_threshold, coach_id, created_at, updated_at |
| `sales` | id, product_id REFERENCES products(id), product_name, brand, quantity, unit_price, unit_received, total, date, coach_id, created_at |
| `dashboard_metrics` | id, coach_id UNIQUE, monthly_revenue, revenue_trend, active_athletes, ..., updated_at |
| `revenue_history` | id, coach_id, month, amount |
| `plan_distribution` | id, coach_id, plan_name, athletes, revenue, color |
| `recent_activity` | id, coach_id, icon, text, time, created_at |
| `payment_methods` | id, coach_id, bank, holder, account_type, account_number, clabe, notes, created_at, updated_at |
| `public_page_config` | id, coach_id UNIQUE, brand_name, tagline, welcome_message, footer_text, updated_at |

---

### T. Esquema de aislamiento coach-atleta (Web — `004_coach_isolation_schema.sql`)

| Tabla | Columnas |
|-------|----------|
| `users` | id, email, name, avatar_url, role |
| `coaches` | id, email, name, avatar_url, coach_code (agregado por 005), is_active |
| `athlete_profiles` | id, email, name, avatar_url, sport |
| `coach_athlete_links` | coach_id, athlete_id, is_primary, status |
| `pending_invites` | id, coach_id, email, clerk_invitation_id, expires_at |

---

### U. Otras tablas Web (`006` a `025`)

| Migración | Tabla | Notas |
|-----------|-------|-------|
| `006_blog_schema.sql` | `blog_posts` | Blog público |
| `007_workout_templates.sql` | `workout_exercises` | Ejercicios por assigned workout (frontend web) |
| `008_event_registrations.sql` | `event_registrations` | Registro de atletas a eventos |
| `009_polar_payments.sql` | — | ALTER: agrega columnas polar_* a athlete_memberships |
| `010_training_intelligence.sql` | — | ALTER: columnas enriquecidas en workout_exercises, workout_set_logs |
| `011_exercise_library.sql` | `exercise_library` | Catálogo global de ejercicios |
| `012_seed_exercise_library.sql` | — | Seeds INSERT OR IGNORE |
| `013_health_metrics.sql` | `athlete_sleep_logs`, `athlete_health_metrics` | Métricas de wearables |
| `014_workout_templates.sql` | `workout_templates` (web) | Templates del coach desde builder |
| `015_exercise_video_url.sql` | — | ALTER: video_url en exercise_library |
| `016_video_view_logs.sql` | `exercise_video_views` | Tracking de vistas de video |
| `017_push_tokens.sql` | `push_tokens` | Tokens de push Expo |
| `018_community_notifications_favorites.sql` | `community_forums`, ... | Comunidad |
| `019_exercise_image_url.sql` | — | ALTER: image_url en exercise_library |
| `020_athlete_profile_schedule.sql` | — | ALTER: training_mode, schedule en athlete_profiles |
| `021_exercise_gps_route.sql` | — | ALTER: gps_route en workout_exercises y workout_template_exercises |
| `022_exercise_videos.sql` | `exercise_videos` | DEPRECATED — nada lo lee |
| `023_form_metrics.sql` | `form_metrics` | Métricas de forma ligera |
| `024_assigned_workout_exercises.sql` | `assigned_workout_exercises` | Ejercicios concretos por assigned_workout |
| `025_reseed_exercise_library.sql` | — | Reseed idempotente |

---

### V. Landing (`apps/web/src/lib/landing.ts`)

| Tabla | Columnas |
|-------|----------|
| `landing_content` | id INTEGER PRIMARY KEY, version INTEGER DEFAULT 1, content TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP |

### W. Landing contacts (`apps/web/src/lib/landing-contacts.ts`)

| Tabla | Columnas |
|-------|----------|
| `landing_contacts` | id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP |

---

## 2. Migraciones con números coincidentes pero contenido diferente

| Número | API (`apps/api/migrations/`) | Web (`apps/web/migrations/`) |
|--------|------------------------------|------------------------------|
| 001 | `athlete_memberships`, `membership_payments` | `landing_content` |
| 004 | `gamification_*` | `coach_isolation_schema` (users, coaches, athlete_profiles, coach_athlete_links, pending_invites) |
| 007 | `video_analytics_sessions` | `workout_exercises` |
| 008 | `challenges` | `event_registrations` |
| 009 | `workout_templates` | Polar payments (ALTER athlete_memberships) |
| 012 | `programs`, `program_workouts` | Seed exercise library |
| 014 | `plans` | `workout_templates` (web builder) |
| 015 | support_notifications | exercise_video_url (ALTER) |
| 016 | athlete_favorites | video_view_logs |
| 019 | allies | exercise_image_url (ALTER) |
| 020 | commissions | athlete_profile_schedule (ALTER) |
| 021 | financial_audit | exercise_gps_route (ALTER) |
| 022 | ally_catalog | exercise_videos (DEPRECATED) |
| 023 | ally_commerce | form_metrics |
| 024 | ally_payment_declarations | assigned_workout_exercises |
| 025 | commission_entries | reseed_exercise_library |

**Decisión:** No fusionar por número coincidente. Cada migración original conserva su trazabilidad. El esquema canónico de PostgreSQL se reconstruye desde cero consolidando tablas únicas.

---

## 3. Funciones SQL exclusivas de SQLite/libSQL que requieren adaptación

| Función SQLite | Equivalente PostgreSQL | Archivos afectados |
|----------------|------------------------|-------------------|
| `datetime('now')` | `NOW()` / `CURRENT_TIMESTAMP` | Migraciones (DEFAULT), repositorios Go, módulos web |
| `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` (compatible) | Migraciones web |
| `?` placeholder | `$1`, `$2`, ... | Todos los repositorios Go, módulos web |
| `INSERT OR IGNORE` | `ON CONFLICT (...) DO NOTHING` | recovery.ts, coach-isolation-db.ts, landing.ts, seeds |
| `INSERT OR REPLACE` | `ON CONFLICT (...) DO UPDATE SET ...` | Seeds web |
| `hex(randomblob(16))` | `gen_random_uuid()` (pgcrypto) o UUID en app | workout_repository.go AssignWorkout |
| `INTEGER 0/1` como booleano | `BOOLEAN` | Migraciones, repositorios Go, módulos web |
| `JSON.parse(text)` en SQL | `text::jsonb` o parsing en app | Módulos web (days_of_week, muscle_groups) |
| `PRAGMA table_info` | `information_schema.columns` | Comentarios en migraciones |
| `AUTOINCREMENT` | `SERIAL` / `IDENTITY` o UUID | landing_contacts.id |

---

## 4. Tablas compartidas entre API y web

| Tabla | API migración | Web migración | Notas |
|-------|--------------|---------------|-------|
| `athlete_memberships` | 001 | — (009 polar_payments ALTER) | API dueña |
| `plans` | 014 | 002 | Duplicada — consolidar |
| `coach_athletes` | — | 002 | Web dueña |
| `events` | — | 002 | Web dueña |
| `assigned_workouts` | (via workout_repository) | 002 | Duplicada lógica — consolidar |
| `workout_templates` | 009 | 014 | Duplicada — consolidar |
| `exercise_library` | — | 011 | Web dueña |

**Bloqueo:** Esquema real remoto de Turso no verificado. Algunas columnas pueden existir en remoto y no en los archivos `.sql` locales (menciones de "remote dev DB" en comentarios de migraciones 009, 015, 019, 020).

---

## 5. Reglas de aislamiento multiempresa

- Todas las tablas de coaching tienen `coach_id` NOT NULL con índices en `coach_id`.
- `coach_athlete_links` y `coach_athletes` establecen la relación coach → atleta.
- `users` (tabla web) usa Clerk user IDs (`user_*`).
- `pending_invites` usa `clerk_invitation_id`.
- Autorización: coach solo ve sus propios atletas, entrenamientos, planes, etc.

---

## 6. Tablas que necesitan RLS en Supabase

Tablas con `coach_id` o `athlete_id` que requieren aislamiento por organización/usuario:
- `coach_athletes`, `assigned_workouts`, `plans`, `events`, `workout_templates`, `athlete_memberships`, `support_tickets`, `products`, `sales`, `dashboard_metrics`, `message_threads`, `thread_participants`, `messages`, `push_tokens`, `gamification_*`, `readiness_checkins`, `athlete_health_metrics`, `athlete_sleep_logs`

---

## 7. Riesgos y bloqueos identificados

1. **Bloqueo:** Esquema real de Turso no exportado. No se puede verificar si columnas mencionadas en comentarios (ej. `updated_at` en support_tickets, `category` en workout_templates) existen realmente en remoto.
2. **Bloqueo:** Migraciones con números coincidentes API vs Web crean ambigüedad en versionado canónico.
3. **Riesgo:** `hex(randomblob(16))` en `AssignWorkout` genera ID en SQL; en PostgreSQL requiere `gen_random_uuid()` o generación en aplicación.
4. **Riesgo:** `INSERT OR IGNORE` / `INSERT OR REPLACE` requieren restricciones UNIQUE explícitas para funcionar con `ON CONFLICT`.
5. **Riesgo:** Algunos módulos web (`landing.ts`, `landing-contacts.ts`, `coach-isolation-db.ts`) crean sus propios clientes `@libsql/client` independientes de `getDB()`.
6. **Riesgo:** E2E test usa `sqlite3` CLI directamente — debe adaptarse a PostgreSQL.

---

## 8. Estrategia de versionado de migraciones

- Nueva carpeta: `apps/api/migrations/postgres/` (o similar) para migraciones PostgreSQL canónicas.
- Numeración: `001_`, `002_`, ... independiente de las SQLite originales.
- Tabla de tracking: `schema_migrations` (ya existe en el runner Go).
- Cada migración PostgreSQL incluirá comentario de trazabilidad: `-- Equivale a: 001_memberships.sql (API) + ...`
- Las migraciones SQLite originales se mantienen intactas (no se borran) para referencia.
- Mecanismo para impedir aplicar SQLite en PostgreSQL: el runner de migraciones usará el driver pgx y fallará si intenta ejecutar SQL de SQLite (placeholders `?`, `datetime('now')`, etc. son incompatibles).

---

**Siguiente:** Fase B2 — Adaptar backend Go a PostgreSQL.