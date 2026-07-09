# MR Training — Database Design

**Version 1.0 — 2026**

---

## Table of Contents

1. [Database Philosophy](#1-database-philosophy)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Core Tables](#3-core-tables)
4. [Indexing Strategy](#4-indexing-strategy)
5. [Partitioning](#5-partitioning)
6. [Migration Strategy](#6-migration-strategy)
7. [Backup & Recovery](#7-backup--recovery)
8. [Performance Optimization](#8-performance-optimization)

---

## 1. Database Philosophy

### 1.1 Why PostgreSQL

MR Training operates on relational data at its core — athletes belong to coaches, workouts belong to programs, payments belong to subscriptions, and every entity traces back to an organization. The relationships between these entities are not incidental; they are the product. PostgreSQL is chosen because it excels at exactly this: enforcing referential integrity through foreign keys, expressing complex queries through Common Table Expressions and window functions, guaranteeing consistency through ACID transactions, and scaling vertically to handle millions of rows before requiring horizontal partitioning. No other open-source relational database matches PostgreSQL's combination of reliability, feature depth, and operational maturity. Its extension ecosystem — PostGIS for location-based features, pgvector for AI embeddings, pg_cron for scheduled maintenance, and pg_partman for partition management — covers every foreseeable requirement without introducing a second database technology into the stack.

A document database like MongoDB would force denormalization of relationships that are fundamentally relational. A graph database like Neo4j would excel at certain traversal queries but struggle with the aggregation, reporting, and transactional workloads that dominate the platform. PostgreSQL handles all of these workloads competently, and when a specialized data store becomes necessary — Redis for caching and session state, Elasticsearch for full-text search at scale, S3-compatible object storage for media — it is added as a complementary service, not a replacement for the primary data store.

### 1.2 Normalization Strategy

The database follows third normal form as the default, with deliberate, documented denormalization where it serves a clear purpose. The rule is: normalize until it hurts, denormalize until it works.

Every piece of data that is an entity — a coach, an athlete, a workout, an invoice — gets its own table with a single responsibility. No table stores data that belongs to another entity. No column serves double duty depending on context. This discipline prevents update anomalies, reduces storage waste, and makes the schema self-documenting. A new engineer can look at the `workouts` table and understand what a workout is without consulting a wiki; the foreign keys tell the story.

Deliberate denormalization is applied in three cases:

**First, read-heavy aggregation.** The `athlete_metrics` table stores pre-calculated values — estimated one-rep maxes, weekly volume totals, acute-to-chronic workload ratios — that would require expensive queries across multiple tables to compute on every read. These values are updated asynchronously by background workers when the source data changes. The athlete dashboard loads in under 100 milliseconds because the numbers are already waiting. The trade-off is eventual consistency: a freshly logged workout may take up to 5 seconds to reflect in the metrics cache. For a coaching platform, this is an acceptable window. A coach reviewing yesterday's session does not need sub-second freshness on aggregate metrics. The `updated_at` timestamp on every metrics row makes the staleness transparent.

**Second, immutable audit trails and snapshots.** When a coach publishes a program, the published version is stored as an immutable record in `program_snapshots`, capturing the full workout structure at that moment. If the coach later edits the template, active programs continue to reference their snapshot. This is denormalization in the sense that workout data exists in two places — the editable `workout_templates` and the frozen `program_snapshots` — but the alternative (versioning every exercise, set, and rep with effective-date ranges) introduces query complexity that outweighs the storage savings. Storage is cheap. Correctness under concurrent access is expensive. The snapshot pattern pays for itself in reliability and auditability.

**Third, event-sourced projections for analytics.** The `analytics_views` materialized table is a denormalized, pre-aggregated store of coach and athlete performance data. It is populated by materialized views that are refreshed on a schedule, not on every write. The analytics dashboard queries this table, not the operational tables, because scanning millions of workout rows to compute a coach's athlete retention rate on every dashboard load would be absurd. The materialized views are the answer.

### 1.3 Primary Keys: UUIDs vs. Serials

Every primary key in the MR Training database is a UUIDv7. This decision is final and applies universally.

The argument for auto-incrementing integers is familiar: they are smaller (4 or 8 bytes versus 16), they index efficiently (monotonically increasing, no page splits on B-tree inserts), and they are human-readable. These are real advantages. They are also insufficient to outweigh the architectural advantages of UUIDs for this platform.

MR Training is a multi-tenant SaaS platform with a mobile-first architecture. Athletes log workouts on their phones in gyms with intermittent connectivity. The local-first data layer on mobile devices (SQLite on Flutter, IndexedDB on the web) must be able to generate primary keys without contacting the server. UUIDv7 makes this trivial: the client generates a time-ordered UUID, stores the record locally, and syncs to the server when connectivity returns. With auto-incrementing integers, the client would need to use temporary local IDs and reconcile them with server-assigned IDs during sync — a source of bugs, complexity, and data loss risk that is eliminated entirely by client-generated UUIDs.

UUIDs also prevent information leakage. An auto-incrementing `/api/athletes/1452` endpoint tells a curious user exactly how many athletes are in the system, and incrementing the ID reveals records that authorization should have hidden. UUIDs make enumeration attacks impractical. This is defense in depth, not a replacement for proper authorization, but it closes a real information disclosure vector.

UUIDv7 is chosen specifically over UUIDv4 because it is time-sortable. The first 48 bits encode a Unix timestamp in milliseconds; the remaining bits provide randomness for uniqueness. This means UUIDv7 values are roughly monotonically increasing, which preserves B-tree index locality. A UUIDv4 primary key scatters inserts randomly across the index, causing constant page splits and degraded write performance under load. A UUIDv7 primary key inserts in approximate time order, achieving most of the write performance of a serial while retaining all the architectural benefits of a UUID.

The storage cost of 16 bytes per key versus 4 bytes (integer) or 8 bytes (bigint) is acknowledged. In a database with 100 million workout rows, UUID keys consume approximately 1.6 GB of primary key storage versus 400 MB for integers. This is a rounding error on modern storage costs. The operational simplicity of client-generated, globally unique, non-enumerable identifiers is worth every byte.

### 1.4 Timestamps and Temporal Data

Every table that represents a mutable entity includes four standard temporal columns:

```
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at    TIMESTAMPTZ
version       INTEGER NOT NULL DEFAULT 1
```

`created_at` records when the row was first persisted. `updated_at` is maintained by a trigger that fires on every UPDATE — the application layer never sets this value manually. `deleted_at` implements soft deletion; a non-null value means the row is logically deleted but physically retained. `version` is an optimistic concurrency control column: every UPDATE increments it, and the application layer includes `WHERE version = $expected_version` in every mutation query to prevent lost updates.

All timestamp columns use `TIMESTAMPTZ` — timestamp with time zone. The database stores all timestamps internally as UTC. Application code converts to the user's local timezone for display. This is the only correct approach for a platform that will serve coaches and athletes across every timezone on Earth. `TIMESTAMP` without time zone is banned; it creates ambiguity about what a stored time actually means and inevitably leads to off-by-one-day bugs during daylight saving transitions.

### 1.5 Soft Deletes

Soft deletion is applied to tables where data recovery, audit trail preservation, or referential integrity across long time horizons matters. The rule: if losing this data would meaningfully impact a coach's or athlete's experience, soft-delete it.

Tables that use soft deletion:
- `organizations`, `academies` — closing an organization must not cascade-delete every workout, payment, and message in its history
- `users`, `coaches`, `athletes` — deleting a user must preserve their workout history for historical reporting and legal compliance
- `workout_programs`, `workouts` — deleting a program must not invalidate athletes' completed session logs
- `exercise_library` — exercises that were once used in programs remain referenceable even if deprecated
- `subscriptions`, `plans` — billing history must survive plan retirement
- `events`, `competitions` — historical event records are retained for organizational memory

Tables that use hard deletion:
- `notifications` — expiring old notifications is expected behavior; the data has no historical value after a reasonable retention window
- `audit_logs` — these are append-only by design; deletion is handled through time-based partitioning with TTL-based partition dropping
- `ai_interactions` — cached AI responses older than the retention window are dropped
- `media` — media deletion is a two-phase process: mark as deleted, then purge from object storage and database after a configurable grace period

Every query against a soft-deletable table must include `WHERE deleted_at IS NULL` unless the query context explicitly requires including deleted records (e.g., an admin audit view). This is enforced through database views that pre-filter deleted rows and serve as the default query target for application code. Example: the `active_athletes` view selects from `athletes` with `WHERE deleted_at IS NULL` and is the view that the coach dashboard queries. The underlying `athletes` table is only queried directly for admin operations.

### 1.6 Multi-Tenancy

Multi-tenancy is enforced at the database level through the `organization_id` column present on every tenant-scoped table. Every query that operates on tenant data includes a `WHERE organization_id = $current_org_id` clause. This is enforced in the application layer (every repository method accepts an organization context) and validated in the API layer (middleware extracts the organization from the authenticated user's session and injects it into the request context).

Row-Level Security is enabled on tenant-scoped tables as a defense-in-depth measure. If application code contains a bug that omits the `organization_id` filter, PostgreSQL's RLS policy prevents data from crossing tenant boundaries:

```sql
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON athletes
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

The application sets `app.current_organization_id` at the beginning of each database session and clears it at the end. Multi-organization users (e.g., a coach who works across two academies) switch the session variable when changing context. This approach means that a single misconfigured query cannot accidentally expose one organization's athlete data to another organization's coach. The defense is at the database, not just the application code.

### 1.7 Enums and Lookup Tables

Fixed, slowly-changing categories use native PostgreSQL enums. Examples: `sport_type` (gym, running, tennis, swimming, cycling, crossfit), `workout_status` (draft, published, active, completed, archived), `subscription_status` (trialing, active, past_due, canceled, expired). PostgreSQL enums provide type safety at the database level — inserting `'yoga'` into a `sport_type` column raises an error before the row is committed. They also occupy 4 bytes per row, the same as an integer foreign key, while avoiding a join to a lookup table for every query.

Frequently-changing or user-customizable categories use lookup tables. Examples: `exercise_categories`, `muscle_groups`, `equipment_types`, `certification_types`. These are tables with an `id`, `name`, and `organization_id` (nullable; null means a system-provided default that all organizations share). Organizations can extend the system defaults with custom entries. This pattern is used sparingly — only for categories that coaches demonstrably need to customize. Pre-built categories are loaded through seed migrations.

### 1.8 Money and Decimal Data

All monetary values are stored as `BIGINT` representing the amount in the smallest currency unit — cents for USD/EUR, pence for GBP. Stripe, the payment processor for MR Training, uses this representation natively, and keeping the database representation aligned with the payment provider eliminates an entire class of rounding errors. The column name includes the unit for self-documentation: `amount_cents`, `tax_cents`, `discount_cents`.

The alternative — `NUMERIC(12,2)` — would be correct but would require every financial calculation in application code to use arbitrary-precision decimal arithmetic. Go's `math/big.Rat` and TypeScript's `big.js` are capable but add friction. Storing as integers and converting to display values only at the UI layer keeps the math simple and the bugs few.

### 1.9 JSONB Usage

JSONB columns are permitted in exactly three scenarios:

1. **Configuration and settings.** Tables like `notification_preferences` and `program_settings` store user-customizable key-value data that varies widely between organizations. A rigid schema for "which notification channels are enabled for which event types" would require an EAV pattern or hundreds of boolean columns. JSONB with a well-defined schema (validated in application code, documented in the column comment) is the pragmatic choice.

2. **Event payloads.** The `audit_logs` table stores a `payload` JSONB column containing the before/after state of changed rows. The payload schema varies by audited table. JSONB allows the audit system to capture arbitrary row data without a separate audit column for every audited table.

3. **AI interaction metadata.** The `ai_interactions` table stores the full AI request and response in JSONB columns, plus extracted structured data for querying. The raw JSON is retained for debugging and model improvement; the structured columns (tokens, cost, latency) enable operational monitoring.

JSONB is explicitly NOT used for:
- Workout data (relational schema with `workout_exercises`, `exercise_sets`)
- Nutrition entries (relational schema with `nutrition_entries`, `meal_foods`)
- Athlete metrics (dedicated columns for each metric, indexed appropriately)
- Any data that is queried by value in a WHERE clause without indexing (GIN indexes on JSONB are possible but less efficient than B-tree indexes on typed columns)

---

## 2. Entity Relationship Diagram

### 2.1 Core Organizational Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORGANIZATIONS                                │
│  id (PK), name, slug, settings (JSONB), billing_email,              │
│  stripe_customer_id, created_at, updated_at, deleted_at             │
└───────┬─────────────┬─────────────────────────────┬─────────────────┘
        │             │                             │
        ▼             ▼                             ▼
┌───────────┐  ┌─────────────┐  ┌──────────────────────┐
│  ACADEMIES │  │   USERS     │  │   SUBSCRIPTIONS      │
│ id (PK)    │  │ id (PK)     │  │ id (PK)              │
│ org_id (FK)│  │ org_id (FK) │  │ org_id (FK)          │
│ name       │  │ email       │  │ plan_id (FK)         │
│ address    │  │ auth_id     │  │ status, current_period│
└─────┬──────┘  └──────┬──────┘  └──────────────────────┘
      │                │
      │        ┌───────┴────────┐
      │        │                │
      │        ▼                ▼
      │  ┌─────────┐     ┌──────────┐
      │  │ COACHES │     │ ATHLETES │
      │  └─────────┘     └──────────┘
      │
      ▼
┌──────────┐
│  TEAMS   │
└──────────┘
```

### 2.2 Training Domain

```
┌──────────────────┐
│ EXERCISE_LIBRARY │
│ id (PK)          │
│ org_id (FK)      │
│ name, category   │
│ muscle_groups[]  │
│ video_url        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ WORKOUT_PROGRAMS │────>│     WORKOUTS       │────>│ WORKOUT_EXERCISES│
│ id (PK)          │     │ id (PK)            │     │ id (PK)          │
│ coach_id (FK)    │     │ program_id (FK)    │     │ workout_id (FK)  │
│ name, description│     │ scheduled_date     │     │ exercise_id (FK) │
│ sport_type       │     │ status             │     │ sort_order       │
│ phase            │     │ athlete_id (FK)    │     │ notes            │
└──────────────────┘     └────────────────────┘     └────────┬─────────┘
                                                              │
                                                              ▼
                                                     ┌──────────────────┐
                                                     │  EXERCISE_SETS   │
                                                     │ id (PK)          │
                                                     │ workout_exercise │
                                                     │   _id (FK)       │
                                                     │ set_number       │
                                                     │ prescribed_reps  │
                                                     │ prescribed_weight│
                                                     │ actual_reps      │
                                                     │ actual_weight    │
                                                     │ is_completed     │
                                                     └──────────────────┘
```

### 2.3 Nutrition Domain

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ NUTRITION_PLANS  │────>│ NUTRITION_ENTRIES │────>│   MEAL_FOODS     │
│ id (PK)          │     │ id (PK)            │     │ id (PK)          │
│ athlete_id (FK)  │     │ plan_id (FK)       │     │ entry_id (FK)    │
│ coach_id (FK)    │     │ athlete_id (FK)    │     │ food_name        │
│ name, start_date │     │ meal_type          │     │ serving_size     │
│ daily_calories   │     │ logged_at          │     │ calories         │
│ macro_targets    │     │ notes              │     │ protein_g        │
└──────────────────┘     └────────────────────┘     │ carbs_g          │
                                                     │ fat_g            │
┌──────────────────┐                                └──────────────────┘
│ MEAL_TEMPLATES   │
│ id (PK)          │
│ coach_id (FK)    │
│ name, meals      │
└──────────────────┘
```

### 2.4 Recovery Domain

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  RECOVERY_LOGS   │     │ READINESS_SCORES  │     │   SLEEP_DATA     │
│ id (PK)          │     │ id (PK)            │     │ id (PK)          │
│ athlete_id (FK)  │     │ athlete_id (FK)    │     │ athlete_id (FK)  │
│ log_date         │     │ score_date         │     │ sleep_date       │
│ soreness_level   │     │ readiness_score    │     │ duration_minutes │
│ fatigue_level    │     │ hrv_ms             │     │ deep_sleep_min   │
│ stress_level     │     │ resting_hr_bpm     │     │ rem_sleep_min    │
│ mood_rating      │     │ source             │     │ light_sleep_min  │
│ notes            │     │                    │     │ awake_min        │
└──────────────────┘     └───────────────────┘     │ source           │
                                                    └──────────────────┘
```

### 2.5 Events and Competitions

```
┌──────────────────┐
│     EVENTS       │
│ id (PK)          │
│ org_id (FK)      │
│ name, event_type │
│ start_date       │
│ end_date         │
│ location         │
│ max_participants │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐     ┌───────────────────┐
│  EVENT_REGISTRATIONS │     │   COMPETITIONS    │
│ id (PK)              │     │ id (PK)           │
│ event_id (FK)        │     │ event_id (FK)     │
│ athlete_id (FK)      │     │ name, sport_type  │
│ registration_status  │     │ scoring_format    │
│ payment_status       │     │ results (JSONB)   │
│ waiver_accepted      │     └───────────────────┘
└──────────────────────┘
```

### 2.6 Communications

```
┌──────────────────┐     ┌───────────────────┐
│ MESSAGE_THREADS  │────>│    MESSAGES       │
│ id (PK)          │     │ id (PK)           │
│ org_id (FK)      │     │ thread_id (FK)    │
│ subject          │     │ sender_id (FK)    │
│ thread_type      │     │ content           │
│ created_at       │     │ message_type      │
└────────┬─────────┘     │ sent_at           │
         │               └───────────────────┘
         ▼
┌──────────────────┐
│ THREAD_PARTICIPANTS│
│ thread_id (FK)    │
│ user_id (FK)      │
│ last_read_at      │
└──────────────────┘

┌────────────────────────┐
│    NOTIFICATIONS        │
│ id (PK)                 │
│ user_id (FK)            │
│ org_id (FK)             │
│ type, title, body       │
│ is_read                 │
│ created_at              │
└────────────────────────┘

┌─────────────────────────────┐
│ NOTIFICATION_PREFERENCES    │
│ user_id (PK, FK)            │
│ preferences (JSONB)         │
└─────────────────────────────┘
```

### 2.7 Payments and Subscriptions

```
┌──────────────────┐     ┌───────────────────┐
│     PLANS        │────>│   SUBSCRIPTIONS   │
│ id (PK)          │     │ id (PK)           │
│ name, tier       │     │ org_id (FK)       │
│ price_cents      │     │ plan_id (FK)      │
│ interval         │     │ status            │
│ max_athletes     │     │ current_period_   │
│ features (JSONB) │     │   start           │
└──────────────────┘     │ current_period_end │
                         │ stripe_sub_id     │
                         │ canceled_at       │
┌──────────────────┐     └────────┬──────────┘
│    PAYMENTS      │              │
│ id (PK)          │              ▼
│ org_id (FK)      │     ┌───────────────────┐
│ subscription_id  │     │     INVOICES      │
│ amount_cents     │     │ id (PK)           │
│ currency         │     │ org_id (FK)       │
│ status           │     │ subscription_id   │
│ stripe_pi_id     │     │ amount_cents      │
│ payment_method   │     │ status            │
│ paid_at          │     │ due_date          │
└──────────────────┘     │ stripe_invoice_id │
                         │ paid_at           │
                         └───────────────────┘
```

### 2.8 Gamification

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────────┐
│  ACHIEVEMENTS    │     │     BADGES        │     │     CHALLENGES       │
│ id (PK)          │     │ id (PK)           │     │ id (PK)              │
│ athlete_id (FK)  │     │ name, description │     │ org_id (FK)          │
│ achievement_type │     │ icon_url          │     │ name, description    │
│ description      │     │ criteria          │     │ start_date, end_date │
│ achieved_at      │     └────────┬──────────┘     │ challenge_type       │
│ metadata (JSONB) │              │                │ scoring_method       │
└──────────────────┘              │                │ rules (JSONB)        │
                                  ▼                └──────────┬───────────┘
                         ┌───────────────────┐                │
                         │  ATHLETE_BADGES   │                ▼
                         │ athlete_id (FK)   │     ┌──────────────────────┐
                         │ badge_id (FK)     │     │ CHALLENGE_           │
                         │ awarded_at        │     │   PARTICIPANTS       │
                         └───────────────────┘     │ challenge_id (FK)    │
                                                   │ athlete_id (FK)      │
                                                   │ current_score        │
                                                   │ rank                 │
                                                   └──────────────────────┘
```

### 2.9 AI and Analytics

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────────┐
│ AI_INTERACTIONS  │     │  AI_SUGGESTIONS   │     │ AI_GENERATED_CONTENT │
│ id (PK)          │     │ id (PK)           │     │ id (PK)              │
│ org_id (FK)      │     │ interaction_id    │     │ interaction_id (FK)  │
│ user_id (FK)     │     │ suggestion_type   │     │ content_type         │
│ model, provider  │     │ target_entity_type│     │ title                │
│ request (JSONB)  │     │ target_entity_id  │     │ body                 │
│ response (JSONB) │     │ confidence_score  │     │ status               │
│ tokens_in/out    │     │ status            │     │ reviewed_by (FK)     │
│ latency_ms       │     │ applied_at        │     │ published_at         │
│ created_at       │     └───────────────────┘     └──────────────────────┘
└──────────────────┘

┌──────────────────────┐
│     AUDIT_LOGS       │
│ id (PK)              │
│ org_id (FK)          │
│ actor_id (FK)        │
│ action               │
│ entity_type          │
│ entity_id            │
│ changes (JSONB)      │
│ ip_address           │
│ created_at           │
└──────────────────────┘
```

---

## 3. Core Tables

### 3.1 Organizations and Academies

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    settings        JSONB NOT NULL DEFAULT '{}',
    billing_email   VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    logo_media_id   UUID,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX idx_organizations_slug ON organizations (slug) WHERE deleted_at IS NULL;

CREATE TABLE academies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state_province  VARCHAR(100),
    postal_code     VARCHAR(20),
    country         CHAR(2),
    phone           VARCHAR(30),
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    settings        JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_academies_org ON academies (organization_id) WHERE deleted_at IS NULL;
```

### 3.2 Users, Profiles, and Roles

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email           VARCHAR(255) NOT NULL,
    auth_provider   VARCHAR(50) NOT NULL DEFAULT 'clerk',
    auth_id         VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    UNIQUE(organization_id, email)
);

CREATE UNIQUE INDEX idx_users_auth_id ON users (auth_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org ON users (organization_id) WHERE deleted_at IS NULL;

CREATE TABLE user_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    avatar_media_id UUID,
    phone           VARCHAR(30),
    date_of_birth   DATE,
    gender          VARCHAR(30),
    bio             TEXT,
    timezone        VARCHAR(50),
    locale          VARCHAR(10) DEFAULT 'en-US',
    metadata        JSONB NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role            VARCHAR(50) NOT NULL,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by      UUID REFERENCES users(id),
    expires_at      TIMESTAMPTZ,
    UNIQUE(user_id, organization_id, role)
);

CREATE INDEX idx_user_roles_user ON user_roles (user_id);
CREATE INDEX idx_user_roles_org ON user_roles (organization_id);
```

User roles are stored as discrete rows, not a comma-separated string or a PostgreSQL array. This allows querying "find all users with the coach role in organization X" with a simple indexed lookup. The `expires_at` column supports time-limited role assignments for temporary staff, trial coaches, or guest nutritionists.

### 3.3 Coaches

```sql
CREATE TABLE coaches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    academy_id      UUID REFERENCES academies(id),
    headline        VARCHAR(200),
    experience_years INTEGER,
    biography       TEXT,
    is_accepting_athletes BOOLEAN NOT NULL DEFAULT true,
    max_athletes    INTEGER,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_coaches_org ON coaches (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_coaches_academy ON coaches (academy_id) WHERE deleted_at IS NULL;

CREATE TABLE coach_specialties (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    sport_type      VARCHAR(50) NOT NULL,
    specialty       VARCHAR(100),
    UNIQUE(coach_id, sport_type)
);

CREATE TABLE coach_certifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    issuing_org     VARCHAR(200),
    certification_date DATE,
    expiration_date DATE,
    credential_id   VARCHAR(100),
    verification_url VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_certs_coach ON coach_certifications (coach_id);
CREATE INDEX idx_coach_certs_expiry ON coach_certifications (expiration_date)
    WHERE expiration_date IS NOT NULL;
```

### 3.4 Athletes

```sql
CREATE TABLE athletes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    primary_sport   VARCHAR(50),
    experience_level VARCHAR(30),
    height_cm       NUMERIC(5,1),
    weight_kg       NUMERIC(5,1),
    body_fat_pct    NUMERIC(4,1),
    injury_status   VARCHAR(30) NOT NULL DEFAULT 'healthy',
    training_status VARCHAR(30) NOT NULL DEFAULT 'active',
    goals           JSONB NOT NULL DEFAULT '[]',
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_athletes_org ON athletes (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_athletes_status ON athletes (organization_id, training_status)
    WHERE deleted_at IS NULL;

CREATE TABLE athlete_coach_assignments (
    athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    coach_id        UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_primary      BOOLEAN NOT NULL DEFAULT true,
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    PRIMARY KEY (athlete_id, coach_id)
);

CREATE INDEX idx_athlete_coach_coach ON athlete_coach_assignments (coach_id);

CREATE TABLE athlete_metrics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    metric_date     DATE NOT NULL,
    weight_kg       NUMERIC(5,1),
    body_fat_pct    NUMERIC(4,1),
    resting_hr_bpm  INTEGER,
    vo2max_estimate NUMERIC(5,1),
    weekly_training_load INTEGER,
    acute_load      NUMERIC(8,2),
    chronic_load    NUMERIC(8,2),
    acwr            NUMERIC(5,2),
    adherence_pct   NUMERIC(5,2),
    metadata        JSONB NOT NULL DEFAULT '{}',
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(athlete_id, metric_date)
);

CREATE INDEX idx_athlete_metrics_date ON athlete_metrics (athlete_id, metric_date DESC);

CREATE TABLE athlete_goals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    goal_type       VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL,
    target_value    NUMERIC,
    current_value   NUMERIC,
    unit            VARCHAR(30),
    start_date      DATE NOT NULL,
    target_date     DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    achieved_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_athlete_goals_athlete ON athlete_goals (athlete_id, status);
```

### 3.5 Teams

```sql
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    academy_id      UUID REFERENCES academies(id),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    sport_type      VARCHAR(50),
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_teams_org ON teams (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_academy ON teams (academy_id) WHERE deleted_at IS NULL;

CREATE TABLE team_members (
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role            VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, athlete_id)
);

CREATE INDEX idx_team_members_athlete ON team_members (athlete_id);
```

### 3.6 Workout Programs, Workouts, and Exercises

```sql
CREATE TABLE exercise_library (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    sport_type      VARCHAR(50) NOT NULL,
    muscle_groups   TEXT[] NOT NULL DEFAULT '{}',
    equipment       TEXT[] NOT NULL DEFAULT '{}',
    difficulty      VARCHAR(30),
    description     TEXT,
    instructions    TEXT,
    video_url       VARCHAR(500),
    thumbnail_url   VARCHAR(500),
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    is_custom       BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_exercise_library_org ON exercise_library (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_exercise_library_sport ON exercise_library (sport_type, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_exercise_library_muscles ON exercise_library USING GIN (muscle_groups);

CREATE TABLE workout_programs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    coach_id        UUID NOT NULL REFERENCES coaches(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    sport_type      VARCHAR(50) NOT NULL,
    program_type    VARCHAR(50) NOT NULL DEFAULT 'custom',
    start_date      DATE,
    end_date        DATE,
    duration_weeks  INTEGER,
    phases          JSONB NOT NULL DEFAULT '[]',
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    is_template     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_workout_programs_coach ON workout_programs (coach_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workout_programs_org ON workout_programs (organization_id, status) WHERE deleted_at IS NULL;

CREATE TABLE workouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    program_id      UUID REFERENCES workout_programs(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    athlete_id      UUID NOT NULL REFERENCES athletes(id),
    coach_id        UUID REFERENCES coaches(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    sport_type      VARCHAR(50) NOT NULL,
    workout_type    VARCHAR(50) NOT NULL DEFAULT 'training',
    scheduled_date  DATE NOT NULL,
    completed_at    TIMESTAMPTZ,
    duration_minutes INTEGER,
    status          VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    rpe             INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    soreness        INTEGER CHECK (soreness >= 1 AND soreness <= 10),
    energy          INTEGER CHECK (energy >= 1 AND energy <= 10),
    athlete_notes   TEXT,
    coach_notes     TEXT,
    coach_feedback  TEXT,
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     UUID REFERENCES users(id),
    source          VARCHAR(30) NOT NULL DEFAULT 'manual',
    source_id       VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    version         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_workouts_athlete ON workouts (athlete_id, scheduled_date DESC);
CREATE INDEX idx_workouts_program ON workouts (program_id);
CREATE INDEX idx_workouts_org_date ON workouts (organization_id, scheduled_date);
CREATE INDEX idx_workouts_status ON workouts (athlete_id, status) WHERE status != 'completed';

CREATE TABLE workout_exercises (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    workout_id      UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id     UUID NOT NULL REFERENCES exercise_library(id),
    section         VARCHAR(50) NOT NULL DEFAULT 'main',
    sort_order      INTEGER NOT NULL,
    notes           TEXT,
    rest_seconds    INTEGER,
    tempo           VARCHAR(20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id, sort_order);

CREATE TABLE exercise_sets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number          INTEGER NOT NULL,
    set_type            VARCHAR(30) NOT NULL DEFAULT 'working',
    prescribed_reps     INTEGER,
    prescribed_weight_kg NUMERIC(7,2),
    prescribed_distance_m NUMERIC(8,1),
    prescribed_duration_sec INTEGER,
    prescribed_rpe      NUMERIC(3,1),
    prescribed_pace     VARCHAR(20),
    actual_reps         INTEGER,
    actual_weight_kg    NUMERIC(7,2),
    actual_distance_m   NUMERIC(8,1),
    actual_duration_sec INTEGER,
    actual_pace         VARCHAR(20),
    is_completed        BOOLEAN NOT NULL DEFAULT false,
    is_skipped          BOOLEAN NOT NULL DEFAULT false,
    completed_at        TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercise_sets_wk_ex ON exercise_sets (workout_exercise_id, set_number);

CREATE TABLE program_assignments (
    program_id      UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
    athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    assigned_by     UUID NOT NULL REFERENCES users(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    completed_at    TIMESTAMPTZ,
    PRIMARY KEY (program_id, athlete_id)
);

CREATE INDEX idx_program_assignments_athlete ON program_assignments (athlete_id, status);
```

The separation of `prescribed_*` and `actual_*` columns in `exercise_sets` is intentional. A coach prescribes the workout; the athlete logs what they actually did. Both are valuable. The prescription is the plan; the actual is the execution. The gap between them is the signal — it tells the coach whether the athlete is progressing, struggling, sandbagging, or overreaching. Storing both in the same row (rather than in a separate "logged sets" table) keeps the most common query pattern — "show me the prescribed workout with the athlete's logged data side by side" — to a single table scan.

### 3.7 Nutrition

```sql
CREATE TABLE nutrition_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    athlete_id      UUID NOT NULL REFERENCES athletes(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    start_date      DATE NOT NULL,
    end_date        DATE,
    daily_calories  INTEGER,
    protein_g       NUMERIC(6,1),
    carbs_g         NUMERIC(6,1),
    fat_g           NUMERIC(6,1),
    dietary_restrictions TEXT[] DEFAULT '{}',
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_nutrition_plans_athlete ON nutrition_plans (athlete_id, status) WHERE deleted_at IS NULL;

CREATE TABLE nutrition_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id      UUID NOT NULL REFERENCES athletes(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    plan_id         UUID REFERENCES nutrition_plans(id),
    meal_type       VARCHAR(30) NOT NULL,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    logged_date     DATE NOT NULL,
    notes           TEXT,
    photo_media_id  UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nutrition_entries_athlete ON nutrition_entries (athlete_id, logged_date DESC);
CREATE INDEX idx_nutrition_entries_plan ON nutrition_entries (plan_id);

CREATE TABLE meal_foods (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    entry_id        UUID NOT NULL REFERENCES nutrition_entries(id) ON DELETE CASCADE,
    food_name       VARCHAR(255) NOT NULL,
    brand           VARCHAR(255),
    barcode         VARCHAR(50),
    serving_size    VARCHAR(100),
    servings        NUMERIC(6,2) NOT NULL DEFAULT 1,
    calories        INTEGER NOT NULL,
    protein_g       NUMERIC(6,1) NOT NULL DEFAULT 0,
    carbs_g         NUMERIC(6,1) NOT NULL DEFAULT 0,
    fat_g           NUMERIC(6,1) NOT NULL DEFAULT 0,
    fiber_g         NUMERIC(5,1) DEFAULT 0,
    sugar_g         NUMERIC(5,1) DEFAULT 0,
    sodium_mg       NUMERIC(7,1) DEFAULT 0,
    source          VARCHAR(30) NOT NULL DEFAULT 'manual',
    source_food_id  VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_foods_entry ON meal_foods (entry_id);
CREATE INDEX idx_meal_foods_barcode ON meal_foods (barcode) WHERE barcode IS NOT NULL;

CREATE TABLE meal_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    meal_type       VARCHAR(30),
    foods           JSONB NOT NULL DEFAULT '[]',
    total_calories  INTEGER,
    protein_g       NUMERIC(6,1),
    carbs_g         NUMERIC(6,1),
    fat_g           NUMERIC(6,1),
    is_public       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_meal_templates_org ON meal_templates (organization_id) WHERE deleted_at IS NULL;
```

### 3.8 Recovery

```sql
CREATE TABLE recovery_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id      UUID NOT NULL REFERENCES athletes(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    log_date        DATE NOT NULL,
    soreness_level  INTEGER CHECK (soreness_level >= 1 AND soreness_level <= 10),
    fatigue_level   INTEGER CHECK (fatigue_level >= 1 AND fatigue_level <= 10),
    stress_level    INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    mood_rating     INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(athlete_id, log_date)
);

CREATE INDEX idx_recovery_logs_athlete ON recovery_logs (athlete_id, log_date DESC);

CREATE TABLE readiness_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id      UUID NOT NULL REFERENCES athletes(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    score_date      DATE NOT NULL,
    readiness_score INTEGER NOT NULL CHECK (readiness_score >= 0 AND readiness_score <= 100),
    hrv_ms          NUMERIC(6,1),
    resting_hr_bpm  INTEGER,
    respiratory_rate NUMERIC(4,1),
    blood_oxygen    NUMERIC(4,1),
    skin_temp_c     NUMERIC(4,1),
    source          VARCHAR(50) NOT NULL,
    source_device   VARCHAR(100),
    raw_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(athlete_id, score_date)
);

CREATE INDEX idx_readiness_scores_athlete ON readiness_scores (athlete_id, score_date DESC);

CREATE TABLE sleep_data (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id          UUID NOT NULL REFERENCES athletes(id),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    sleep_date          DATE NOT NULL,
    duration_minutes    INTEGER NOT NULL,
    deep_sleep_minutes  INTEGER,
    rem_sleep_minutes   INTEGER,
    light_sleep_minutes INTEGER,
    awake_minutes       INTEGER,
    efficiency_pct      NUMERIC(5,2),
    latency_minutes     INTEGER,
    bedtime             TIMESTAMPTZ,
    wake_time           TIMESTAMPTZ,
    quality_score       INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    source              VARCHAR(50),
    source_device       VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(athlete_id, sleep_date)
);

CREATE INDEX idx_sleep_data_athlete ON sleep_data (athlete_id, sleep_date DESC);
```

### 3.9 Events and Competitions

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    academy_id      UUID REFERENCES academies(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(150) NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    description     TEXT,
    sport_type      VARCHAR(50),
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ,
    location_name   VARCHAR(255),
    address_line1   VARCHAR(255),
    city            VARCHAR(100),
    country         CHAR(2),
    timezone        VARCHAR(50),
    max_participants INTEGER,
    price_cents     BIGINT DEFAULT 0,
    currency        CHAR(3) DEFAULT 'USD',
    registration_open_at TIMESTAMPTZ,
    registration_close_at TIMESTAMPTZ,
    requires_waiver BOOLEAN NOT NULL DEFAULT false,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    settings        JSONB NOT NULL DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    version         INTEGER NOT NULL DEFAULT 1,
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_events_org ON events (organization_id, start_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_academy ON events (academy_id) WHERE deleted_at IS NULL;

CREATE TABLE event_registrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    athlete_id      UUID NOT NULL REFERENCES athletes(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    payment_status  VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    amount_cents    BIGINT,
    waiver_accepted BOOLEAN NOT NULL DEFAULT false,
    waiver_accepted_at TIMESTAMPTZ,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_in_at   TIMESTAMPTZ,
    notes           TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    UNIQUE(event_id, athlete_id)
);

CREATE INDEX idx_event_registrations_event ON event_registrations (event_id, status);
CREATE INDEX idx_event_registrations_athlete ON event_registrations (athlete_id);

CREATE TABLE competitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    sport_type      VARCHAR(50),
    category        VARCHAR(100),
    scoring_format  VARCHAR(50) NOT NULL,
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    results         JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(30) NOT NULL DEFAULT 'upcoming',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitions_event ON competitions (event_id);

CREATE TABLE competition_entries (
    competition_id  UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    athlete_id      UUID NOT NULL REFERENCES athletes(id),
    registration_id UUID REFERENCES event_registrations(id),
    bib_number      INTEGER,
    result_value    NUMERIC(12,4),
    result_unit     VARCHAR(30),
    rank            INTEGER,
    notes           TEXT,
    PRIMARY KEY (competition_id, athlete_id)
);
```

### 3.10 Messaging

```sql
CREATE TABLE message_threads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    subject         VARCHAR(255),
    thread_type     VARCHAR(30) NOT NULL DEFAULT 'direct',
    context_type    VARCHAR(50),
    context_id      UUID,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_threads_org ON message_threads (organization_id);

CREATE TABLE thread_participants (
    thread_id       UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at    TIMESTAMPTZ,
    is_muted        BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX idx_thread_participants_user ON thread_participants (user_id);

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    thread_id       UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    content         TEXT NOT NULL,
    message_type    VARCHAR(30) NOT NULL DEFAULT 'text',
    parent_id       UUID REFERENCES messages(id),
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at       TIMESTAMPTZ,
    is_system       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_messages_thread ON messages (thread_id, sent_at);
CREATE INDEX idx_messages_thread_sent ON messages (thread_id, sent_at DESC);
```

The `context_type` and `context_id` columns on `message_threads` link a thread to its context — an athlete profile, a specific workout, an event, a nutrition plan. This enables the "messaging in context" UX pattern: when a coach opens an athlete's profile, the thread scoped to that athlete is queried by `context_type = 'athlete' AND context_id = $athlete_id` and rendered inline. The thread exists independently of the context but is discoverable through it.

### 3.11 Notifications

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    action_url      VARCHAR(500),
    entity_type     VARCHAR(50),
    entity_id       UUID,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    read_at         TIMESTAMPTZ,
    is_pushed       BOOLEAN NOT NULL DEFAULT false,
    pushed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, created_at DESC) WHERE is_read = false;

CREATE TABLE notification_preferences (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferences         JSONB NOT NULL DEFAULT '{}',
    push_enabled        BOOLEAN NOT NULL DEFAULT true,
    email_enabled       BOOLEAN NOT NULL DEFAULT true,
    sms_enabled         BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start   TIME,
    quiet_hours_end     TIME,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.12 Subscriptions and Payments

```sql
CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    tier            VARCHAR(30) NOT NULL,
    description     TEXT,
    price_cents     BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'USD',
    interval        VARCHAR(20) NOT NULL,
    trial_days      INTEGER DEFAULT 0,
    max_athletes    INTEGER,
    max_coaches     INTEGER DEFAULT 1,
    features        JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    plan_id             UUID NOT NULL REFERENCES plans(id),
    status              VARCHAR(30) NOT NULL DEFAULT 'incomplete',
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ,
    current_period_end  TIMESTAMPTZ,
    trial_start         TIMESTAMPTZ,
    trial_end           TIMESTAMPTZ,
    canceled_at         TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    ended_at            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    version             INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_subscriptions_org ON subscriptions (organization_id, status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    subscription_id     UUID REFERENCES subscriptions(id),
    amount_cents        BIGINT NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    payment_method      VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    description         VARCHAR(500),
    refunded_at         TIMESTAMPTZ,
    refund_amount_cents BIGINT,
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_org ON payments (organization_id, created_at DESC);
CREATE INDEX idx_payments_subscription ON payments (subscription_id);
CREATE INDEX idx_payments_stripe ON payments (stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;

CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    subscription_id     UUID REFERENCES subscriptions(id),
    invoice_number      VARCHAR(50) NOT NULL UNIQUE,
    amount_cents        BIGINT NOT NULL,
    tax_cents           BIGINT NOT NULL DEFAULT 0,
    total_cents         BIGINT NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    status              VARCHAR(30) NOT NULL DEFAULT 'draft',
    stripe_invoice_id   VARCHAR(255),
    stripe_invoice_url  VARCHAR(500),
    stripe_invoice_pdf  VARCHAR(500),
    due_date            DATE,
    paid_at             TIMESTAMPTZ,
    period_start        DATE,
    period_end          DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_org ON invoices (organization_id, created_at DESC);
CREATE INDEX idx_invoices_subscription ON invoices (subscription_id);
CREATE INDEX idx_invoices_status ON invoices (organization_id, status);
```

### 3.13 Achievements, Badges, and Challenges

```sql
CREATE TABLE achievements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    athlete_id          UUID NOT NULL REFERENCES athletes(id),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    achievement_type    VARCHAR(50) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    metric_name         VARCHAR(100),
    metric_value        NUMERIC(12,4),
    metric_unit         VARCHAR(30),
    previous_value      NUMERIC(12,4),
    achieved_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    context_type        VARCHAR(50),
    context_id          UUID,
    is_shared           BOOLEAN NOT NULL DEFAULT false,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_athlete ON achievements (athlete_id, achieved_at DESC);
CREATE INDEX idx_achievements_org ON achievements (organization_id, achievement_type);

CREATE TABLE badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    icon_url        VARCHAR(500),
    category        VARCHAR(50) NOT NULL,
    criteria        JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE athlete_badges (
    athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    badge_id        UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    awarded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata        JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (athlete_id, badge_id)
);

CREATE INDEX idx_athlete_badges_athlete ON athlete_badges (athlete_id);

CREATE TABLE challenges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    challenge_type  VARCHAR(50) NOT NULL,
    sport_type      VARCHAR(50),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    scoring_method  VARCHAR(50) NOT NULL,
    rules           JSONB NOT NULL DEFAULT '{}',
    is_public       BOOLEAN NOT NULL DEFAULT false,
    status          VARCHAR(30) NOT NULL DEFAULT 'upcoming',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenges_org ON challenges (organization_id, status);
CREATE INDEX idx_challenges_dates ON challenges (start_date, end_date);

CREATE TABLE challenge_participants (
    challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    athlete_id      UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    current_score   NUMERIC(12,4) NOT NULL DEFAULT 0,
    rank            INTEGER,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    PRIMARY KEY (challenge_id, athlete_id)
);

CREATE INDEX idx_challenge_parts_athlete ON challenge_participants (athlete_id);
CREATE INDEX idx_challenge_parts_rank ON challenge_participants (challenge_id, rank);
```

### 3.14 AI Interactions

```sql
CREATE TABLE ai_interactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    provider        VARCHAR(50) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    prompt_hash     VARCHAR(64),
    request         JSONB NOT NULL,
    response        JSONB,
    tokens_in       INTEGER,
    tokens_out      INTEGER,
    cost_cents      NUMERIC(10,6),
    latency_ms      INTEGER,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_ai_interactions_org ON ai_interactions (organization_id, created_at DESC);
CREATE INDEX idx_ai_interactions_user ON ai_interactions (user_id, created_at DESC);
CREATE INDEX idx_ai_interactions_type ON ai_interactions (interaction_type, created_at DESC);

CREATE TABLE ai_suggestions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    interaction_id      UUID REFERENCES ai_interactions(id),
    suggestion_type     VARCHAR(50) NOT NULL,
    target_entity_type  VARCHAR(50) NOT NULL,
    target_entity_id    UUID NOT NULL,
    title               VARCHAR(255),
    description         TEXT,
    confidence_score    NUMERIC(5,4),
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    applied_at          TIMESTAMPTZ,
    applied_by          UUID REFERENCES users(id),
    dismissed_at        TIMESTAMPTZ,
    dismissed_by        UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_suggestions_target ON ai_suggestions (target_entity_type, target_entity_id, status);
CREATE INDEX idx_ai_suggestions_org ON ai_suggestions (organization_id, status);

CREATE TABLE ai_generated_content (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    interaction_id  UUID REFERENCES ai_interactions(id),
    content_type    VARCHAR(50) NOT NULL,
    title           VARCHAR(500),
    body            TEXT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    published_at    TIMESTAMPTZ,
    context_type    VARCHAR(50),
    context_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_content_org ON ai_generated_content (organization_id, content_type, status);
```

### 3.15 Audit Logs

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    actor_id        UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    changes         JSONB,
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_logs_org ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (organization_id, action, created_at DESC);
```

### 3.16 Media

```sql
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    storage_provider VARCHAR(30) NOT NULL DEFAULT 's3',
    storage_path    VARCHAR(1000) NOT NULL,
    storage_url     VARCHAR(1000),
    thumbnail_url   VARCHAR(1000),
    width           INTEGER,
    height          INTEGER,
    duration_sec    NUMERIC(8,2),
    metadata        JSONB NOT NULL DEFAULT '{}',
    is_processed    BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    purged_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_org ON media (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_purge ON media (deleted_at) WHERE deleted_at IS NOT NULL AND purged_at IS NULL;
```

---

## 4. Indexing Strategy

### 4.1 Index Design Principles

Every index in the database exists because a specific query pattern demands it, not because "indexing everything" sounds safe. The cost of an index is paid on every INSERT, UPDATE, and DELETE — each index must be maintained. The benefit is only realized on SELECT. An index that is never used by a query is dead weight that slows down writes and consumes storage.

Before creating an index, verify that it will serve a specific, measurable query. The index name includes a hint about the query it serves: `idx_workouts_athlete_status` clearly communicates "this index supports queries that filter workouts by athlete and status." An index named `idx_workouts_1` communicates nothing.

### 4.2 Compound Indexes

Compound indexes are designed with the equality-first, range-last rule. Columns used in equality comparisons (`=`, `IN`) are placed at the front of the index. Columns used in range comparisons (`>`, `<`, `BETWEEN`, `ORDER BY`) are placed at the end. A query that filters `WHERE organization_id = $1 AND scheduled_date >= $2 ORDER BY scheduled_date DESC` is served optimally by an index on `(organization_id, scheduled_date DESC)`.

Key compound indexes:

```sql
-- Athlete workouts: the most common query pattern in the platform
CREATE INDEX idx_workouts_athlete_status_date ON workouts (athlete_id, status, scheduled_date DESC);

-- Coach's athlete roster with status filtering
CREATE INDEX idx_athlete_coach_assign_coach_status ON athlete_coach_assignments (coach_id, status);

-- Notifications: user's unread notifications, most recent first
CREATE INDEX idx_notifications_user_unread_date ON notifications (user_id, created_at DESC) WHERE is_read = false;

-- Audit: entity history
CREATE INDEX idx_audit_logs_entity_time ON audit_logs (entity_type, entity_id, created_at DESC);

-- Messages in a thread
CREATE INDEX idx_messages_thread_sent ON messages (thread_id, sent_at DESC);

-- Event registrations for an event with status
CREATE INDEX idx_event_registrations_event_status ON event_registrations (event_id, status);

-- Payments by organization and date
CREATE INDEX idx_payments_org_date ON payments (organization_id, created_at DESC);
```

### 4.3 Partial Indexes

Partial indexes reduce index size by only indexing rows that match a WHERE clause. They are most effective when a small subset of rows is queried frequently.

```sql
-- Active athletes (the majority of athlete queries)
CREATE INDEX idx_athletes_active ON athletes (organization_id, primary_sport)
    WHERE deleted_at IS NULL AND training_status = 'active';

-- Incomplete workouts (the coach's review queue)
CREATE INDEX idx_workouts_pending_review ON workouts (coach_id, scheduled_date)
    WHERE status = 'completed' AND reviewed_at IS NULL;

-- Active subscriptions (billing queries)
CREATE INDEX idx_subscriptions_active ON subscriptions (organization_id)
    WHERE status IN ('active', 'trialing', 'past_due');

-- Expiring certifications (compliance dashboard)
CREATE INDEX idx_coach_certs_expiring ON coach_certifications (expiration_date)
    WHERE expiration_date IS NOT NULL
      AND expiration_date > now()
      AND expiration_date < now() + INTERVAL '90 days';

-- Pending AI suggestions
CREATE INDEX idx_ai_suggestions_pending ON ai_suggestions (organization_id)
    WHERE status = 'pending';

-- Unread notifications (the notification badge query)
CREATE INDEX idx_notifications_unread_count ON notifications (user_id)
    WHERE is_read = false;
```

### 4.4 Full-Text Search

PostgreSQL's built-in full-text search is used for searchable text fields. A `tsvector` column is maintained via a generated column and indexed with a GIN index.

```sql
-- Exercise library search
ALTER TABLE exercise_library ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(instructions, '')), 'C')
    ) STORED;

CREATE INDEX idx_exercise_library_search ON exercise_library USING GIN (search_vector);
```

Search queries use `ts_rank` for relevance scoring:

```sql
SELECT id, name, ts_rank(search_vector, query) AS rank
FROM exercise_library
WHERE search_vector @@ plainto_tsquery('english', 'barbell squat')
  AND deleted_at IS NULL
ORDER BY rank DESC
LIMIT 20;
```

For athlete search, a similar pattern on `user_profiles` (first_name, last_name, bio) enables the command palette search (Cmd+K) to find athletes by name.

### 4.5 Covering Indexes

Index-only scans avoid heap fetches when all columns needed by a query are present in the index. INCLUDE clauses add non-key columns to the index leaf nodes.

```sql
-- Athlete roster dashboard: name, sport, status, adherence.
-- This index covers the coach's most common dashboard query.
CREATE INDEX idx_athletes_roster ON athletes (organization_id, training_status)
    INCLUDE (user_id, primary_sport)
    WHERE deleted_at IS NULL;
```

### 4.6 Index Maintenance

Indexes bloat over time under write-heavy workloads. A weekly `REINDEX CONCURRENTLY` on the most volatile indexes is scheduled via `pg_cron`:

```sql
SELECT cron.schedule(
    'reindex-notifications',
    '0 3 * * 0',
    'REINDEX INDEX CONCURRENTLY idx_notifications_user_unread_date'
);
```

Bloat is monitored via the `pg_stat_user_indexes` and `pgstattuple` extension. An index with more than 30% bloat is flagged for a manual REINDEX during the next maintenance window.

---

## 5. Partitioning

### 5.1 Time-Based Partitioning

Three tables grow unboundedly and benefit from time-based partitioning:

| Table | Partition Key | Partition Interval | Retention |
|---|---|---|---|
| `notifications` | `created_at` | Monthly | 90 days |
| `ai_interactions` | `created_at` | Monthly | 180 days |
| `audit_logs` | `created_at` | Monthly | 7 years |

Partitioning these tables produces three benefits: queries that filter by date scan only relevant partitions; old partitions are dropped with a single DDL operation instead of a DELETE that generates WAL and triggers vacuum; and the partitioned table can be backed up and restored in smaller, independent chunks.

### 5.2 Partition Management

`pg_partman` automates partition creation and retention:

```sql
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Notifications: create monthly partitions, retain 3 months
SELECT partman.create_parent(
    p_parent_table := 'public.notifications',
    p_control      := 'created_at',
    p_type         := 'native',
    p_interval     := '1 month',
    p_premake      := 2
);

-- Configure automatic partition creation
UPDATE partman.part_config
SET premake         = 2,
    retention       = '3 months',
    retention_keep_table = false
WHERE parent_table = 'public.notifications';

-- AI interactions: retain 6 months for model improvement analysis
UPDATE partman.part_config
SET retention       = '6 months',
    retention_keep_table = false
WHERE parent_table = 'public.ai_interactions';

-- Audit logs: retain 7 years for compliance
UPDATE partman.part_config
SET retention       = '7 years',
    retention_keep_table = true
WHERE parent_table = 'public.audit_logs';
```

The `pg_partman` background worker (scheduled via `pg_cron`) runs `partman.run_maintenance()` hourly. This creates partitions for the next 2 months and drops partitions older than the retention window. Audit log partitions are retained as physical tables (`retention_keep_table = true`) but detached from the parent; they can be archived to cold storage (S3 Glacier) before being dropped.

### 5.3 Partition Pruning

Queries that filter on the partition key benefit from automatic partition pruning. A query for `notifications WHERE created_at >= '2026-06-01' AND created_at < '2026-07-01'` scans only the June 2026 partition. This is transparent to application code — PostgreSQL's query planner handles it automatically.

Application code should always include a date filter on partitioned tables. Repository methods for partitioned entities accept a `since` or `date_range` parameter and append it to every query.

---

## 6. Migration Strategy

### 6.1 Migration Framework

Database migrations are managed through the Go backend's migration tool. Each migration is a pair of SQL files — an `up` migration and a `down` migration — stored in `apps/api/migrations/` and versioned with a sequential, zero-padded number:

```
apps/api/migrations/
├── 000001_create_organizations.up.sql
├── 000001_create_organizations.down.sql
├── 000002_create_users.up.sql
├── 000002_create_users.down.sql
├── 000003_create_coaches.up.sql
├── 000003_create_coaches.down.sql
...
```

Migrations run inside a transaction. If any statement fails, the entire migration rolls back. Complex migrations that cannot run in a single transaction (e.g., creating an index concurrently) are split into multiple migration files.

### 6.2 Backward Compatibility

Every migration must be backward-compatible with the running application code. The deployment order is: run migrations, then deploy the new application code. During the window between migration completion and application deployment, the old application code must continue to function against the new schema. This constrains schema changes:

- **Adding a column**: Always add with a DEFAULT value or allow NULL. The old application code may INSERT without specifying the column, so it must have a safe default.
- **Removing a column**: A three-step process. Step 1: deploy application code that stops reading the column. Step 2: deploy application code that stops writing the column. Step 3: drop the column in a migration. Each step is a separate deployment.
- **Renaming a column**: Avoid. If unavoidable, add the new column (with a trigger to keep old and new in sync), deploy code that writes to both, migrate existing data, deploy code that reads from new and writes to both, deploy code that only writes to new, drop the old column and trigger. This is a 5-deployment process. Prefer adding a new column and deprecating the old one in application code.
- **Adding a NOT NULL constraint**: Add as NOT VALID first, validate in a separate transaction, then set as NOT NULL. `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` skips the full table scan during migration; `ALTER TABLE ... VALIDATE CONSTRAINT` runs the scan but does not block writes.
- **Adding a foreign key**: Create the constraint as NOT VALID initially, then validate separately, to avoid locking the referenced table.

### 6.3 Naming Conventions

- Table names: lowercase, plural, snake_case. `athletes`, `workout_programs`, `exercise_sets`.
- Column names: lowercase, snake_case, descriptive. `organization_id`, `created_at`, `is_active`.
- Primary keys: always `id`.
- Foreign keys: `{referenced_table_singular}_id`. `coach_id` references `coaches(id)`. `workout_id` references `workouts(id)`.
- Indexes: `idx_{table}_{columns}`. `idx_workouts_athlete_status`. For partial indexes, append the condition: `idx_athletes_active`.
- Unique constraints: `uq_{table}_{columns}`.
- Check constraints: `ck_{table}_{rule}`. `ck_readiness_score_range`.
- Triggers: `trg_{table}_{timing}_{event}`. `trg_users_before_update`.
- Functions: `fn_{purpose}`. `fn_update_updated_at`.

### 6.4 Data Migrations

Data migrations — transformations that modify existing data rather than schema — are handled separately from schema migrations. They run as Go scripts invoked by the migration runner, with explicit idempotency guards. Example:

```go
// migrations/000010_backfill_athlete_metrics.go
func Migrate(db *sql.DB) error {
    // Idempotent: skip athletes that already have metrics
    rows, err := db.Query(`
        INSERT INTO athlete_metrics (athlete_id, metric_date, ...)
        SELECT a.id, CURRENT_DATE, ...
        FROM athletes a
        LEFT JOIN athlete_metrics am ON a.id = am.athlete_id
            AND am.metric_date = CURRENT_DATE
        WHERE am.id IS NULL
          AND a.deleted_at IS NULL
    `)
    ...
}
```

### 6.5 Rollback Strategy

The `down` migration file must reverse exactly what the `up` migration did. If `up` created a table, `down` drops it. If `up` added a column, `down` drops it. Data loss in `down` is acceptable: the `down` migration is a disaster recovery tool, not a feature toggle. It is tested in a staging environment before being committed.

Rollback in production follows this order:
1. Roll back the application deployment to the previous version.
2. Run the `down` migration to reverse the schema changes.
3. If the `down` migration cannot recover data (e.g., a dropped column), restore from the most recent backup to a staging instance and manually reconcile.

Rollbacks are rare because backward-compatible migrations mean the old application code continues to work after the migration runs. The typical response to a bug is "deploy a fix forward," not "roll back the database."

---

## 7. Backup & Recovery

### 7.1 Backup Strategy

**Continuous archiving** via WAL (Write-Ahead Log) archiving to S3-compatible object storage provides point-in-time recovery (PITR) to any moment within the retention window. WAL segments are archived every 60 seconds or when they reach 16 MB, whichever comes first.

**Full base backups** via `pg_basebackup` are taken daily at 03:00 UTC during the lowest-traffic window. The backup is a physical copy of the PostgreSQL data directory, compressed with zstd (level 6), and uploaded to object storage. A daily backup provides a recovery starting point; WAL replay provides recovery to the exact transaction.

**Logical backups** via `pg_dump` are taken weekly (every Sunday at 04:00 UTC) for the `organizations`, `users`, `plans`, `subscriptions`, and `payments` tables. These small, critical tables benefit from an additional backup format that can be restored to a different PostgreSQL version. The logical backup is compressed with gzip and stored alongside the physical backups.

### 7.2 Retention Policy

| Backup Type | Frequency | Retention |
|---|---|---|
| WAL archives | Continuous | 30 days |
| Full base backup | Daily | 30 days |
| Logical backup | Weekly | 90 days |
| Audit log archival | Monthly | 10 years |

After 30 days, WAL archives older than the oldest full backup are expired. Full backups older than 30 days are expired. The 30-day window means PITR is possible to any point within the last month.

Audit logs are a special case. After detachment from the partitioned table (beyond the 7-year window), partitions are archived as compressed CSV to long-term cold storage (S3 Glacier Deep Archive) with a 10-year retention. This satisfies compliance requirements without keeping infrequently-accessed data in the operational database.

### 7.3 Recovery Procedures

**Point-in-time recovery**: Restore the most recent full base backup that predates the target recovery time. Replay WAL segments from the backup's LSN to the target LSN. Bring the recovered instance online. Verify data integrity with `pg_verify_checksums`. Promote the recovered instance.

**Object-level recovery** (restore a single dropped table without full PITR): Restore the latest full backup to a temporary instance. Replay WAL to the moment before the table was dropped. Use `pg_dump` to extract just that table. Import into the production database. This is significantly faster than a full PITR for small data loss events.

**Disaster recovery** (complete infrastructure loss): Provision replacement infrastructure via Terraform. Restore the latest full backup to the new PostgreSQL instance. Replay all WAL archives created since that backup. Switch DNS to point to the new infrastructure.

### 7.4 Recovery Testing

Backups are tested monthly. A full recovery is performed in an isolated environment. The recovery process is timed and documented. The recovered database is validated: row counts on critical tables, referential integrity checks, and a suite of application-level smoke tests. A backup that cannot be restored is not a backup — it is a false sense of security.

---

## 8. Performance Optimization

### 8.1 Connection Pooling

PostgreSQL uses a process-per-connection model. Each connection consumes memory (5-10 MB) and incurs scheduling overhead. With hundreds of concurrent API requests, direct connections would exhaust server resources.

PgBouncer sits between the Go API servers and PostgreSQL, maintaining a pool of persistent database connections. The API servers connect to PgBouncer (lightweight, event-driven) rather than PostgreSQL directly. PgBouncer multiplexes hundreds of application connections onto 40–60 PostgreSQL connections.

Configuration:

```ini
[databases]
mr_training = host=localhost port=5432 dbname=mr_training

[pgbouncer]
pool_mode = transaction
default_pool_size = 50
max_client_conn = 500
max_db_connections = 60
server_idle_timeout = 600
client_idle_timeout = 0
```

Transaction pooling (`pool_mode = transaction`) means a connection is assigned to a client only for the duration of a single transaction. Between transactions, the connection returns to the pool. This is the most efficient mode for a web application where requests consist of short-lived transactions.

### 8.2 Query Optimization

**N+1 queries are eliminated at the data access layer.** Repository methods that fetch collections use JOINs or batched queries, not iterative single-row queries. The `GetWorkoutsForAthlete` method fetches all workouts with their exercises and sets in a single query using array aggregation:

```sql
SELECT
    w.*,
    json_agg(json_build_object(
        'id', we.id,
        'exercise', el.*,
        'sets', (
            SELECT json_agg(es.* ORDER BY es.set_number)
            FROM exercise_sets es
            WHERE es.workout_exercise_id = we.id
        )
    ) ORDER BY we.sort_order) AS exercises
FROM workouts w
JOIN workout_exercises we ON we.workout_id = w.id
JOIN exercise_library el ON el.id = we.exercise_id
WHERE w.athlete_id = $1
  AND w.scheduled_date BETWEEN $2 AND $3
GROUP BY w.id
ORDER BY w.scheduled_date;
```

**Pagination uses keyset pagination, not OFFSET.** OFFSET-based pagination scans and discards rows, becoming progressively slower for deeper pages. Keyset pagination uses a `WHERE` clause on the cursor column, always scanning a fixed number of rows:

```sql
-- Keyset pagination (fast, consistent)
SELECT * FROM workouts
WHERE athlete_id = $1
  AND scheduled_date < $2  -- cursor
ORDER BY scheduled_date DESC
LIMIT 20;

-- OFFSET pagination (slow, inconsistent) — NEVER USE
SELECT * FROM workouts
WHERE athlete_id = $1
ORDER BY scheduled_date DESC
LIMIT 20 OFFSET 1000;
```

**EXPLAIN ANALYZE is run on every new query** against production-like data volumes in staging. Queries that scan more than a few thousand rows are investigated. Sequential scans on large tables are flagged and addressed with appropriate indexes.

### 8.3 Materialized Views

Materialized views pre-compute expensive aggregations. They are refreshed on a schedule, not on every write. The analytics dashboard queries materialized views, not the operational tables.

```sql
CREATE MATERIALIZED VIEW mv_coach_performance AS
SELECT
    c.id AS coach_id,
    c.organization_id,
    c.user_id,
    COUNT(DISTINCT aca.athlete_id) AS active_athletes,
    COUNT(DISTINCT w.id) AS total_workouts_assigned,
    COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'completed') AS workouts_completed,
    ROUND(
        COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'completed')::numeric
        / NULLIF(COUNT(DISTINCT w.id), 0) * 100, 2
    ) AS completion_rate_pct,
    ROUND(AVG(w.rpe) FILTER (WHERE w.rpe IS NOT NULL), 1) AS avg_athlete_rpe,
    COUNT(DISTINCT CASE
        WHEN w.updated_at >= now() - INTERVAL '30 days' THEN aca.athlete_id
    END) AS active_athletes_30d,
    ROUND(
        COUNT(DISTINCT CASE
            WHEN w.updated_at >= now() - INTERVAL '30 days' THEN aca.athlete_id
        END)::numeric
        / NULLIF(COUNT(DISTINCT aca.athlete_id), 0) * 100, 2
    ) AS retention_rate_30d_pct
FROM coaches c
LEFT JOIN athlete_coach_assignments aca ON aca.coach_id = c.id AND aca.status = 'active'
LEFT JOIN workouts w ON w.athlete_id = aca.athlete_id AND w.coach_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.organization_id, c.user_id;

CREATE UNIQUE INDEX mv_coach_performance_id ON mv_coach_performance (coach_id);
CREATE INDEX mv_coach_performance_org ON mv_coach_performance (organization_id);
```

Refresh scheduling via pg_cron:

```sql
SELECT cron.schedule(
    'refresh-mv-coach-performance',
    '0 */4 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_coach_performance'
);
```

`CONCURRENTLY` is essential: it refreshes the materialized view without locking it for reads. The dashboard remains available while the refresh runs. The trade-off is that concurrent refresh requires a unique index on the view and takes longer than a non-concurrent refresh.

### 8.4 Caching Layer

Redis caches frequently-read, infrequently-changed data:

- **Session data**: User sessions, with a 24-hour TTL and sliding expiration on activity. Reduces authentication database load.
- **Rate limit counters**: Per-user, per-endpoint counters with a sliding window. Stored in Redis with TTL matching the window duration.
- **Configuration data**: Feature flags, plan definitions, and system settings. Cached with a 5-minute TTL, invalidated by a pub/sub message on update.
- **Computed aggregations**: Coach dashboard summary counts (active athletes, pending reviews, unread messages). Cached with a 60-second TTL, refreshed on write.
- **Leaderboard data**: Challenge rankings, recomputed every 5 minutes and cached. The cost of computing "top 50 athletes by challenge score across 5,000 participants" on every read is avoided.

Cache invalidation follows the write-through pattern for critical data and the TTL-based pattern for non-critical data. The most difficult problem in computer science is naming things and cache invalidation; MR Training errs on the side of shorter TTLs and eventual consistency over cache coherence guarantees that add complexity.

### 8.5 Database Configuration

PostgreSQL configuration tuned for the expected workload:

```ini
# Memory
shared_buffers = '4GB'              # 25% of system RAM on a 16 GB instance
effective_cache_size = '12GB'       # 75% of system RAM
work_mem = '64MB'                   # Per-operation sort memory
maintenance_work_mem = '512MB'      # For VACUUM, CREATE INDEX

# WAL and Checkpoints
wal_level = 'replica'               # Required for WAL archiving (PITR)
max_wal_size = '8GB'
min_wal_size = '2GB'
checkpoint_timeout = '15min'
checkpoint_completion_target = 0.9

# Planner
random_page_cost = 1.1              # SSD storage (default 4.0 is for HDD)
effective_io_concurrency = 200      # SSD concurrent I/O
default_statistics_target = 200     # Increase for better query plans

# Connections
max_connections = 100               # PgBouncer manages most connections

# Autovacuum
autovacuum_max_workers = 4
autovacuum_naptime = '30s'
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.025
```

### 8.6 VACUUM Strategy

PostgreSQL's MVCC (Multi-Version Concurrency Control) means UPDATE and DELETE create new row versions rather than overwriting old ones. Dead tuples accumulate and must be reclaimed by VACUUM. For the MR Training workload — frequent UPDATEs on `workouts` and `athlete_metrics`, frequent DELETEs (soft deletes are UPDATEs) on roster tables — an aggressive autovacuum configuration prevents table bloat.

Tables with exceptionally high churn (`notifications`, `audit_logs` partitions) are vacuumed more aggressively:

```sql
ALTER TABLE notifications SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_limit = 2000
);
```

A weekly `VACUUM ANALYZE` on critical tables is scheduled via pg_cron for Sunday maintenance windows. The `pg_stat_user_tables` view is monitored for dead tuple ratios exceeding 20%, triggering an on-demand VACUUM.

---

*This document defines the foundational data model for MR Training. Every application feature, every API endpoint, and every analytics query will be built against this schema. Changes to this document require a corresponding migration plan, a performance impact assessment, and a review by the database architect before implementation.*
