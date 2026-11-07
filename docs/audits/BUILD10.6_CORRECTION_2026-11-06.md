# BUILD10.6 Correction — RLS athlete correlation tautology (2026-11-06)

Status: **proposal only — NOT applied.** No migration has been executed. No DDL was run against QA/prod. No commit was created.

## Scope

Affected tables (24), all from `apps/api/migrations/postgres/406_rls_remaining_tables.sql`, athlete-owned and athlete-scoped via `coach_athlete_links`.

Root cause: migration 406 used an unqualified `athlete_id` inside

```sql
EXISTS (SELECT 1 FROM coach_athlete_links cal
        WHERE cal.athlete_id = athlete_id
          AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
          AND cal.status = 'active')
```

Because `cal` is the inner range variable, `athlete_id` resolves to `cal.athlete_id`, so `cal.athlete_id = athlete_id` becomes `cal.athlete_id = cal.athlete_id` (always true). Any coach with at least one active link could read/write rows for any athlete. `WITH CHECK` had the same defect, leaking writes.

## Corrective migration

File: `apps/api/migrations/postgres/411_fix_rls_athlete_correlation.sql`

For each affected table, all four policies (`policy_<table>_select/write/update/delete`) are dropped and recreated in a single transaction with the outer row explicitly aliased as `row`:

```sql
EXISTS (
  SELECT 1
  FROM public.coach_athlete_links cal
  CROSS JOIN LATERAL (SELECT <table>.athlete_id AS athlete_id) AS row
  WHERE cal.athlete_id = row.athlete_id
    AND cal.coach_id = NULLIF(current_setting('app.current_coach_id', true)::text, '')
    AND cal.status = 'active'
)
```

Self-access is preserved as `athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')`. Coach access is restricted to the active relation for the specific athlete (`cal.athlete_id = row.athlete_id`, not a tautology).

## Policy map (table-by-table)

All 24 tables have the same owner column and coach branch. Policy names follow `policy_<table>_<select|write|update|delete>`.

| # | Table | Owner column | Coach read/write branch | Policies |
|---|---|---|---|---|
| 1 | athlete_favorites | athlete_id | EXISTS active coach_athlete_links row for row.athlete_id | select, write, update, delete |
| 2 | athlete_health_devices | athlete_id | same | select, write, update, delete |
| 3 | athlete_health_metrics | athlete_id | same | select, write, update, delete |
| 4 | athlete_sleep_logs | athlete_id | same | select, write, update, delete |
| 5 | athlete_weight_history | athlete_id | same | select, write, update, delete |
| 6 | challenge_attempts | athlete_id | same | select, write, update, delete |
| 7 | coach_feed_comments | athlete_id | same | select, write, update, delete |
| 8 | coach_feed_reactions | athlete_id | same | select, write, update, delete |
| 9 | event_athletes | athlete_id | same | select, write, update, delete |
| 10 | event_form_responses | athlete_id | same | select, write, update, delete |
| 11 | event_registrations | athlete_id | same | select, write, update, delete |
| 12 | form_metrics | athlete_id | same | select, write, update, delete |
| 13 | form_recordings | athlete_id | same | select, write, update, delete |
| 14 | gamification_badges | athlete_id | same | select, write, update, delete |
| 15 | gamification_prs | athlete_id | same | select, write, update, delete |
| 16 | gamification_streaks | athlete_id | same | select, write, update, delete |
| 17 | gamification_workout_days | athlete_id | same | select, write, update, delete |
| 18 | leaderboard_entries | athlete_id | same | select, write, update, delete |
| 19 | readiness_checkins | athlete_id | same | select, write, update, delete |
| 20 | session_athletes | athlete_id | same | select, write, update, delete |
| 21 | store_purchases | athlete_id | same | select, write, update, delete |
| 22 | thread_participants | athlete_id | same | select, write, update, delete |
| 23 | video_analytics_sessions | athlete_id | same | select, write, update, delete |
| 24 | workout_session_logs | athlete_id | same | select, write, update, delete |

Total policies affected: 96 (4 per table).

## INSERT/UPDATE/DELETE semantics

Unchanged relative to 406, except correlation is corrected:
- Athlete self access: `athlete_id = NULLIF(current_setting('app.current_user_id', true)::text, '')`.
- Coach access (SELECT/INSERT/UPDATE USING+WITH CHECK/DELETE): only when an active `coach_athlete_links` row links `row.athlete_id` to `NULLIF(current_setting('app.current_coach_id', true)::text, '')`.

## Rollback

File: `apps/api/migrations/postgres/411_fix_rls_athlete_correlation.down.sql` (not recommended). It recreates the original 406 expressions with the tautology `cal.athlete_id = athlete_id`. Retained only for forensics/test rollback.

## Dry-run checks (do not apply without review)

Transactional pattern (run only in a disposable local PostgreSQL):

```sql
BEGIN;
-- apply 411_fix_rls_athlete_correlation.sql
-- seed 2 rows: linked athlete row + unlinked athlete row; one active coach_athlete_links row.
SET ROLE mr_training_app;
SELECT set_config('app.current_user_id', '', true);
SELECT set_config('app.current_coach_id', '<coach with one active link>', true);
-- Expect linked rows visible/writable, unlinked rows invisible and writes denied (42501).
SELECT set_config('app.current_user_id', '<linked athlete id>', true);
SELECT set_config('app.current_coach_id', '', true);
-- Expect the athlete's own row accessible; other athletes' rows denied.
ROLLBACK;
```

Static verification grep (run after generation):

```bash
grep -E 'ALTER TABLE public\.|CREATE POLICY policy_' apps/api/migrations/postgres/411_fix_rls_athlete_correlation.sql \
  | sed -E 's/^(ALTER TABLE public\.|CREATE POLICY policy_)[a-z_]+/\1/' ... # inspect table set only has the 24 affected
grep -vE '^--' ... | grep -oE 'public\.[a-z_]+' | sort -u
```

Expected: exactly the 24 affected tables above; no finance/partner/system tables.

## Boundary

No migration applied. No QA/prod changes. No DDL executed. No commit.
