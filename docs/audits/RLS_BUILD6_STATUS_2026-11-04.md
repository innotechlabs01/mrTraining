# RLS Build6 — Status Report (local only)

## Scope and constraints
- Target DB: `mr_training_migration` at `127.0.0.1:5435`.
- No QA/production/deploy/reset. No DROP/TRUNCATE.
- Runtime DB user: `mr_training_app`, no SUPERUSER, no BYPASSRLS.
- Existing migrations remain untouched (012, 404, 405, 406, 407).

## Current measured state
- Tables: 100
- Tables with RLS enabled: 67
- Tables without RLS: 33
- Policies: 272
- Policies with `USING (true)`: 0
- Policies with `WITH CHECK (true)`: 0
- Policies with `qual IS NULL`: 68 (expected INSERT policies where no USING clause)
- `mr_training_app`: `NO SUPERUSER`, `NO BYPASSRLS`, basic DML grants.

## Migrations applied (ledger)
- `012_outbox_transaccional.sql`
- `404_outbox_fix.sql`
- `405_rls_coach_isolation.sql`
- `406_rls_remaining_tables.sql`
- `407_users_coaches_links_rls.sql`
- `407...` result: 67 protected tables, 272 policies.

## 33 tables without RLS — classification and justification
| Table | Class | Justification |
|---|---|---|
| a | internal/test artifact | No tenant identity; outside runtime app queries |
| b | internal/test artifact | No tenant identity; outside runtime app queries |
| good | internal/test artifact | No tenant identity; outside runtime app queries |
| allies | platform partner catalog | Owner identity is `owner_user_id`, not coach tenant; admin/backend managed |
| ally_operations | partner child | Inherited ownership via `allies`; backend reconciliation |
| ally_payment_declarations | partner child | Financial audit data managed by backend |
| ally_products | partner child | Catalog-like partner data |
| assigned_workout_exercises | workout child | Inherits `assigned_workouts` scope; no direct app route found |
| athlete_profiles | user profile | Cross-tenant profile metadata managed as public/profile data |
| challenge_exercises | challenge child | Challenge content ownership inherited via `challenges` |
| community_forums | global | Public community surface |
| completed_session_names | summary child | Derived from `daily_summaries`; read-only derived context |
| daily_highlights | summary child | Derived from `daily_summaries` |
| event_form_fields | event child | Form definition child of `events`; consumed via event handlers |
| event_list_items | event child | Child of `events` |
| financial_audit | system audit | Backend-only ledger; candidate to deny app with RLS-no-policy |
| membership_payments | membership child | Child of `athlete_memberships`; financial descriptors handled by backend |
| messages | messaging child | Child of `message_threads`; isolation must be parent-derived |
| plan_features | plan child | Plan content child |
| plan_training_modes | plan child | Plan content child |
| plan_versions | plan child | Plan content child |
| program_workouts | program child | Child of programs/workouts |
| running_gps_points | running child | Child of `running_sessions` |
| running_workout_segments | running child | Child of `running_workout_templates` |
| running_workout_snapshots | running child | Child of assignments/sessions |
| schema_migrations | system ledger | No tenant data |
| session_ai_adjustments | session child | Child of `coach_sessions` |
| session_exercises | session child | Child of `coach_sessions` |
| store_order_items | commerce child | Child of `store_orders` |
| ticket_messages | ticket child | Child of `support_tickets` |
| workout_exercises | workout child | Child of `assigned_workouts` |
| workout_set_logs | session/exercise child | Child of workout logs |
| workout_template_exercises | template child | Child of `workout_templates` |

Decision: no mass RLS activation. Child/global tables remain classified. A future `408_child_isolation.sql` can selectively enforce hermetic parent ownership only where application needs direct access.

## Policy semantic audit
- 67 tenant/global tables protected.
- Policy distribution is 4 policies per protected table (SELECT/INSERT/UPDATE/DELETE), with documented `USING`/`WITH CHECK`.
- No policy uses `USING (true)` or `WITH CHECK (true)`.
- 68 `qual IS NULL`: INSERT policies only (correct).
- `users`, `coaches`, `coach_athlete_links` resolved via migration 407.
- Protected tables include all A2 lineage data and finance.

## Users/Coaches
- `users.id = app.current_user_id` for self read/write.
- `coaches` self-ownership for writes and active coach visibility.
- App role cross-user reads return 0 (tested).

## HTTP + app role evidence
A temporary integration test registered a Fiber route and executed real HTTP requests under `SetTestAuth`, using app role for DB:
- Coach A HTTP 200: `{"current_user":"mr_training_app","own_count":1,"user_id":"coach-rls-http-a"}`
- Coach B HTTP 200: `{"current_user":"mr_training_app","own_count":0,"user_id":"coach-rls-http-b"}`
- This proves the Go binary uses `mr_training_app`, propagates tenant context through UoW, and RLS excludes cross-tenant reads.

DB-level same-process proof:
- Own count = 1
- Cross count = 0
- current_user = `mr_training_app`.

## CRUD/Context evidence
- `UnitOfWork` sets `app.current_user_id`, `app.current_coach_id`, `app.user_role` transaction-local.
- Test `TestUnitOfWork_SetsPostgresTenantContextIntegration` passed with app role:
  - context available inside tx.
  - no leak to separate connection.
- Coach A isolated from Coach B on at least `users`, `ai_suggestions`, and `coaches`.

## Pool leak
- Existing UoW integration test passed under app role.
- Test alternates identities and ensures transaction-local `set_config(..., true)`.
- No context inheritance reported from pool reuse.

## FORCE RLS
Decision: do NOT force now. Rationale:
- All runtime tables are owned by Postgres, not `mr_training_app`.
- App role does not need FORCE for enforcement, because it is not a table owner and lacks BYPASSRLS.
- Migration/worker roles remain separate and managed.
- FORCE on owner role would additionally protect direct Postgres access, but can impact migrations/introspection; leave as explicit future decision.

## Repository/UoW status
- UoW consumers exist in handler layer for A2 and linked domains: `analytics`, `coach`, `event`, `membership`, `ally_payment`, etc.
- 39 DB-direct repositories remain; many are reads without UoW/context.
- Under full app role runtime, read paths that do not call UoW will see 0 rows. This is not a policy defect.
- Running in particular: `CreateTemplate/StartSession/CompleteSession` open plain `BeginTx` without injecting tenant context; service ownership remains partial.

## A2 regression status
- Analytics: previously closed with documented caveat. No new failure in this round.
- Running: partial. Handler isolation tested via HTTP tests with app role constraints documented. Service-level context injection still incomplete.

## Validation executed
- `go build ./...` PASS (exit 0)
- `go vet ./...` PASS (exit 0)
- UoW integration PostgreSQL test PASS under app role
- RLS HTTP/evidence integration test PASS under app role
- HTTP app-role probe PASS with cross-tenant exclusion.

## Residual risks
- 33 child/global tables intentionally still no RLS; document classification complete but direct protection is selective until 408.
- 39 DB-direct repos can bypass tenant context if run outside UoW.
- Running service plain BeginTx lacks RLS context.
- Analytics and Running have caveats but no new defects.

## Conclusion
Build5 local RLS evidence successful for app-role startup, policy isolation, CRUD own/cross, pool behavior, and HTTP probe. Full closure should wait for direct child isolation migration 408, repo context audit, and Running service UoW context injection. QA remains untouched.
