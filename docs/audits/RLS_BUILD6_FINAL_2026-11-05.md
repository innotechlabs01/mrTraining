## 2. Matrix of 100 tables (RLS vs intentional no-RLS)

### a) Protected tables
See prior section: 67 protected; 272 policies; no TRUE USING/CHECK.

### b) 33 unprotected tables with classification and justification

| Table | Class | Owner | Tenant-sensitive? | Isolation strategy | 408 needed? |
|---|---|---|---|---|---|
| a | test artifact | none | no | internal/test only | no |
| b | test artifact | none | no | internal/test only | no |
| good | test artifact | none | no | internal/test only | no |
| schema_migrations | system | system | no | ledger only | no |
| community_forums | global content | system | no | public forum metadata | no |
| athlete_profiles | user profile | user | low | app-level profile handling | not first wave |
| allies | partner catalog | owner_user_id | partial | backend/platform partner management | no direct RLS today |
| ally_operations | partner child | ally_id | partial | parent partner ownership | relational, later |
| ally_payment_declarations | partner child | ally_id | financial | backend audit + parent ownership | relational, later |
| ally_products | partner child | ally_id | partial | partner catalog | relational, later |
| assigned_workout_exercises | workout child | assigned_workouts.parent | no direct tenant | inherited through parent | may add later |
| challenge_exercises | challenge child | challenge_id | no direct tenant | challenge ownership | may add later |
| completed_session_names | summary child | summary_id | no direct tenant | derived from summary | may add later |
| daily_highlights | summary child | summary_id | no direct tenant | derived from summary | may add later |
| event_form_fields | event child | event_id | no direct tenant | event ownership | may add later |
| event_list_items | event child | event_id | no direct tenant | event ownership | may add later |
| financial_audit | system audit | actor_id | yes (audit data) | backend-only ledger; app should not need broad read | candidate for RLS deny-writes later |
| membership_payments | membership child | membership_id | financial | backend processing | may add later |
| messages | messaging child | thread_id | yes | message thread isolation | high-value; deferred |
| plan_features | plan child | plan_id | low | plan content service | no |
| plan_training_modes | plan child | plan_id | low | plan content service | no |
| plan_versions | plan child | plan_id | low | plan content service | no |
| program_workouts | program child | program_id/template_id | low | service-level ownership | may add later |
| running_gps_points | running child | session_id | yes | session ownership | high-value; deferred |
| running_workout_segments | running child | template_id | low | template ownership | may add later |
| running_workout_snapshots | running child | assignment_id/session_id | yes | session/assignment ownership | high-value; deferred |
| session_ai_adjustments | session child | session_id | yes | session ownership | high-value; deferred |
| session_exercises | session child | session_id | yes | session ownership | high-value; deferred |
| store_order_items | commerce child | order_id | yes | store order ownership | may add later |
| ticket_messages | ticket child | ticket_id | yes (support ticket content) | support ticket ownership | high-value; deferred |
| workout_exercises | workout child | workout_id | low | workout ownership | may add later |
| workout_set_logs | session/exercise child | session_id/exercise_id | yes | session/exercise ownership | high-value; deferred |
| workout_template_exercises | template child | template_id | low | template ownership | may add later |

Conclusion: no child table needs indiscriminate RLS. High-value child isolation candidates remain explicitly documented and were deferred to avoid breakage without UoW propagation. This remains a residual risk, not a hidden one.
## 3. Repo audit summary

There are 48 repository files under `internal/infrastructure`. UoW appears at handler level for several closed A2 domains (analytics, coach, event, membership, transactions related to commission entries), but `NewUnitOfWork` usage is not recorded in the repository interfaces themselves: they rely on callers passing `uow.Tx()`.

Direct `*sql.DB` can still be used in standalone repositories, meaning protected operations are isolated only when handlers wrap execution in `withTx`. This is a residual architecture gap requiring a fuller repository-level executor audit and conventions before QA.

## 4. Running status

Running remains partially closed:
- CreateTemplate, CreateAssignment, StartSession, CompleteSession start plain `BeginTx`.
- Those transactions do not call `set_config(app.current_... , true)`.
- Under app role, the writes may initially fail or operate without RLS context unless isolated.

No new Running ownership regression was opened, but runtime isolation is not fully closed. Therefore Running must be treated as `PARTIAL / NOT READY`.

## 5. Validation executed this round

- `go build ./...` exit 0
- `go vet ./...` exit 0
- PostgreSQL integration with app role:
  - `TestUnitOfWork_SetsPostgresTenantContextIntegration` PASS
  - `TestRLSEvidenceAppRole` PASS (`own=1`, `cross=0`)
  - `TestRLSEvidenceHttp` PASS (`current_user=mr_training_app` both requests; role proven in HTTP surface)
- No operations executed against QA or production.

## 6. FORCE RLS decision

No FORCE RLS activated globally.
Reason:
- `mr_training_app` is not table owner and has no BYPASSRLS.
- It already enforces RLS through ownership separation.
- FORCE remains optional and should be revisited for direct Postgres operational roles.

## 7. Final readiness decision

Decision: **NOT READY FOR QA**

Rationale:
1. Running service transactions lack tenant context initialization before writes.
2. High-value child tables remain unprotected by their own policies (documented candidates, not surprise).
3. Repo executor audit still needs standardization enforcement for app-role runtime.
4. 39 DB-direct contexts remain a residual concern (in practice 48 repo domains).

No production/QA state was changed.

## UPDATE (Build7 local extension)

Additional changes performed:
- Running transactional writes now set `app.current_user_id`, `app.current_coach_id`, and `app.user_role` on the active transaction for CreateTemplate, UpdateTemplate, CreateAssignment, StartSession, and CompleteSession.
- Build/vet still pass.
- Running integration tests still pass.

Residual gaps:
- High-value child tables remain intentionally deferred.
- Repository executor standardization is not complete.
- QA gate remains blocked.

Adjusted decision remains: NOT READY FOR QA.

### Build8 patch (additional real fix)
- Fixed infrastructure return type so `WithExecutor` binds transactions correctly (`domain.Repository` instead of `*Repository`).
- Verified CreateTemplate now works with app role and ownership context.
- Radius of change kept to Running only.

This improves Running from "partially broken transaction wiring" to "context-bound writes feasible under app role".
