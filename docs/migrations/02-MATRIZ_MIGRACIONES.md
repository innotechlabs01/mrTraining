# Matriz de Migraciones — Turso/libSQL → PostgreSQL

**Estado:** Fase B1 — Propuesta provisional
**Regla:** No fusionar archivos por número coincidente. Cada migración original conserva trazabilidad individual.

---

## Estrategia de versionado

- Nueva carpeta: `apps/api/migrations/postgres/`
- Numeración canónica independiente: `001_`, `002_`, `003_`, ...
- Tabla tracking: `schema_migrations` (misma que usa el runner Go actual)
- Cada migración PostgreSQL referencia las originales en comentarios

---

## Matriz de equivalencia (propuesta provisional)

| # PG | Archivo PostgreSQL | Equivale a (API) | Equivale a (Web) | Tipo | Notas |
|------|-------------------|------------------|------------------|------|-------|
| 001 | `001_schema_migrations.sql` | — | — | Sistema | Tabla `schema_migrations` tracking |
| 002 | `002_users_coaches_athletes.sql` | — | 004_coach_isolation_schema | Esquema | users, coaches, athlete_profiles, coach_athlete_links, pending_invites |
| 003 | `003_coach_athletes.sql` | — | 002_coaching_schema | Esquema | coach_athletes, athlete_weight_history |
| 004 | `004_coach_sessions.sql` | — | 002_coaching_schema | Esquema | coach_sessions, session_athletes, session_exercises, session_ai_adjustments |
| 005 | `005_messages.sql` | — | 002_coaching_schema | Esquema | message_threads, thread_participants, messages |
| 006 | `006_daily_summaries.sql` | — | 002_coaching_schema | Esquema | daily_summaries, daily_highlights, completed_session_names |
| 007 | `007_support_tickets.sql` | — | 002_coaching_schema | Esquema | support_tickets, ticket_messages |
| 008 | `008_plans.sql` | 014_plans | 002_coaching_schema | Esquema | plans (consolidada), plan_training_modes, plan_features |
| 009 | `009_events.sql` | — | 002_coaching_schema | Esquema | events, event_athletes, event_form_fields, event_list_items |
| 010 | `010_assigned_workouts.sql` | — | 002_coaching_schema | Esquema | assigned_workouts, ai_suggestions, live_sessions |
| 011 | `011_products_sales.sql` | — | 002_coaching_schema | Esquema | products, sales |
| 012 | `012_dashboard_metrics.sql` | — | 002_coaching_schema | Esquema | dashboard_metrics, revenue_history, plan_distribution, recent_activity, payment_methods, public_page_config |
| 013 | `013_time_blocks.sql` | — | 002_coaching_schema | Esquema | time_blocks |
| 014 | `014_athlete_memberships.sql` | 001_memberships | — | Esquema | athlete_memberships, membership_payments |
| 015 | `015_gamification.sql` | 004_gamification | — | Esquema | gamification_streaks, workout_days, badges, prs |
| 016 | `016_workout_templates.sql` | 009_workout_templates | 014_workout_templates | Esquema | workout_templates (consolidada), workout_template_exercises |
| 017 | `017_workout_exercises.sql` | — | 007_workout_templates | Esquema | workout_exercises (web) |
| 018 | `018_assigned_workout_exercises.sql` | — | 024_assigned_workout_exercises | Esquema | assigned_workout_exercises |
| 019 | `019_workout_session_logs.sql` | — | 007_workout_templates | Esquema | workout_session_logs, workout_set_logs |
| 020 | `020_exercise_library.sql` | — | 011_exercise_library | Esquema | exercise_library |
| 021 | `021_health_metrics.sql` | — | 013_health_metrics | Esquema | athlete_sleep_logs, athlete_health_metrics |
| 022 | `022_blog.sql` | — | 006_blog_schema | Esquema | blog_posts |
| 023 | `023_push_tokens.sql` | — | 017_push_tokens | Esquema | push_tokens |
| 024 | `024_community.sql` | — | 018_community_notifications_favorites | Esquema | community_forums, ... |
| 025 | `025_form_metrics.sql` | — | 023_form_metrics | Esquema | form_metrics |
| 026 | `026_video_views.sql` | — | 016_video_view_logs | Esquema | exercise_video_views |
| 027 | `027_landing.sql` | — | landing.ts | Esquema | landing_content, landing_contacts |
| 028 | `028_video_analytics.sql` | 007_video_analytics | — | Esquema | video_analytics_sessions |
| 029 | `029_video_challenges.sql` | 008_video_challenges | — | Esquema | challenges |
| 030 | `030_challenge_exercises.sql` | 010_challenge_exercises | — | Esquema | challenge_exercises |
| 031 | `031_form_recordings.sql` | 011_form_recordings | — | Esquema | form_recordings |
| 032 | `032_programs.sql` | 012_programs | — | Esquema | programs, program_workouts |
| 033 | `033_event_rsvp.sql` | 013_event_rsvp | — | Esquema | event_registrations (extendida) |
| 034 | `034_plans_enhanced.sql` | 014_plans | — | Esquema | Columnas enhancidas de plans (currency, TRM, discount) |
| 035 | `035_support_enhanced.sql` | 015_support_notifications | — | Esquema | updated_at en support_tickets, unread_count |
| 036 | `036_athlete_favorites.sql` | 016_athlete_favorites | — | Esquema | athlete_favorites |
| 037 | `037_store_purchases.sql` | 017_store_purchases | — | Esquema | store_purchases |
| 038 | `038_store_orders.sql` | 018_store_orders | — | Esquema | store_orders, store_order_items |
| 039 | `039_allies.sql` | 019_allies | — | Esquema | allies, ally_locations, ally_members, coach_ally_relationships, ally_invitations |
| 040 | `040_commissions.sql` | 020_commissions | — | Esquema | commission_agreements |
| 041 | `041_financial_audit.sql` | 021_financial_audit | — | Esquema | financial_audit (append-only, triggers) |
| 042 | `042_ally_catalog.sql` | 022_ally_catalog | — | Esquema | ally_products, ally_services |
| 043 | `043_ally_commerce.sql` | 023_ally_commerce | — | Esquema | ally_operations, reservations, qr_tickets |
| 044 | `044_ally_payment_declarations.sql` | 024_ally_payment_declarations | — | Esquema | ally_payment_declarations |
| 045 | `045_commission_entries.sql` | 025_commission_entries | — | Esquema | commission_entries, financial_adjustments |
| 046 | `046_settlements.sql` | 026_settlements | — | Esquema | coach_settlements |
| 047 | `047_running_gps.sql` | 027_running_gps_points | — | Esquema | running_gps_points |
| 048 | `048_wearable_tokens.sql` | 028_wearable_oauth_tokens | — | Esquema | wearable_oauth_tokens |
| 049 | `049_readiness_checkins.sql` | 029_readiness_checkins | — | Esquema | readiness_checkins |
| 050 | `050_workout_exercises_gps_intervals.sql` | 030_workout_exercises_gps_intervals | — | Esquema | Columnas gps_route, intervals en workout_exercises y template_exercises |
| 051 | `051_running_session_devices.sql` | 031_running_session_devices | — | Esquema | running_session_devices |
| 052 | `052_seed_exercise_library.sql` | — | 012_seed_exercise_library | Seed | INSERT ON CONFLICT DO NOTHING |
| 053 | `053_reseed_exercise_library.sql` | — | 025_reseed_exercise_library | Seed | Reseed idempotente |
| 054 | `054_leaderboard.sql` | 005_leaderboard | — | Esquema | leaderboard_entries |
| 055 | `055_coach_feed.sql` | 006_coach_feed | — | Esquema | coach_feed_posts, reactions, comments |

---

## Migraciones incompletas / dependientes de cambios manuales en Turso

| Migración | Problema | Acción en PostgreSQL |
|-----------|----------|---------------------|
| 009_workout_templates (API) | Comenta que el remote dev DB tiene versión sin columna `category` | En PostgreSQL crear con todas las columnas desde cero |
| 015_support_notifications | Remote dev DB ya tiene columnas aplicadas out-of-band | Crear con columnas definitivas desde cero |
| 019_support_tickets_updated_at | FIX para columna faltante en remoto | Incluir `updated_at` desde la migración base |
| 019_exercise_image_url (web) | Idempotency guard manual (SQLite no tiene ADD COLUMN IF NOT EXISTS) | Usar `ADD COLUMN IF NOT EXISTS` en PostgreSQL |
| 020_athlete_profile_schedule (web) | Idempotency guard manual | Usar `ADD COLUMN IF NOT EXISTS` en PostgreSQL |
| 022_exercise_videos (web) | DEPRECADO — nada lo lee | NO migrar (documentar como obsoleta) |

---

## Funciones SQLite → PostgreSQL

| SQLite | PostgreSQL | Aplicar en |
|--------|-----------|------------|
| `datetime('now')` | `NOW()` | Migraciones DEFAULT, repositorios Go, módulos web |
| `?` placeholder | `$1`, `$2`, ... | Repositorios Go, módulos web |
| `INSERT OR IGNORE` | `ON CONFLICT (...) DO NOTHING` | recovery.ts, coach-isolation-db.ts, landing.ts, seeds |
| `INSERT OR REPLACE` | `ON CONFLICT (...) DO UPDATE SET ...` | Seeds web (003, 012, 025) |
| `hex(randomblob(16))` | `gen_random_uuid()` (ext pgcrypto) o UUID en app | workout_repository.go AssignWorkout |
| `INTEGER 0/1` booleano | `BOOLEAN` | Migraciones, código |
| `AUTOINCREMENT` | `GENERATED ALWAYS AS IDENTITY` o `SERIAL` | landing_contacts.id |
| `JSON.parse()` en SQL | Parseo en aplicación (TypeScript/Go) | Módulos web (days_of_week, muscle_groups) |

---

## Bloqueos pendientes

1. **Esquema real de Turso no exportado.** No se puede verificar si columnas mencionadas solo en comentarios existen en remoto.
2. **Duplicación de tablas** (plans, workout_templates, assigned_workouts) entre API y web — requiere decisión de consolidación.
3. **Tabla `exercise_videos` (022 web)** está marcada como DEPRECATED — confirmar antes de descartar.

**Siguiente:** Fase B2 — Adaptar backend Go a PostgreSQL.