# BUILD9 — Child RLS, final report

## Scope
Local PostgreSQL `mr_training_migration` only. No QA/production changes, no commit, no push.

## Migration applied
- `409_child_sensible_rls.sql` applied.
- Registered in `schema_migrations`: `409_child_sensible_rls.sql` (1).
- Backup: `backups/mr_training_migration_pre409.dump`.

## RLS state after apply
- messages: 1, 4
- ticket_messages: 1, 4
- running_gps_points: 1, 4
- running_workout_snapshots: 1, 2
- session_exercises: 1, 4
- session_ai_adjustments: 1, 4

## Ownership and verified isolation
- messages → message_threads.coach_id.
- ticket_messages → support_tickets.coach_id.
- running_gps_points → running_sessions.user_id.
- running_workout_snapshots → assignment coach OR session user (read); AND on insert.
- session_exercises / session_ai_adjustments → coach_sessions.coach_id.

## Tests executed as mr_training_app
1. Own/coach-parent reads.
2. Cross-tenant reads.
3. INSERT cross parent.
4. UPDATE to move FK to foreign parent.
5. DELETE cross-tenant.
6. Context absence.
7. Mixed snapshot write requiring both valid owners.

Results:
- Messages own=1 cross=0; cross insert 42501; FK move 42501.
- Ticket own=1 cross=0; same.
- GPS own=1 cross=0; cross session update 42501.
- Snapshot own inserts pass for same owner pair; cross/mixed insert fails.
- Coach session child read own=1, cross=0; cross insert/write denied.
- No test executed as postgres except cleanup.

## Remaining gaps
- Coach-only access to support messages if the domain later supports athlete participation.
- Standardization of DB-direct repository executor conventions remains open.
- Running service still has UoW context gaps in read scenarios.
- Marketplace checkout/split/webhooks are not certified.
- Not READY for QA.

## Decision
Build9-C applied and Build9 child RLS MVP certified for the six scoped tables.
Final QA gate remains blocked until DB-direct executor audit, Running, and payment economic flow are verified.
