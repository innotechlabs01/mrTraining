# MR Training — Architecture Audit Report (Phase 0)

## 1. Project Structure

```
mr-training/                          # pnpm monorepo root
├── package.json                      # Root scripts (dev, build, test)
├── pnpm-workspace.yaml               # packages: apps/web, apps/backend, packages/*
├── jest.config.cjs / jest.config.e2e.cjs / test.setup.js
├── .env.example                      # 68 lines, full env reference
├── .github/workflows/ci.yml          # Full CI/CD pipeline (314 lines)
├── docs/                             # 16 spec/architecture docs + MASTER_PROMPT.md
├── apps/
│   ├── web/                          # Next.js 14 + React 18 + Clerk + Turso
│   ├── mobile/                       # Expo 54 + React Native 0.81 + Clerk
│   └── rules/                        # Agent rule files (MASTER_PROMPT.md, etc.)
└── local.db                          # SQLite dev database
```

**No `apps/backend/` directory exists** — the Go backend has been fully deleted/migrated.

---

## 2. Web App (`apps/web`)

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| React | 18.3 |
| Language | TypeScript 5.6 (strict) |
| Styling | Tailwind CSS 3.4 + PostCSS |
| Auth | Clerk v6 (`@clerk/nextjs` ^6.38.3) |
| Database | Turso/LibSQL (`@libsql/client` ^0.17.4) |
| Payments | Polar.sh (`@polar-sh/sdk` ^0.49.0) |
| Storage | Vercel Blob (`@vercel/blob` ^2.8.0) |
| UI | Lucide icons, Framer Motion, Sonner toasts |
| Webhooks | Svix (^1.99.1) |

### Pages/Routes: 47 page.tsx files

### API Routes: 61 route.ts files

### DB Access Pattern: 2,976-line monolith (`coaching-db.ts`)
- ALL DB queries in a single file
- No ORM, no query builder
- Uses `getDB()` which reads `TURSO_URL || DATABASE_URL || file:local.db`

---

## 3. Mobile App (`apps/mobile`)

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 |
| React Native | 0.81 |
| Language | TypeScript 5.9 (strict) |
| Auth | Clerk (`@clerk/clerk-expo` ^2.19.0) |
| Navigation | React Navigation 7 |
| State | React Query (`@tanstack/react-query` ^5) |
| HTTP | Axios |

### Screens: 35 Screen.tsx files across 14 feature domains

### Design Tokens
- Primary: `#FF5C00` (Electric Orange)
- Secondary: `#007AFF` (Velocity Blue)
- Background: `#0A0A0B`
- Surface: `#131315`

---

## 4. Database Schema (40+ tables)

### Core Identity
| Table | Purpose |
|-------|---------|
| `users` | Clerk users (id=email Clerk ID, role, email, name) |
| `coaches` | Extended coach profiles |
| `athlete_profiles` | Extended athlete profiles |
| `coach_athlete_links` | Many-to-many coach↔athlete |
| `pending_invites` | Coach→athlete invitations |

### Coaching Dashboard
| Table | Purpose |
|-------|---------|
| `coach_athletes` | Athlete records per coach (legacy) |
| `time_blocks` | Coach schedule blocks |
| `coach_sessions` | Training sessions |
| `session_athletes` / `session_exercises` | Session junctions |
| `message_threads` / `messages` | Messaging |
| `support_tickets` | Support system |
| `ai_suggestions` | AI coaching |
| `dashboard_metrics` | Analytics |

### Training
| Table | Purpose |
|-------|---------|
| `workout_templates` / `workout_template_exercises` | Templates |
| `assigned_workouts` / `workout_exercises` | Assignments |
| `workout_session_logs` / `workout_set_logs` | Execution logs |
| `exercise_library` | Exercise catalog |

### Events & Payments
| Table | Purpose |
|-------|---------|
| `events` / `event_athletes` / `event_registrations` | Events |
| `plans` / `plan_features` | Subscription plans |
| `products` / `sales` | Product store |
| `athlete_memberships` / `membership_payments` | Membership |

### Health & Community
| Table | Purpose |
|-------|---------|
| `athlete_health_devices` / `athlete_health_metrics` / `athlete_sleep_logs` | Health |
| `community_forums` / `community_messages` | Forums |
| `community_challenges` / `community_challenge_participants` | Challenges |
| `athlete_notifications` / `athlete_favorites` | User features |
| `push_tokens` | Push tokens |
| `blog_posts` / `blog_post_meta` | Blog |

---

## 5. External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Clerk | Auth | Active |
| Turso/LibSQL | Database | Active |
| Polar.sh | Payments | Active |
| Vercel Blob | File storage | Active |
| Vercel | Frontend deploy | Active |
| Expo/EAS | Mobile builds | Active |

---

## 6. Identified Risks

### Critical
1. `coaching-db.ts` is a 2,976-line God File
2. Dual schema problem (coach_athletes vs coach_athlete_links)
3. Stale CI/CD (Go backend jobs reference deleted code)

### High
4. No centralized auth middleware
5. `@ts-nocheck` in coaching-db.ts
6. Mobile hits Vercel production directly (no staging)
7. No shared types between web and mobile
8. DB URL fallback to local file

---

## 7. Recommended Migration Strategy

### Phase 1: Stabilize (Week 1-2)
- Fix stale CI/CD
- Add auth middleware
- Remove @ts-nocheck
- Fix DB URL fallback

### Phase 2: Decompose coaching-db.ts (Week 3-6)
- Split into domain modules
- Extract shared types
- Unify dual schema

### Phase 3: API Layer (Week 6-8)
- Add request validation (Zod)
- Add centralized error handling
- Add OpenAPI documentation

### Phase 4: Go Backend (Week 8+)
- Create apps/api with Go + Fiber
- Implement DDD modular monolith
- Migrate domains progressively
