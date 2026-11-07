# BUILD10.2B — Handler / Service validation for DB-direct repositories

Generated in local only. Inspect-only; no code, migrations, or DB changes.

Scope: `apps/api/internal/infrastructure/*` repository ownership, coach_id/user_id flow, active coach-athlete relation validation, UoW/RLS/context behavior. Static evidence only unless noted.

## 1. Method and evidence status

Evidence sources:

- `docs/audits/BUILD10_DB_DIRECT_INVENTORY_2026-11-05.md` (47 domain rows)
- constructor inventory (`func New...Repository`)
- usage inventory in `cmd/api/main.go`
- middleware: `internal/middleware/tenant.go`, `internal/middleware/auth.go`
- UoW implementation: `internal/infrastructure/database/uow.go`
- representative repository SQL and service/handler files

Evidence is static. Passing `go build` or unit tests is not included here. Claims about RLS enforcement are limited to code paths; actual PostgreSQL policy behavior needs integration tests.

## 2. Inventory reconciliation (47 domains)

All 47 rows from `BUILD10_DB_DIRECT_INVENTORY_2026-11-05.md` are covered below. In addition, `internal/infrastructure/training/*` contains 5 sub-repositories not represented as inventory domains and is covered in section 4.

Inventory-status reconciliation:

- `r.exec` values in the inventory are mostly counts of calls to a repository-owned `exec` field. Where `r.exec > 0`, the repository can often accept a UoW transaction executor through `SetExecutor`/`WithExecutor`, but that only matters if a handler/service calls it.
- `r.exec = 0` means the repository uses its `db` pool directly (or no SQL exec uses). Those paths do not participate in request-scoped UoW.
- Every repository constructor takes `*sql.DB`, so every repository defaults to pool execution.
- `cache/*`, `database/*`, `nats/*`, `firebase/*`, `expo/*`, `websocket/*` are infrastructure support, not domain repositories.

Repository capability groups:

| Capability | Repositories |
|---|---|
| Handler invokes per-request UoW (`withTx`) | analytics, coach, coach_settlement, commission_entry, event, membership |
| Repo supports `WithExecutor` but handlers/services do not invoke per-request UoW | ally, coachfeed, commission, config, dashboard (unused), exercise, invite, message, plan, running, store, support, subscription, training/program, training/workout |
| Repo has `exec` field and `SetExecutor` only, no `WithExecutor` | plan, subscription |
| Repo uses pool only (`r.db`); no exec field | alert, ally_catalog, ally_operations, ally_payment_declaration, audit, blog, challenge, checkin, community, favorite, formmetrics, formrecording, gamification, health, import, leaderboard, memory (unused), notification, onboarding, product, routine, today, training/exercise, training/progress, training/session, trainingai, user, videoanalytics, videoview, workout |
| Facade over other repos, no own tables | athlete |
| Internal self-managed SQL transactions | ally (CreateAllyWithRelationship), ally_payment_declaration, coach, coach_settlement, commission_entry, formmetrics, plan, running service, program/workout repositories, store, workout, commission |
| Unwired/no service/handler in `main.go` | config, dashboard, memory |

Risk distribution used below: Critical = cross-tenant/financial/auth-root gap; High = coach/athlete scoped writes without request UoW or missing ownership checks; Medium = scoped reads/writes with filters but no RLS/context or mixed transactions; Low = global/public/read-only/system or UoW-integrated low-risk path.

## 3. Common owner identity, relation, and context patterns

Common owner identity:

- `middleware.RequireAuth` validates Clerk JWT and sets `user_id`, `user_role` (default athlete).
- `middleware.GetUserID(c)` is the authenticated user ID.
- Coach self: `middleware.GetCoachID` equals authenticated user ID after `TenantResolver.GetActiveCoachID`.
- Athlete path: coach comes from `X-Coach-ID`, validated against `coach_athlete_links` status `active`.
- Services then receive `userID` or `coachID` explicitly as method parameters; repository SQL filters by these values.

Active coach-athlete relation validation:

- Request boundary: `RequireTenantContext` validates active relationship when athlete sends `X-Coach-ID`.
- Additional explicit calls to `tenantResolver.AthleteHasActiveCoach` occur in handlers analytics, membership, plan, and running.
- Some repositories enforce relation through SQL joins (`challenge`, `event` for athletes).
- Most repositories do NOT perform a per-resource coach ownership check beyond filtering by a caller-supplied ID. Integration tests are required to confirm no cross-coach access.

Context / RLS / UoW:

- `UnitOfWork.Begin(userID, coachID, role)` acquires a dedicated connection/transaction and sets `app.current_user_id`, `app.current_coach_id`, `app.user_role`.
- Repositories with `exec` run inside that transaction when a service calls `SetExecutor`/`WithExecutor`.
- Only six handler groups wrap mutating/query use in `withTx`. Other paths use pools or self-managed `sql.Tx`; those do not set app context through UoW. Running service sets RLS context manually in some internal transactions.
- DB policy enforcement itself is not verifiable from these static paths; only SQL filter ownership is visible.

## 4. Per-repository sections

### alert
- Path: `internal/infrastructure/alert/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository` (pool only)
- Handlers invoking: `AlertHandler` (`userhttp.NewAlertHandler`)
- Services invoking: `alertapp.Service`
- Representative methods: `ListAlerts`
- Tables: `athlete_alerts`
- Owner identity flow: handler/service passes athlete/user ID; repository filters `WHERE athlete_id = $1`; no coach context validation in repo.
- Relation validation: middleware boundary only; no active-relation or resource ownership query in repository.
- Context/RLS/UoW status: no `exec` field; no `SetExecutor`/`WithExecutor`; no UoW integration.
- Risk: Low
- Gaps: no tenant RLS context; multi-row safety not applicable; service/handler not transactional; static filter only.

### ally
- Path: `internal/infrastructure/ally/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `AllyHandler` (`userhttp.NewAllyHandler`)
- Services invoking: `allyapp.Service`, `allyPurchaseService` (indirect), `audit` use
- Representative methods: `CreateAllyWithRelationship`, `ListByCoach`, `ListByAllyUser`, `GetByIDForCoach`, `FindActiveRelationship`
- Tables: `allies`, `ally_members`, `coach_ally_relationships`
- Owner identity flow: coach/ally IDs supplied by caller; repository filters by coach and ally depending on method.
- Relation validation: `FindActiveRelationship` can establish relation; create flow is internally transactional.
- Context/RLS/UoW status: supports `SetExecutor`/`WithExecutor`; repo has its own `BeginTx` transactions; no wired handler `withTx` in main.
- Risk: High
- Gaps: UoW-capable executor is unused by service/handler; no RLS app context in embedded transactions; commission/ally ownership is business-critical and needs integration tests.

### ally_catalog
- Path: `internal/infrastructure/ally_catalog/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `AllyCatalogHandler`, `AllyCatalogAthleteHandler`
- Services invoking: `allycatalogapp.Service`, `allyPurchaseService`
- Representative methods: `ResolveAllyID`, `ListProducts`, `GetProduct`, `CreateProduct`, `UpdateProduct`, `ListServices`, `GetService`
- Tables: `allies`, `ally_members`, `ally_products`, `ally_services`
- Owner identity flow: coach-scoped product/service reads/writes; repository frequently resolves ally ID from coach/relationship.
- Relation validation: relies on resolver flow; no repository-level active coach-athlete relation for athlete catalog path beyond provided coach ID.
- Context/RLS/UoW status: pool only; no `exec` field or executor hooks.
- Risk: High
- Gaps: no UoW/RLS context; mutating product catalogs run autocommit; ally/coach ownership needs integration tests.

### ally_operations
- Path: `internal/infrastructure/ally_operations/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `AllyOperationsHandler`
- Services invoking: `allyopsapp.Service`, `allyPurchaseService`
- Representative methods: `ResolveAllyID`, `ResolveRelationship`, `CreateOperation`, `GetOperation`, `ListOperationsByAthlete`, `ListOperationsByCoach`, `ListOperationsByAlly`
- Tables: `ally_operations`, `ally_operation_items`, `ally_redemptions`, `coach_ally_relationships`
- Owner identity flow: caller-supplied coach/ally/athlete IDs; SQL filters by those IDs.
- Relation validation: `ResolveRelationship` can validate linkage; not clear whether every mutation calls it.
- Context/RLS/UoW status: pool only; no exec field/executor.
- Risk: High
- Gaps: no transactional RLS context despite multi-table operation writes; IDOR across coach/ally IDs possible without integration evidence.

### ally_payment_declaration
- Path: `internal/infrastructure/ally_payment_declaration/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `AllyPaymentDeclarationHandler`
- Services invoking: `allypaymentdeclarationapp.Service`
- Representative methods: `CreatePaymentDeclaration`, `GetPaymentDeclaration`, `ResolveAllyID`, `ListPaymentDeclarationsByAlly`, `ReviewPaymentDeclaration`, `ReversePaymentDeclaration`
- Tables: `ally_payment_declarations`, `ally_operations`
- Owner identity flow: coach/ally/operation IDs supplied by request caller and used as filters.
- Relation validation: no middleware-level active coach-athlete relation integration shown in repository; depends on handler/service.
- Context/RLS/UoW status: pool repository, but repository internally starts `BeginTx` for some writes; no app context variables set in those transactions.
- Risk: Critical
- Gaps: financial declarations; self-managed transactions lack app context; handler `withTx` exists (as commission entry handler) but repository cannot receive UoW; needs ownership and state-transition tests.

### analytics
- Path: `internal/infrastructure/analytics/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `AnalyticsHandler` (`userhttp.NewAnalyticsHandler(..., db.DB, tenantResolver)`)
- Services invoking: `analyticsapp.Service`
- Representative methods: `GetDashboardSummary`, `GetHRZones`, `GetFatigueMap`, `GetOneRM`, `GetTrainingSummary`
- Tables: `workout_session_logs`, `workout_set_logs`, `workout_exercises`, `athlete_health_metrics`
- Owner identity flow: handler passes `requesterID`, `athleteID`, `coachID`; explicit `AthleteHasActiveCoach` checks in handler for some athlete reads; dashboard may aggregate.
- Relation validation: explicit relation checks in handler; revenue/training metrics otherwise coach-filtered.
- Context/RLS/UoW status: supports `WithExecutor`; handler has `withTx` and uses db; some reads bypass withTx.
- Risk: Medium
- Gaps: not all analytics reads use withTx; service does not apply executor for all methods; UoW commit timing for mixed sets needs integration test.

### athlete
- Path: `internal/infrastructure/athlete/repository.go`
- Constructor: `NewRepository(db *sql.DB) domain.Repository`
- Handlers invoking: `AthleteHandler` (`handlers.NewAthleteHandler`)
- Services invoking: `athleteapp.Service`
- Representative methods: `GetByID` (not implemented), `GetWorkouts`, `GetMetrics`, `GetMessages`
- Tables: none owned; delegates to training/workout and message repositories
- Owner identity flow: caller passes athlete/user ID to facade, which calls sub-repos using that ID.
- Relation validation: no relation check in repository; delegating paths retain sub-repo filters.
- Context/RLS/UoW status: facade creates its own workout/message repos; no exec field; inherits no UoW.
- Risk: Low
- Gaps: no ownership/resource checks at facade; dependency composition created per repository; UoW from caller is not propagated to underlying repos.

### audit
- Path: `internal/infrastructure/audit/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: none directly; `auditRepo` passed to `AllyHandler`
- Services invoking: ally handler/service integration (service no separate audit app)
- Representative methods: `ListRecent`
- Tables: `financial_audit_events`
- Owner identity flow: uses supplied coach/allies IDs depending on query.
- Relation validation: not applicable; read-only audit listing.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Medium
- Gaps: audit read must not become cross-tenant leak; no request UoW; immutable-write expectations and ordering need tests.

### blog
- Path: `internal/infrastructure/blog/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `BlogHandler` and public blog handler
- Services invoking: `blogapp.Service`
- Representative methods: `ListArticles`, `ListByCoach`, `GetArticle`, `Create`, `Update`, `Delete`
- Tables: `blog_posts`, `blog_post_meta`
- Owner identity flow: coach ID supplied for coach-scoped listing and author assignment.
- Relation validation: no active coach-athlete relation (public content); ownership by coach ID.
- Context/RLS/UoW status: pool only; some writes run autocommit.
- Risk: Medium
- Gaps: public published-article bypass and coach ownership update/delete need tests.

### challenge
- Path: `internal/infrastructure/challenge/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `ChallengeHandler` (`userhttp.NewChallengeHandler(..., hub)`)
- Services invoking: `challengeapp.Service`
- Representative methods: `Create`, `Update`, `GetByID`, `ListByCoach`, `ListActiveForAthlete`, `GetActiveForAthlete`
- Tables: `challenges`, `challenge_exercises`, `challenge_attempts`, `coach_athlete_links`
- Owner identity flow: coach or athlete ID passed by caller; repository joins `coach_athlete_links` for athlete visibility.
- Relation validation: SQL join enforces linked coach for athlete-facing reads; create/update filtering depends on caller ID.
- Context/RLS/UoW status: pool only; no exec field. Internal create/update can issue multiple SQL statements without request tx.
- Risk: High
- Gaps: no per-request RLS context; no explicit ownership check on update/delete by coach ID; relation evidence needs tests.

### checkin
- Path: `internal/infrastructure/checkin/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `CheckinHandler`
- Services invoking: `checkinapp.Service`
- Representative methods: `Upsert`, `GetByDate`, `ListRecent`
- Tables: `readiness_checkins`
- Owner identity flow: athlete ID supplied by caller.
- Relation validation: no active coach relation required for self check-in.
- Context/RLS/UoW status: pool only; no exec field/UoW.
- Risk: Low
- Gaps: athlete self-write integrity only; no cross-coach concern.

### coach
- Path: `internal/infrastructure/coach/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `CoachHandler` (`handlers.NewCoachHandler(coachService, db.DB)`), `AthleteSchedulingHandler` reuse, withTx-capable
- Services invoking: `coachapp.Service`, `trm`/landing use
- Representative methods: `GetDashboard`, `GetDailySummary`, `GetTimeBlocks`, `SaveTimeBlocks`, `GetAppointments`, `CreateAppointment`, `GetAthleteById`, `SaveAthlete`
- Tables: `coaches`, `coach_athletes`, `coach_availability`, `coach_time_blocks`, `coach_appointments`, `appointments`, `assigned_workouts`
- Owner identity flow: middleware coach ID (coach self or validated athlete coach context); handler calls many methods with `middleware.GetUserID`.
- Relation validation: athlete-coach relation only when middleware uses `X-Coach-ID`; handler's explicit methods (e.g. athlete CRUD) may require additional checks.
- Context/RLS/UoW status: supports `WithExecutor`; handler `withTx` wraps 30 method calls and sets UoW context; some scheduler/landing paths may not use UoW.
- Risk: Medium
- Gaps: inconsistent `userID` vs `coachID` passed to service methods (visible in handler snippets); coach-scoped CRUD ownership needs integration tests.

### coach_settlement
- Path: `internal/infrastructure/coach_settlement/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `CoachSettlementHandler`, document and payment handlers
- Services invoking: `coachsetapp.Service`
- Representative methods: `GetSettlement`, `ListSettlementsByCoach`, `ListSettlementsByAlly`, `CreateSettlement`, `CreateCoachPaymentRecord`
- Tables: `coach_settlements`, `settlement_items`, `settlement_documents`, `coach_payment_records`, `commission_entries`
- Owner identity flow: coach/ally IDs caller-supplied.
- Relation validation: no active relation enforcement in repository; service/handler controls role.
- Context/RLS/UoW status: supports `WithExecutor`; handler wraps mutations with `withTx`; internally starts own transactions for multi-write settlement creation.
- Risk: High
- Gaps: financial settlement; self-managed tx and request UoW overlap; coach/admin authorization boundaries need tests.

### coachfeed
- Path: `internal/infrastructure/coachfeed/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `CoachFeedHandler`
- Services invoking: `coachfeedapp.Service`
- Representative methods: `ListPosts`, `GetPost`, `CreatePost`, `DeletePost`, `AddReaction`
- Tables: `coach_feed_posts`, `coach_feed_comments`, `coach_feed_reactions`
- Owner identity flow: coach/athlete IDs supplied by caller.
- Relation validation: community-style content; no active coach-athlete relation in repository.
- Context/RLS/UoW status: supports `WithExecutor` but no handler withTx in main; pool default.
- Risk: Medium
- Gaps: no request UoW despite capable repo; feed writes can leave reaction/comment inconsistency if multi-statement; access filters need tests.

### commission
- Path: `internal/infrastructure/commission/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: via `CommissionPolicyHandler` through `commissionService`
- Services invoking: `commissionapp.Service`, `allyPurchaseService`
- Representative methods: `CreateAgreementVersion`, `ListByRelationship`, `GetOpenAgreement`
- Tables: `commission_agreements`, `coach_ally_relationships`
- Owner identity flow: coach/ally relationship ID supplied by caller and used as filter.
- Relation validation: relationship existence implied by lookup; no active-relation policy query.
- Context/RLS/UoW status: supports `WithExecutor`; internally uses BeginTx for agreement version creation; no handler withTx.
- Risk: High
- Gaps: commission terms mutate financial behavior; RLS context absent; versioning/concurrency needs tests.

### commission_entry
- Path: `internal/infrastructure/commission_entry/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `CommissionEntryHandler` (`userhttp.NewCommissionEntryHandler(..., db.DB)`)
- Services invoking: `commissionentryapp.Service`, `allyPurchaseService`, `earningsService`, `commissionPolicyHandler`
- Representative methods: `CreateCommissionEntry`, `createCommissionEntryTx`, `GetCommissionEntry`, `ListCommissionEntriesByCoach`, `ListCommissionEntriesByAlly`
- Tables: `commission_entries`, `ally_operations`, `ally_operation_items`, `ally_payment_declarations`, `commission_agreements`
- Owner identity flow: coach ID from JWT; service receives coach ID and operation IDs.
- Relation validation: no explicit active coach-athlete validation for operation participants; filtering by coach ID.
- Context/RLS/UoW status: supports `WithExecutor`; handler wraps operations in withTx; repository also has internal transactions.
- Risk: Critical
- Gaps: financial ledger; idempotency/retry and duplicate commission prevention need integration tests; UoW + internal tx semantics need DB tests.

### community
- Path: `internal/infrastructure/community/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `CommunityHandler`
- Services invoking: `communityapp.Service`
- Representative methods: `ListPosts`, `CreatePost`, `ListForums`, `ListChallenges`, `ListMessages`, `CreateMessage`
- Tables: `community_posts`, `community_forums`, `community_challenges`, `community_messages`
- Owner identity flow: coach/athlete IDs supplied for coach-targeted channels.
- Relation validation: implicit scoped channels by ID; not active-link validated in repository.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Medium
- Gaps: community access control should be integration tested; no request tx.

### config
- Path: `internal/infrastructure/config/repository.go`
- Constructor: `NewRepository(db *sql.DB) config.Repository`
- Handlers invoking: none wired in `main.go`
- Services invoking: none found
- Representative methods: `GetByCoachID`, `Upsert`
- Tables: `public_page_config`
- Owner identity flow: coach ID would be caller-supplied if used.
- Relation validation: not applicable for public config.
- Context/RLS/UoW status: supports `SetExecutor`/`WithExecutor` but unused; currently dead code.
- Risk: Low
- Gaps: unwired repository; if enabled later, needs UoW/ownership review before use.

### dashboard
- Path: `internal/infrastructure/dashboard/repository.go`
- Constructor: `NewRepository(db *sql.DB) domain.Repository`
- Handlers invoking: none wired
- Services invoking: none found
- Representative methods: `GetSummary`
- Tables: `activity_log`, `appointments`, `assigned_workouts`, `athletes`, `events`, `purchases`
- Owner identity flow: coach ID expected as caller parameter.
- Relation validation: aggregate scoped methods likely filter by coach.
- Context/RLS/UoW status: supports `WithExecutor` but unused; aggregate repo directly executes pool SQL.
- Risk: Medium
- Gaps: unwired repository; aggregate dashboard can leak cross-coach if coach filter omitted; needs ownership tests before enabling.

### event
- Path: `internal/infrastructure/event/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `EventHandler` (`userhttp.NewEventHandler(..., hub, db.DB)`)
- Services invoking: `eventapp.Service`
- Representative methods: `ListByCoach`, `GetByID`, `Create`, `Update`, `Delete`, `ListEventsForAthlete`
- Tables: `events`, `event_athletes`, `event_registrations`, `event_form_fields`, `event_form_responses`
- Owner identity flow: coach ID from JWT for coach scoped; athlete reads join `coach_athlete_links` for linked coaches.
- Relation validation: athlete-facing repository SQL joins `coach_athlete_links`; coach write filtering by coach ID.
- Context/RLS/UoW status: supports `WithExecutor`; handler `withTx` wraps mutating calls; `ListEvents` read often uses service without UoW.
- Risk: High
- Gaps: event writes may include form/registration tables and must be atomic; public shared-link endpoints can bypass auth boundary; needs integration tests.

### exercise (top-level)
- Path: `internal/infrastructure/exercise/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: none direct; used by training domain? Actually service imports may use it.
- Services invoking: `?` (no exerciseapp service in main; likely used directly by `trainingapp`)
- Representative methods: `GetByID`, `GetBySlug`, `ListGlobal`, `Create`, `Update`, `Delete`
- Tables: `exercise_library` / exercise table
- Owner identity flow: global vs coach-owned via method filters.
- Relation validation: not active athlete relation.
- Context/RLS/UoW status: supports `WithExecutor`; pool default; no handler withTx found.
- Risk: Medium
- Gaps: global/coach mutation boundary (is public exercise writable by coach?) needs policy clarity and tests.

### favorite
- Path: `internal/infrastructure/favorite/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `FavoriteHandler`
- Services invoking: `favoriteapp.Service`
- Representative methods: `ListFavorites`, `GetFavorite`, `CreateFavorite`, `DeleteFavorite`
- Tables: `athlete_favorites`
- Owner identity flow: caller-supplied athlete/user ID and exercise/product object ID.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Low
- Gaps: favorite mutation concurrency boundary; ensure owner ID from auth not client input.

### formmetrics
- Path: `internal/infrastructure/formmetrics/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `FormMetricsHandler`, coach aggregate endpoint
- Services invoking: `formmetricsapp.Service`
- Representative methods: `InsertBatch`, `GetByAthlete`, `GetByAthleteAndExercise`, `GetByCoach`
- Tables: `form_metrics`, `coach_athletes`
- Owner identity flow: athlete and coach IDs supplied by caller; SQL filters by those.
- Relation validation: coach-facing reads join coach_athletes; no active-link middleware.
- Context/RLS/UoW status: pool only; internally uses BeginTx for batch inserts, no app context.
- Risk: Medium
- Gaps: form metric batch and coach aggregate ID filters need ownership tests.

### formrecording
- Path: `internal/infrastructure/formrecording/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `FormRecordingHandler`
- Services invoking: `formrecordingapp.Service`
- Representative methods: `Insert`
- Tables: `form_recordings`
- Owner identity flow: athlete/coach/media IDs supplied by caller.
- Relation validation: none in repository.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Medium
- Gaps: no ownership relation check for submitted athlete form recording.

### gamification
- Path: `internal/infrastructure/gamification/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `GamificationHandler`; service used by MembershipHandler
- Services invoking: `gamificationapp.Service`
- Representative methods: `GetStreak`, `UpsertStreak`, `LogWorkoutDay`, `ListBadges`, `ListAllStreaks`, `ListPRs`
- Tables: `gamification_streaks`, `gamification_workout_days`, `gamification_badges`, `gamification_prs`
- Owner identity flow: athlete ID from caller; background jobs call `ListAllStreaks` without tenant context.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field; updates are individual autocommits.
- Risk: Medium
- Gaps: cross-athlete access if `athleteID` comes from request; background job privacy/output; transactional consistency for badge/streak updates.

### health
- Path: `internal/infrastructure/health/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `HealthDataHandler`
- Services invoking: `healthapp.Service`
- Representative methods: `GetMetrics`, `RecordMetric`, `GetSleepLogs`, `GetDevices`, `RegisterDevice`, `RemoveDevice`
- Tables: `athlete_health_metrics`, `athlete_sleep_logs`, `athlete_health_devices`
- Owner identity flow: athlete ID from caller.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Medium
- Gaps: highly sensitive health data; ownership from auth boundary critical; device registration uniqueness needs tests.

### import
- Path: `internal/infrastructure/import/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `ImportHandler`, import activity
- Services invoking: `importapp.Service`, `importactivityapp.Service`
- Representative methods: `CreateImportJob`, `GetImportJob`, `ListImportJobs`, `UpdateImportJob`
- Tables: `import_jobs`
- Owner identity flow: caller user/athlete ID; records job state.
- Relation validation: no active coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Low
- Gaps: job ID guessing/enumeration must be tested; no RLS.

### invite
- Path: `internal/infrastructure/invite/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `InviteHandler`, public invite validation
- Services invoking: `inviteapp.Service`, `allyPurchaseService`, ally/subscription flows
- Representative methods: `GetByCode`, `AcceptInvite`, `GetCoachIDByAthleteID`, `ValidateCode`, `CreatePendingInvite`
- Tables: `pending_invites`, `coaches`, `coach_athlete_links`
- Owner identity flow: code-driven; establishes or resolves coach link.
- Relation validation: `AcceptInvite` creates active `coach_athlete_links`; code validation is public.
- Context/RLS/UoW status: supports `SetExecutor`/`WithExecutor`; internally creates links in transaction? Some ops.
- Risk: High
- Gaps: invite token security, expiry, reuse, and public endpoint abuse require tests; link activation under concurrent requests.

### leaderboard
- Path: `internal/infrastructure/leaderboard/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `LeaderboardHandler`
- Services invoking: `leaderboardapp.Service`
- Representative methods: `GetGroupLeaderboard`, `GetWeeklyLeaderboard`, `GetUserHistory`, `UpsertLeaderboardEntry`
- Tables: `leaderboard_entries`
- Owner identity flow: athlete/user ID for personal history; groups scoped by provided ID.
- Relation validation: no coach relation in repository.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Low
- Gaps: group privacy and cache staleness; integration tests.

### membership
- Path: `internal/infrastructure/membership/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `MembershipHandler` (`userhttp.NewMembershipHandler(..., db.DB, tenantResolver)`)
- Services invoking: `membershipapp.Service`, `gamification`, `payment`
- Representative methods: `GetByAthleteID`, `GetByID`, `Create`, `Update`, `Cancel`, `ListByCoach`
- Tables: `athlete_memberships`, `membership_payments`, `sales`
- Owner identity flow: handler receives coach ID, athlete ID, request body; explicitly calls `AthleteHasActiveCoach` before creating membership.
- Relation validation: explicit active relation checks at handler.
- Context/RLS/UoW status: supports `WithExecutor`; handler `withTx` wraps important mutations; internal SQL may run autocommit outside UoW.
- Risk: High
- Gaps: membership/payments/sales integrity across tables; ownership and price tampering tests; RLS context requires integration verification.

### memory
- Path: `internal/infrastructure/memory/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: none wired
- Services invoking: none found
- Representative methods: `Create`, `GetByID`, `GetByEmail`, `Update`, `Delete`, `List`
- Tables: unknown/possibly memory tables
- Owner identity flow: would caller-supplied user ID.
- Relation validation: not applicable.
- Context/RLS/UoW status: pool only; unused.
- Risk: Low
- Gaps: unwired; schema/table uncertainty requires src review before use.

### message
- Path: `internal/infrastructure/message/repository.go`
- Constructor: `NewRepository(db *sql.DB) domain.Repository`
- Handlers invoking: `MessageHandler` (`messagehandlers.NewMessageHandler(messageService)`)
- Services invoking: `messageapp.Service`, athlete facade
- Representative methods: `GetThreads`, `GetThread`, `CreateThread`, `GetMessages`, `SendMessage`
- Tables: `message_threads`, `messages`
- Owner identity flow: athlete/coach IDs from caller; no coach relationship validation at repo.
- Relation validation: thread access relies on ID in query; needs tests.
- Context/RLS/UoW status: supports `WithExecutor`; tracker uses `isTx` but no handler wired withTx in main.
- Risk: High
- Gaps: private messages can leak if thread ID enumeration; no transactional send/read state consistency; no UoW.

### notification
- Path: `internal/infrastructure/notification/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `NotificationHandler`
- Services invoking: `notificationapp.Service`
- Representative methods: `RegisterDevice`, `GetDeviceByToken`, `ListDevicesByUser`, `SaveNotification`, `ListNotificationsByUser`
- Tables: `devices`, `notification_preferences`, `notifications`
- Owner identity flow: user/device token linked to user ID.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Medium
- Gaps: push token/device ownership and notification history exposure need tests.

### onboarding
- Path: `internal/infrastructure/onboarding/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `OnboardingHandler`
- Services invoking: `onboardingapp.Service`
- Representative methods: `Save`, `Get`
- Tables: `athlete_onboarding`
- Owner identity flow: athlete ID caller-supplied.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Low
- Gaps: idempotency of onboarding save and status assertions.

### plan
- Path: `internal/infrastructure/plan/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `PlanHandler`, `CoachLandingHandler`
- Services invoking: `planapp.Service`, `subscriptionapp.Service` (planRepo), `allyPurchaseService` (catalog relation)
- Representative methods: `ListByCoach`, `ListAllActive`, `GetByID`, `Create`, `Update`, `Delete`
- Tables: `plans`, `plan_versions`
- Owner identity flow: coach ID supplied; athlete read resolves coach via invite/links in handler.
- Relation validation: `PlanHandler` resolves coach for athlete via `coach_athlete_links`.
- Context/RLS/UoW status: has `exec` field and `SetExecutor`, but no `WithExecutor`; repository starts own tx for versions. Service does not expose request executor.
- Risk: High
- Gaps: plan versioning and ownership across coach/public boundary; public plan endpoint and cache; needs DB tests.

### product
- Path: `internal/infrastructure/product/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `ProductHandler`
- Services invoking: `productapp.Service`, `earningsService`
- Representative methods: `ListByCoach`, `GetByID`, `Create`, `Update`, `Delete`, `UpdateStock`, `ListSalesByCoach`, `CreateSale`
- Tables: `products`, `sales`, `stock`
- Owner identity flow: coach ID supplied for catalog; sales tied to athlete/purchase context.
- Relation validation: no active coach-athlete relation; sales by athlete ID.
- Context/RLS/UoW status: pool only; no exec field; update/delete operate directly.
- Risk: High
- Gaps: store catalog ownership and stock mutation under concurrency; revenue integrity; IDOR tests required.

### routine
- Path: `internal/infrastructure/routine/repository.go`
- Constructor: `NewRepository(db *sql.DB) domain.Repository`
- Handlers invoking: `RoutineHandler`
- Services invoking: `routineapp.Service`
- Representative methods: `ListByAthleteID`, `GetByID`, `Create`, `Update`, `Delete`
- Tables: `athlete_routines`
- Owner identity flow: athlete ID supplied by client/handler.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Medium
- Gaps: routine ownership by athlete; update/delete filters need tests.

### running
- Path: `internal/infrastructure/running/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `RunningHandler`, `RunningWorkoutHandler`, `ImportActivityHandler`, `GarminWebhookHandler`
- Services invoking: `runningapp.Service`, `importactivityapp.Service`
- Representative methods: `SaveSession`, `GetSession`, `ListSessionsByUser`, `UpdateSession`, `SaveSnapshot`, `AssignWorkout`, `RegisterProvider`
- Tables: `running_sessions`, `running_gps_points`, `running_session_devices`, `running_workout_templates`, `running_workout_assignments`, `running_workout_segments`
- Owner identity flow: athlete ID from JWT for athlete endpoints; coach ID for templates/assignments; handlers explicitly validate `AthleteHasActiveCoach` for some flows.
- Relation validation: explicit relation checks in handler for athlete assignment; coach-owned templates filter by coach.
- Context/RLS/UoW status: supports `WithExecutor`; service manages own SQL transactions and sets app context manually for several RLS-sensitive writes. Public webhook runs outside JWT.
- Risk: High
- Gaps: complex multi-table writes and GPS bulk operations; Garmin webhook auth boundary; manual RLS set_config consistency needs DB integration tests.

### store
- Path: `internal/infrastructure/store/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `StoreHandler`, `PaymentHandler` cart/order flows
- Services invoking: `storeapp.Service`, `paymentapp.Service`
- Representative methods: `ListProducts`, `GetProduct`, `CreatePurchase`, `ListPurchasesByAthlete`, `ListPurchases`
- Tables: `products`, `store_orders`, `store_order_items`, `store_purchases`, `sales`
- Owner identity flow: coach for product/inventory, athlete for cart purchase.
- Relation validation: no active relation in repository.
- Context/RLS/UoW status: supports `WithExecutor`; internally uses BeginTx for purchase/order consistency; no handler withTx.
- Risk: Critical
- Gaps: commerce integrity (stock decrement, order items, payment status) must be atomic and cross-tenant safe; requires integration tests.

### subscription
- Path: `internal/infrastructure/subscription/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `SubscriptionHandler` (+ public webhook)
- Services invoking: `subscriptionapp.Service`, `mercadopago` adapter
- Representative methods: `Save`, `FindByID`, `FindByAthlete`, `FindByCoach`, `RecordPayment`
- Tables: `subscriptions`, `subscription_payments`
- Owner identity flow: athlete/coach/plan IDs; caller-supplied coach filter.
- Relation validation: no active relation.
- Context/RLS/UoW status: has `exec` field and `SetExecutor`, no `WithExecutor`; starts transactions internally.
- Risk: High
- Gaps: payment status update and webhook boundary; recurring billing isolation; needs DB tests.

### support
- Path: `internal/infrastructure/support/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `SupportHandler`
- Services invoking: `supportapp.Service`
- Representative methods: `ListByCoach`, `ListByAthlete`, `GetByID`, `Create`, `Update`
- Tables: `support_tickets`, `ticket_messages`
- Owner identity flow: coach and athlete scoping supplied by caller.
- Relation validation: no active relation in repository.
- Context/RLS/UoW status: supports `WithExecutor`; pool default; no handler withTx.
- Risk: Medium
- Gaps: ticket ownership and message visibility need tests; multi-message write consistency.

### today
- Path: `internal/infrastructure/today/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `TodayHandler`
- Services invoking: `todayapp.Service`
- Representative methods: `GetTodayData` (complex aggregate)
- Tables: `assigned_workouts`, `workout_exercises`, `coach_sessions`, `session_athletes`, `athlete_profiles`, `athlete_health_metrics`
- Owner identity flow: athlete/coach ID supplied by caller.
- Relation validation: none in repository.
- Context/RLS/UoW status: pool only; no exec field, but query only.
- Risk: Medium
- Gaps: large aggregate query correctness and privacy under coach filter; add ownership tests.

### training (application sub-repositories)
- Paths:
  - `internal/infrastructure/training/exercise_repository.go`
  - `internal/infrastructure/training/program_repository.go`
  - `internal/infrastructure/training/progress_repository.go`
  - `internal/infrastructure/training/session_repository.go`
  - `internal/infrastructure/training/workout_repository.go`
- Constructor names: `NewExerciseRepository`, `NewProgramRepository`, `NewProgressRepository`, `NewSessionRepository`, `NewWorkoutRepository`
- Handlers invoking: `TrainingHandler`, `RunningWorkoutHandler` (for sessions sometimes), user training flows
- Services invoking: `trainingapp.Service`, athlete facade, running workout service
- Representative methods:
  - exercise: `List`, `GetByID`, `Create`, `Update`, `Delete`
  - program: `ListByCoach`, `GetByID`, `Create`, `Update`, `Delete`
  - progress: `GetProgress`, `GetProgressSummary`, `countCompletionStreak`
  - session: `Create`, `ListByAthlete`
  - workout: `ListTemplates`, `GetTemplate`, `CreateTemplate`, `UpdateTemplate`, `AssignWorkout`
- Tables: `exercises`, `programs`, `assigned_workouts`, `workout_templates`, `workout_template_exercises`, `workout_session_logs` (varies by repo)
- Owner identity flow: coach/athlete ID supplied by caller; program/workout scoped by coach.
- Relation validation: no active relation for coach mutations; athlete-facing IDs expected to come from auth boundary.
- Context/RLS/UoW status:
  - program and workout support `WithExecutor` and start internal transactions in some methods.
  - exercise, progress, session pool only/no exec field.
  - training service itself has no SetExecutor and main composes plain repos.
- Risk: Medium
- Gaps: assign workout and progress streak updates are multi-statement; no request-level UoW; ownership and idempotency need tests. Note: `ProgramRepository` appears not wired in `main.go`; verify before treating it as live.

### trainingai
- Path: `internal/infrastructure/trainingai/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `TrainingAIHandler`
- Services invoking: `trainingaiapp.Service`
- Representative methods: `GetWorkoutAthlete`, `GetWorkoutExercises`, `GetExerciseHistory`, `GetExerciseLoadByDay`
- Tables: `assigned_workouts`, `workout_exercises`, `workout_session_logs`, `workout_set_logs`
- Owner identity flow: workout and athlete IDs supplied by caller.
- Relation validation: none in repository.
- Context/RLS/UoW status: pool only; no exec field; read-only analysis.
- Risk: Low
- Gaps: coaching-data confidentiality and coach filter if endpoint exposes insights; needs auth integration test.

### user
- Path: `internal/infrastructure/user/repository.go` plus tenant_resolver/provision/clerk client
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `UserHandler`, `ClerkWebhookHandler`, `InviteHandler` indirect
- Services invoking: `userdomain.Service`; `tenantResolver` depends on this repository
- Representative methods: `GetByID`, `GetByEmail`, `Create`, `Update`, `GetCoach`, `GetAthleteProfile`, `IsActiveCoach`, `AthleteHasActiveCoach`
- Tables: `users`, `coaches`, `athlete_profiles`, `coach_athlete_links`
- Owner identity flow: central identity source; `users.id` equals Clerk subject; coach self uses users.id; athlete uses X-Coach-ID validated by this repository.
- Relation validation: this repository is the canonical active-relation validator for middleware.
- Context/RLS/UoW status: pool only (no exec field); auth/root path and provision run outside UoW.
- Risk: Critical
- Gaps: identity provisioning and tenant resolver correctness are security root; all cross-tenant safety depends on this repository and middleware; integration tests with active/inactive links are mandatory.

### videoanalytics
- Path: `internal/infrastructure/videoanalytics/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `VideoAnalyticsHandler`
- Services invoking: `vaapp.Service`
- Representative methods: `CreateSession`, `GetSession`, `ListSessionsByAthlete`, `ListSessionsByExercise`, `GetSummary`, `GetPerExercise`
- Tables: `video_analytics_sessions`
- Owner identity flow: athlete/exercise/athlete ID supplied by caller.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Medium
- Gaps: bulk analytics read and write ownership; sensitive data isolation tests.

### videoview
- Path: `internal/infrastructure/videoview/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: `VideoViewHandler`
- Services invoking: `videoviewapp.Service`
- Representative methods: `RecordVideoView`, `ListVideoViews`
- Tables: `video_views`
- Owner identity flow: user/video IDs supplied by caller.
- Relation validation: no coach relation.
- Context/RLS/UoW status: pool only; no exec field.
- Risk: Low
- Gaps: view tracking privacy and event flood; idempotency tests.

### workout (top-level/nutrition-less)
- Path: `internal/infrastructure/workout/repository.go`
- Constructor: `NewRepository(db *sql.DB) *Repository`
- Handlers invoking: no standalone workout handler named in main (uses training flows)
- Services invoking: likely training flows and other domains (gamification reads logs)
- Representative methods: `GetByID`, `ListByCoach`, `Create`, `Update`, `Delete`, `getExercises`, `insertExercise`
- Tables: `workouts`, `workout_template_exercises`
- Owner identity flow: coach ID filters writes/listing; athlete assignment via training.
- Relation validation: no active athlete relation here.
- Context/RLS/UoW status: pool only at type level, but internally creates SQL transactions for multi-table updates.
- Risk: Medium
- Gaps: internal transactions lack app context; cross-coach write filters should be tested.

## 5. Summary gaps for BUILD10.3

1. `user` / tenant resolver is the security root; any bug makes all coach-scoped repositories cross-tenant. Integration tests for active/inactive coach and active/inactive athlete links are mandatory.
2. Only six handler groups use `withTx`; most UoW-capable repositories remain on pool or self-managed transactions. BUILD10.3 should decide whether to add request UoW broadly or explicitly document direct-pool filters.
3. Repositories with `exec` but no wired `WithExecutor` (`ally`, `coachfeed`, `commission`, `invite`, `message`, `running`, `store`, `support`, `dashboard`, etc.) are currently no better than pool-only for RLS. Static evidence does not prove their SQL policies receive tenant context.
4. Ownership is mostly filter-by-caller-ID, not per-resource row ownership checks. IDOR tests are needed for update/delete endpoints using only client-supplied resource IDs.
5. Self-managed transactions (`BeginTx` inside repositories/services) do not set `app.current_*` context unless code manually calls set_config (only running service partially does). RLS correctness during those transactions is unresolved.
6. Financial domains (`ally_payment_declaration`, `commission_entry`, `coach_settlement`, `store`, `subscription`) require atomic multi-table integrity tests and idempotent webhook tests.
7. Coach/athlete relation validation beyond request middleware is only explicit in `analytics`, `membership`, some `plan`, and `running` handlers; other domains rely on SQL filtering or joins.
8. Several repositories (`config`, `dashboard`, `memory`) appear unwired and may be dead code; their ownership model and UoW readiness are unvalidated.
9. `ProgramRepository` (`training/program_repository.go`) appears unwired in `main.go`; static audit cannot distinguish dead code from planned integration.
10. Many reads that do not use `withTx` (including analytics, event, membership member listing) run on the pool without app context even though corresponding services support executors.
11. Evidence needed integration tests beyond static greps: cross-coach read/write denial, active-link revocation during request, direct pool behavior under RLS policies, transaction commit/rollback fanout, and public endpoint access.

## 6. Conclusion

Static inspection shows the codebase has a well-structured request tenant middleware and a UoW mechanism, but enforcement is uneven. UoW usage is concentrated in six domains. All other repositories default to pool execution or internal transactions without consistently setting tenant context. The safest next step for BUILD10.3 is to convert the audit into integration tests for the highest-risk financial and identity paths before expanding UoW coverage.