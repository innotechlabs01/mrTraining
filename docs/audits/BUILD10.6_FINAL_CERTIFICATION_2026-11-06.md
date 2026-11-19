# BUILD10.6 Final Certification — RLS athlete correlation (2026-11-06)

Status: **PASS for all 24 corrected tables**.

Scope: empirical certification of the 24 athlete-scoped tables corrected by migration `411_fix_rls_athlete_correlation.sql`, exercised through role `mr_training_app` with transactional `set_config(..., true)`. No migration or policy was changed by this certification. Parent seed rows and all fixture rows were cleaned up by ID after the run (verified empty).

## Test setup

- Database: local PostgreSQL `mr_training_migration` (port 5435).
- App role: `mr_training_app` (RLS enforced).
- Seed (as `postgres`, parents only):
  - `athlete_profiles` + `coach_athletes` for two test athletes
  - `coach_athlete_links` active: coach A -> athlete A; coach B -> athlete B
  - parent rows for `challenges`, `events`, `coach_sessions`, `message_threads`, `assigned_workouts` owned by coach A
- Coaches used (pre-existing):
  - Coach A: `coach-blk-9b66c120`
  - Coach B: `coach-blk-5cc5cfc8`
- Test athletes:
  - A: `rls-cert-ath-a` (linked to coach A)
  - B: `rls-cert-ath-b` (linked to coach B)

## Per-table matrix

Result codes: `OK` = operation succeeded as RLS allows; `DENIED` = policy rejected (`SQLSTATE 42501`); counts are visible rows. `context_absent` is `SELECT count(*) ... WHERE athlete_id=<A>` with both settings empty.

| # | Table | Insert own (coach A / athlete A) | Coach A sees A row | Coach B sees A row | Context absent | Foreign insert (coach A / athlete B) | UPDATE athlete_id A->B |
|---|-------|----------------------------------|--------------------|--------------------|-----------------|--------------------------------------|------------------------|
| 1 | athlete_favorites | OK | 1 | 0 | 0 | DENIED | DENIED |
| 2 | athlete_health_devices | OK | 1 | 0 | 0 | DENIED | DENIED |
| 3 | athlete_health_metrics | OK | 1 | 0 | 0 | DENIED | DENIED |
| 4 | athlete_sleep_logs | OK | 1 | 0 | 0 | DENIED | DENIED |
| 5 | athlete_weight_history | OK | 1 | 0 | 0 | DENIED | DENIED |
| 6 | challenge_attempts | OK | 1 | 0 | 0 | DENIED | DENIED |
| 7 | coach_feed_comments | OK | 1 | 0 | 0 | DENIED | DENIED |
| 8 | coach_feed_reactions | OK | 1 | 0 | 0 | DENIED | DENIED |
| 9 | event_athletes | OK | 1 | 0 | 0 | DENIED | DENIED |
| 10 | event_form_responses | OK | 1 | 0 | 0 | DENIED | DENIED |
| 11 | event_registrations | OK | 1 | 0 | 0 | DENIED | DENIED |
| 12 | form_metrics | OK | 1 | 0 | 0 | DENIED | DENIED |
| 13 | form_recordings | OK | 1 | 0 | 0 | DENIED | DENIED |
| 14 | gamification_badges | OK | 1 | 0 | 0 | DENIED | DENIED |
| 15 | gamification_prs | OK | 1 | 0 | 0 | DENIED | DENIED |
| 16 | gamification_streaks | OK | 1 | 0 | 0 | DENIED | DENIED |
| 17 | gamification_workout_days | OK | 1 | 0 | 0 | DENIED | DENIED |
| 18 | leaderboard_entries | OK | 1 | 0 | 0 | DENIED | DENIED |
| 19 | readiness_checkins | OK | 1 | 0 | 0 | DENIED | DENIED |
| 20 | session_athletes | OK | 1 | 0 | 0 | DENIED | DENIED |
| 21 | store_purchases | OK | 1 | 0 | 0 | DENIED | DENIED |
| 22 | thread_participants | OK | 1 | 0 | 0 | DENIED | DENIED |
| 23 | video_analytics_sessions | OK | 1 | 0 | 0 | DENIED | DENIED |
| 24 | workout_session_logs | OK | 1 | 0 | 0 | DENIED | DENIED |

Summary: 24/24 PASS; 0 not applicable; 0 failures.

## Static policy verification

For all 24 tables, `policy_<table>_select` (and write/update/delete) contains:

- `CROSS JOIN LATERAL (SELECT <table>.athlete_id AS athlete_id) AS row`
- `cal.athlete_id = "row".athlete_id`

No policy on the affected set contains the tautological form `cal.athlete_id = athlete_id` (count = 0 across `pg_policies`).

N/A rationale: none required. All tested dimensions were applicable to each table's column structure (composite-PK tables `event_athletes`, `session_athletes`, `thread_participants` were handled via their natural `(parent_id, athlete_id)` keys).

## Constraints honored

- No QA/prod access or writes.
- No migration application and no policy DDL executed.
- No `DROP`/`TRUNCATE`/reset; only deletes of newly inserted fixture rows by ID (and their explicitly seeded parents), all of which were verified absent at cleanup.
- Failures recorded explicitly if present; none in final run.
EOF
echo written