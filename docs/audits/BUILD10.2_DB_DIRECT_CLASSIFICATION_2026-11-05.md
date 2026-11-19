# BUILD10.2 — Clasificación DB-direct Repositories

Estado: classificacion estructural base, basada en esquema real. Requiere validacion de handlers/servicios antes de Build10.3.

Total repositorios infraestructura: 47 (routing catalog)

## Dominios

### alert
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_alerts | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### ally
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| allies | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_members | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| coach_ally_relationships | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
### ally_catalog
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| allies | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_members | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_products | NO | partner/global sensitive | ally_id | r=0 w=0 inferido repo | parent or global |
| ally_services | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
### ally_operations
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| allies | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_members | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_operation_items | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_operations | NO | partner/global sensitive | ally_id | r=0 w=0 inferido repo | parent or global |
| ally_redemptions | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| coach_ally_relationships | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
### ally_payment_declaration
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| allies | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_members | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| ally_operations | NO | partner/global sensitive | ally_id | r=0 w=0 inferido repo | parent or global |
| ally_payment_declarations | NO | partner/global sensitive | ally_id | r=0 w=0 inferido repo | parent or global |
### analytics
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_health_metrics | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| coach_athletes | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| workout_session_logs | SI | athlete-owned (or user-owned) | workout_id | r=0 w=0 inferido repo | coach/user |
| workout_set_logs | NO | unclassified-needs-review | session_id, exercise_id | r=0 w=0 inferido repo | parent or global |
### athlete
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
### audit
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| financial_audit_events | NO | system/backend | sin FK | r=0 w=0 inferido repo | parent or global |
### blog
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| blog_post_meta | NO | global/public content | sin FK | r=0 w=0 inferido repo | parent or global |
| blog_posts | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### challenge
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| challenge_attempts | SI | athlete-owned (or user-owned) | challenge_id | r=0 w=0 inferido repo | coach/user |
| challenge_exercises | NO | unclassified-needs-review | challenge_id | r=0 w=0 inferido repo | parent or global |
| challenges | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### checkin
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| readiness_checkins | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### coach
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| assigned_workouts | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| coach_appointments | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| coach_athletes | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| coach_availability | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| coach_time_blocks | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| coaches | SI | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| workout_session_logs | SI | athlete-owned (or user-owned) | workout_id | r=0 w=0 inferido repo | coach/user |
### coach_settlement
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| ally_payment_declarations | NO | partner/global sensitive | ally_id | r=0 w=0 inferido repo | parent or global |
| coach_payment_records | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| coach_settlements | SI | coach-owned | ally_id | r=0 w=0 inferido repo | coach/user |
| commission_entries | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| settlement_documents | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| settlement_items | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### coachfeed
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| coach_feed_comments | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| coach_feed_posts | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| coach_feed_reactions | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### commission
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| coach_ally_relationships | NO | partner/global sensitive | sin FK | r=0 w=0 inferido repo | parent or global |
| commission_agreements | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### commission_entry
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| ally_operations | NO | partner/global sensitive | ally_id | r=0 w=0 inferido repo | parent or global |
| ally_payment_declarations | NO | partner/global sensitive | ally_id | r=0 w=0 inferido repo | parent or global |
| commission_agreements | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| commission_entries | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| financial_adjustments | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### community
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| community_challenges | NO | global/public content | sin FK | r=0 w=0 inferido repo | parent or global |
| community_forums | NO | global/public content | sin FK | r=0 w=0 inferido repo | parent or global |
| community_messages | NO | global/public content | sin FK | r=0 w=0 inferido repo | parent or global |
| community_posts | NO | global/public content | sin FK | r=0 w=0 inferido repo | parent or global |
### config
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| public_page_config | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### dashboard
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| activity_log | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| appointments | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| assigned_workouts | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| athletes | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| events | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| purchases | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### event
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| event_athletes | SI | athlete-owned (or user-owned) | event_id, athlete_id | r=0 w=0 inferido repo | coach/user |
| event_form_fields | NO | unclassified-needs-review | event_id | r=0 w=0 inferido repo | parent or global |
| event_form_responses | SI | athlete-owned (or user-owned) | event_id | r=0 w=0 inferido repo | coach/user |
| event_list_items | NO | unclassified-needs-review | event_id | r=0 w=0 inferido repo | parent or global |
| event_registrations | SI | athlete-owned (or user-owned) | event_id | r=0 w=0 inferido repo | coach/user |
| events | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### exercise
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| exercise_library | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### favorite
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_favorites | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### formmetrics
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| form_metrics | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
### formrecording
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| form_recordings | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### gamification
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| gamification_badges | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| gamification_prs | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| gamification_streaks | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| gamification_workout_days | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### health
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_health_devices | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| athlete_health_metrics | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| athlete_sleep_logs | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
### import
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| import_jobs | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### invite
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| coach_athlete_links | SI | athlete-owned (or user-owned) | coach_id, athlete_id | r=0 w=0 inferido repo | coach/user |
| coaches | SI | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| pending_invites | SI | coach-owned | coach_id | r=0 w=0 inferido repo | coach/user |
### leaderboard
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| leaderboard_entries | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### membership
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_memberships | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| membership_payments | NO | unclassified-needs-review | membership_id | r=0 w=0 inferido repo | parent or global |
| sales | SI | coach-owned | product_id | r=0 w=0 inferido repo | coach/user |
### memory
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
### message
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| message_threads | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| messages | SI | relational to protected parent | thread_id | r=0 w=0 inferido repo | parent or global |
### notification
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| devices | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| notification_preferences | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| notifications | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### onboarding
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_onboarding | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### plan
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| plan_versions | NO | unclassified-needs-review | plan_id | r=0 w=0 inferido repo | parent or global |
| plans | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### product
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| products | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| sales | SI | coach-owned | product_id | r=0 w=0 inferido repo | coach/user |
### routine
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_routines | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### running
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| device_connections | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| outbox | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| running_gps_points | SI | relational to protected parent | session_id | r=0 w=0 inferido repo | parent or global |
| running_session_devices | SI | athlete-owned (or user-owned) | session_id | r=0 w=0 inferido repo | coach/user |
| running_sessions | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
| running_workout_assignments | SI | athlete-owned (or user-owned) | template_id | r=0 w=0 inferido repo | coach/user |
| running_workout_segments | NO | unclassified-needs-review | template_id | r=0 w=0 inferido repo | parent or global |
| running_workout_snapshots | SI | relational to protected parent | assignment_id, session_id | r=0 w=0 inferido repo | parent or global |
| running_workout_templates | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
### store
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| products | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| sales | SI | coach-owned | product_id | r=0 w=0 inferido repo | coach/user |
| store_order_items | NO | unclassified-needs-review | order_id | r=0 w=0 inferido repo | parent or global |
| store_orders | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| store_purchases | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### subscription
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| subscription_payments | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| subscriptions | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### support
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| support_tickets | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| ticket_messages | SI | relational to protected parent | ticket_id | r=0 w=0 inferido repo | parent or global |
### today
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| assigned_workouts | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| athlete_health_metrics | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| athlete_profiles | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| coach_sessions | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |
| workout_exercises | NO | unclassified-needs-review | workout_id | r=0 w=0 inferido repo | parent or global |
### trainingai
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| assigned_workouts | SI | athlete-owned (or user-owned) | athlete_id | r=0 w=0 inferido repo | coach/user |
| workout_exercises | NO | unclassified-needs-review | workout_id | r=0 w=0 inferido repo | parent or global |
| workout_set_logs | NO | unclassified-needs-review | session_id, exercise_id | r=0 w=0 inferido repo | parent or global |
### user
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| athlete_profiles | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| coach_athlete_links | SI | athlete-owned (or user-owned) | coach_id, athlete_id | r=0 w=0 inferido repo | coach/user |
| coaches | SI | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
| users | SI | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### videoanalytics
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| video_analytics_sessions | SI | athlete-owned (or user-owned) | sin FK | r=0 w=0 inferido repo | coach/user |
### videoview
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| video_views | NO | unclassified-needs-review | sin FK | r=0 w=0 inferido repo | parent or global |
### workout
| Tabla | RLS | Clase estructural | FK padres | Lectura/escritura app | Contexto RLS requerido |
|---|---:|---|---|---|---|
| workout_template_exercises | NO | unclassified-needs-review | template_id | r=0 w=0 inferido repo | parent or global |
| workout_templates | SI | coach-owned | sin FK | r=0 w=0 inferido repo | coach/user |

## Tablas referenciadas sin RLS directo
Las tablas marcadas NO RLS en este informe deben tratarse como pendientes de Build10.3 si son consultadas por un repositorio protegido.

Global rule: no considerar una tabla segura solo por estar sin RLS; debe justificarse como global/internal.
