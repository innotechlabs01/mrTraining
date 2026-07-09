# MR Training — Frontend Architecture

**Version 1.0 — 2026**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Routing](#4-routing)
5. [Server vs Client Components](#5-server-vs-client-components)
6. [State Management](#6-state-management)
7. [Data Fetching](#7-data-fetching)
8. [Authentication](#8-authentication)
9. [Component Architecture](#9-component-architecture)
10. [Styling](#10-styling)
11. [Performance](#11-performance)
12. [Accessibility](#12-accessibility)
13. [Testing Strategy](#13-testing-strategy)
14. [Forms](#14-forms)
15. [Error Boundaries](#15-error-boundaries)

---

## 1. Architecture Overview

### 1.1 Guiding Principles

MR Training's frontend is not a collection of pages. It is a coherent operating system for sports performance — every screen handcrafted, every workflow frictionless, every interaction confident. The architecture is built on three pillars:

**Feature-First Organization.** Code is organized by what it does, not by what it is. A feature directory contains everything that feature needs — components, hooks, API calls, types, state — colocated for cohesion. Developers open one directory and see the entire feature. When a feature is removed, one directory is deleted. No hunting through `pages/`, `components/`, `hooks/`, `utils/` directories scattered across the codebase.

**Clean Architecture on the Frontend.** The frontend mirrors the backend's layered architecture. Pages orchestrate. Features encapsulate domain logic. Components render. Shared code is genuinely shared — not a dumping ground for things two features happen to use. Dependencies point inward: a page depends on features, features depend on shared utilities, shared code depends on nothing feature-specific. The UI layer knows about state management and API calls. State management and API calls know nothing about the UI.

**Server Components by Default.** Every component starts as a Server Component. It becomes a Client Component only when it needs interactivity — event handlers, state, effects, browser APIs. This is not a guideline. It is enforced at the architectural level. The boundary between server and client is intentional, explicit, and documented. Data that can be fetched on the server is fetched on the server. Components that can render on the server render on the server. The client receives HTML, not JSON — unless JSON is what the feature needs.

### 1.2 Layered Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Pages (App Router)                     │
│  Route definitions, layouts, metadata, page composition  │
│  Server Components by default. Thin orchestration only.  │
├──────────────────────────────────────────────────────────┤
│                    Features                              │
│  Feature modules: components, hooks, API, types, state   │
│  Contains all domain-specific logic for a feature.       │
│  Features are self-contained. No cross-feature imports   │
│  without explicit contracts through shared interfaces.   │
├──────────────────────────────────────────────────────────┤
│                 Shared Components                        │
│  Design system atoms, layout primitives, UI patterns     │
│  Purely presentational. No feature knowledge.            │
├──────────────────────────────────────────────────────────┤
│              Shared Hooks / Lib / Types                   │
│  Generic utilities, API client, auth helpers, constants  │
│  Zero feature awareness. Reusable across the app.        │
└──────────────────────────────────────────────────────────┘
```

**Pages** — Each route segment exports a `page.tsx` that composes features and shared components. Pages do not contain business logic. They do not call APIs directly. They do not manage state. A page's entire responsibility is: receive params and searchParams, call feature-level data access, compose layout components, pass data down. If a page file exceeds 80 lines, something is wrong.

**Features** — The application's domain logic lives in feature modules under `src/features/`. A feature module exports a public API through its `index.ts` barrel file — only what other features are allowed to consume. Internal components, hooks, and utilities are not exported. This is intentional encapsulation: changing a feature's internals should never break another feature. Features that need to communicate do so through shared state (Zustand stores), URL parameters, or server-side data — never through direct cross-feature component imports.

**Shared Components** — The design system lives in `src/components/`. These are atoms (Button, Input, Badge), molecules (Card, Dialog, DataTable), and layout primitives (Shell, Sidebar, Header). Shared components know nothing about athletes, workouts, nutrition, or payments. They render what they are told to render. They are the vocabulary of the UI — consistent, composable, and documented in Storybook.

**Shared Utilities** — `src/hooks/`, `src/lib/`, `src/types/` contain genuinely shared code: the API client factory, authentication helpers, date formatting, Zod schemas for shared validation, generic hooks like `useDebounce` or `useMediaQuery`. Nothing in these directories imports from any feature directory.

---

## 2. Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 14+ (App Router) | Server Components, streaming, ISR, middleware, image/font optimization |
| Language | TypeScript | 5.x | Strict mode. No `any`. Explicit return types. |
| UI Library | React | 18+ | Server Components, Suspense, concurrent features |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS with design token integration |
| Component System | shadcn/ui | latest | Radix-based accessible primitives, customizable at source level |
| Animation | Motion (Framer Motion) | 10+ | Declarative animations, layout animations, gesture support |
| Server State | TanStack Query (React Query) | 5.x | Server state cache, optimistic updates, infinite queries, prefetching |
| Client State | Zustand | 4.x | Lightweight, hook-based, no boilerplate. For UI state, not server data. |
| Form Management | React Hook Form | 7.x | Performant form state with minimal re-renders |
| Schema Validation | Zod | 3.x | Type-safe runtime validation, shared between client and server |
| Authentication | Clerk | latest | Session management, social SSO, organization-aware auth |
| Date Handling | date-fns | 3.x | Tree-shakeable date utilities, no moment.js |
| Charts | Recharts | 2.x | Composable charting for analytics dashboards |
| Icons | Lucide React | latest | Consistent icon library, tree-shakeable |
| Tables | TanStack Table | 8.x | Headless table primitives for complex data grids |
| Toast | Sonner | latest | Accessible, customizable toast notifications |
| Testing | Vitest + React Testing Library + Playwright | latest | Unit, component, and E2E testing |
| Error Tracking | Sentry | latest | Frontend error monitoring with source maps |
| Analytics | PostHog | latest | Product analytics with privacy-first approach |
| Package Manager | pnpm | 9.x | Fast, disk-efficient, strict dependency resolution |

### 2.1 Why Next.js App Router Over Pages Router

The App Router is the only choice for a platform targeting millions of users. Server Components eliminate the client-side JavaScript waterfall for data fetching by moving data access to the server — closer to the database, faster to the user. Layouts are persistent across navigations; a sidebar doesn't re-render when the athlete switches from dashboard to workout history. Streaming with Suspense means the page renders progressively — the static shell appears instantly while dynamic content streams in. React Server Components are not a convenience. They are an architectural requirement for performance at scale.

The Pages Router cannot deliver these capabilities. It forces every component to hydrate on the client. It has no native layout persistence. It has no streaming. MR Training does not use it.

### 2.2 Why shadcn/ui Over a Traditional Component Library

shadcn/ui is not a package you install. It is code you own. Components are copied into the project's `src/components/ui/` directory, fully customizable at the source level. There is no black box. No `!important` overrides. No fighting a library's opinionated styles. Every component is built on Radix primitives — headless, accessible, battle-tested UI primitives that handle focus management, keyboard navigation, and ARIA attributes correctly. The result is a design system that feels custom because it is custom — styled with MR Training's design tokens through Tailwind, not through a theme config object that supports 80% of what the design needs.

### 2.3 Why Motion Over CSS Transitions

CSS transitions are state-to-state. Motion is frame-to-frame. The MR Training design philosophy demands that everything moves — nothing appears instantly. Gesture-based interactions (swipe to complete a workout, drag to reorder exercises, pinch to zoom into analytics) require the kind of physics-based animation that CSS can approximate but never match. Motion's `layout` animations automatically animate elements between layout changes — a workout card that moves from "today" to "completed" doesn't snap; it glides. Spring animations feel natural because they model real-world physics. The design documents specify that every transition should feel premium. CSS transitions cannot deliver that.

---

## 3. Project Structure

```
apps/web/
├── public/
│   ├── fonts/                    # Self-hosted fonts (Inter, JetBrains Mono)
│   ├── images/                   # Static images (logos, OG images, favicons)
│   └── icons/                    # PWA icons and manifests
│
├── src/
│   ├── app/                      # Next.js App Router — file-based routing
│   │   ├── (auth)/               # Auth route group (login, register, SSO callback)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── sso-callback/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx        # Auth layout (centered card, no nav)
│   │   │
│   │   ├── (dashboard)/          # Authenticated dashboard route group
│   │   │   ├── layout.tsx        # Dashboard shell (sidebar + header + content)
│   │   │   ├── page.tsx          # Root dashboard (redirects to role default)
│   │   │   ├── training/
│   │   │   │   ├── page.tsx      # Training overview
│   │   │   │   ├── programs/
│   │   │   │   │   ├── page.tsx          # Program list
│   │   │   │   │   ├── [programId]/
│   │   │   │   │   │   ├── page.tsx      # Program detail
│   │   │   │   │   │   ├── edit/
│   │   │   │   │   │   │   └── page.tsx  # Program editor
│   │   │   │   │   │   └── layout.tsx    # Program sub-navigation
│   │   │   │   │   └── create/
│   │   │   │   │       └── page.tsx      # New program wizard
│   │   │   │   └── workouts/
│   │   │   │       ├── page.tsx          # Workout list/calendar
│   │   │   │       └── [workoutId]/
│   │   │   │           ├── page.tsx      # Workout detail
│   │   │   │           └── log/
│   │   │   │               └── page.tsx  # Workout logging interface
│   │   │   │
│   │   │   ├── athletes/
│   │   │   │   ├── page.tsx              # Athlete roster
│   │   │   │   ├── [athleteId]/
│   │   │   │   │   ├── page.tsx          # Athlete profile
│   │   │   │   │   ├── metrics/
│   │   │   │   │   │   └── page.tsx      # Performance metrics
│   │   │   │   │   └── layout.tsx        # Athlete sub-navigation
│   │   │   │   └── create/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── nutrition/
│   │   │   ├── recovery/
│   │   │   ├── community/
│   │   │   ├── events/
│   │   │   ├── analytics/
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx              # Organization settings
│   │   │   │   ├── team/
│   │   │   │   │   └── page.tsx          # Team management
│   │   │   │   └── billing/
│   │   │   │       └── page.tsx          # Subscription & billing
│   │   │   │
│   │   │   └── @modal/                   # Parallel route for modals
│   │   │       ├── default.tsx           # No modal rendered by default
│   │   │       └── (.)workouts/
│   │   │           └── [workoutId]/
│   │   │               └── page.tsx      # Intercepted workout detail modal
│   │   │
│   │   ├── (marketing)/            # Public marketing pages
│   │   │   ├── layout.tsx          # Marketing layout (nav + footer)
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx
│   │   │   ├── features/
│   │   │   │   └── page.tsx
│   │   │   └── blog/
│   │   │       ├── page.tsx
│   │   │       └── [slug]/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (legal)/                # Legal pages (privacy, terms, GDPR)
│   │   │   ├── layout.tsx
│   │   │   ├── privacy/
│   │   │   │   └── page.tsx
│   │   │   └── terms/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                    # Route handlers (API proxy, webhooks)
│   │   │   └── webhooks/
│   │   │       └── clerk/
│   │   │           └── route.ts
│   │   │
│   │   ├── layout.tsx              # Root layout (providers, fonts, metadata)
│   │   ├── not-found.tsx           # Custom 404
│   │   ├── error.tsx              # Global error boundary
│   │   ├── loading.tsx            # Global loading skeleton
│   │   └── globals.css            # Global styles, Tailwind directives, CSS vars
│   │
│   ├── features/                   # Feature modules
│   │   ├── training/
│   │   │   ├── components/
│   │   │   │   ├── ProgramCard.tsx
│   │   │   │   ├── ProgramList.tsx
│   │   │   │   ├── WorkoutLog.tsx
│   │   │   │   ├── ExerciseTimer.tsx
│   │   │   │   ├── PhaseEditor.tsx
│   │   │   │   └── ProgramAssignDialog.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePrograms.ts
│   │   │   │   ├── useWorkouts.ts
│   │   │   │   ├── useWorkoutLog.ts
│   │   │   │   └── useExerciseLibrary.ts
│   │   │   ├── api/
│   │   │   │   ├── programs.ts     # API functions for programs
│   │   │   │   └── workouts.ts     # API functions for workouts
│   │   │   ├── stores/
│   │   │   │   └── workoutLogStore.ts  # Zustand store for workout logging UI
│   │   │   ├── types/
│   │   │   │   └── index.ts        # Feature-specific types (Program, Workout, etc.)
│   │   │   ├── schemas/
│   │   │   │   └── index.ts        # Zod schemas for program/workout forms
│   │   │   ├── utils/
│   │   │   │   └── calculations.ts # RPE, volume, training load calculations
│   │   │   └── index.ts            # Public API barrel export
│   │   │
│   │   ├── athletes/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── types/
│   │   │   ├── schemas/
│   │   │   └── index.ts
│   │   │
│   │   ├── nutrition/
│   │   ├── recovery/
│   │   ├── community/
│   │   ├── events/
│   │   ├── analytics/
│   │   ├── payments/
│   │   ├── ai/
│   │   ├── crm/
│   │   └── communications/
│   │
│   ├── components/                 # Shared UI components (design system)
│   │   ├── ui/                     # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── select.tsx
│   │   │   ├── command.tsx        # cmdk command palette
│   │   │   ├── sheet.tsx          # Slide-over panels
│   │   │   ├── popover.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Shell.tsx           # Main dashboard shell
│   │   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   │   ├── Header.tsx          # Top header
│   │   │   ├── BreadcrumbNav.tsx   # Dynamic breadcrumbs
│   │   │   └── MobileNav.tsx       # Mobile navigation drawer
│   │   ├── data/
│   │   │   ├── DataTable.tsx       # Generic data table wrapper (TanStack Table)
│   │   │   ├── EmptyState.tsx      # Empty state illustrations
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   └── ErrorDisplay.tsx    # Reusable error state component
│   │   ├── feedback/
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   └── AnimatedCounter.tsx
│   │   └── charts/
│   │       ├── LineChart.tsx
│   │       ├── BarChart.tsx
│   │       └── RadarChart.tsx      # Athlete skill radars
│   │
│   ├── hooks/                      # Shared hooks
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useScrollPosition.ts
│   │   ├── useKeyboardShortcut.ts
│   │   └── useFocusTrap.ts
│   │
│   ├── lib/                        # Shared utilities
│   │   ├── api/
│   │   │   ├── client.ts           # Fetch wrapper with auth, error handling, retry
│   │   │   └── server.ts           # Server-side fetch (cookies, no CORS)
│   │   ├── auth/
│   │   │   ├── clerk.ts            # Clerk client helpers
│   │   │   └── permissions.ts      # Client-side permission checks
│   │   ├── utils/
│   │   │   ├── cn.ts               # clsx + tailwind-merge utility
│   │   │   ├── format.ts           # Date, number, duration formatting
│   │   │   └── navigation.ts       # Route helpers, breadcrumb generation
│   │   ├── validators/
│   │   │   └── shared.ts           # Shared Zod schemas (UUID, pagination, etc.)
│   │   └── constants.ts            # App-wide constants
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── api.ts                  # API response wrappers, pagination types
│   │   ├── auth.ts                 # Auth-related types
│   │   └── global.d.ts             # Global type augmentations
│   │
│   └── middleware.ts               # Next.js middleware (auth, redirects, geo)
│
├── components.json                 # shadcn/ui configuration
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── sentry.client.config.ts
├── sentry.server.config.ts
├── postcss.config.js
├── package.json
└── pnpm-lock.yaml
```

### 3.1 Barrel Exports and Encapsulation

Each feature module exports a controlled public API through its `index.ts`:

```typescript
// src/features/training/index.ts
export { ProgramList } from './components/ProgramList';
export { WorkoutLog } from './components/WorkoutLog';
export { usePrograms } from './hooks/usePrograms';
export { useWorkouts } from './hooks/useWorkouts';
export type { Program, Workout, Exercise } from './types';
```

Internal components, hooks, and utilities are not exported. A feature that depends on another feature imports only what the barrel exports, never a deep path like `../../features/training/components/internal/SomeHelper`. This contract means features can be refactored internally without breaking consumers. It also makes the dependency graph explicit and auditable.

### 3.2 Import Aliases

TypeScript path aliases eliminate relative import spaghetti:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@lib/*": ["./src/lib/*"],
      "@types/*": ["./src/types/*"]
    }
  }
}
```

A component in `src/features/training/components/ProgramCard.tsx` imports `@/components/ui/badge` and `@features/athletes/types` — not `../../../components/ui/badge` and `../../athletes/types`. The import path describes what is being imported, not where the importer happens to be.

---

## 4. Routing

### 4.1 App Router Structure

The Next.js App Router maps the file system to URLs. Every `page.tsx` becomes a route. Every `layout.tsx` wraps its children persistently. Every `loading.tsx` and `error.tsx` provides automatic Suspense and error boundaries. This is a design choice: the routing structure should be visually navigable, not hidden behind configuration.

### 4.2 Route Groups

Route groups organize pages without affecting the URL structure. A folder named `(auth)` is a route group — its segments don't appear in the URL.

**(auth)** — Authentication pages (login, register, SSO callback). The auth layout renders a centered card on a branded background — no sidebar, no header, no navigation. It wraps children in an auth context but makes no API calls. If the user is already authenticated, the layout redirects to the dashboard.

**(dashboard)** — Every authenticated page. The dashboard layout renders the application shell: sidebar navigation, top header with user menu, organization switcher, and the content area. The layout is persistent — navigating between `/training/programs` and `/athletes` does not re-render the sidebar. This is achieved through React's layout persistence in the App Router. The dashboard layout also handles organization context — resolving the active organization from the URL or session, and redirecting to organization selection if the user belongs to multiple orgs and hasn't selected one.

**(marketing)** — Public-facing pages. Marketing layout with nav, footer, and analytics tracking. No authentication required. Optimized for SEO with server-rendered content.

**(legal)** — Privacy policy, terms of service, GDPR compliance. Minimal layout. Static content, no JavaScript required. Served from the edge.

### 4.3 Dynamic Routes

Parameterized routes use `[param]` directories. `[programId]` captures a program UUID. `[athleteId]` captures an athlete UUID. The `page.tsx` receives the param through its props, fetches data on the server (or delegates to a client-side query), and renders. Dynamic segments are validated on the server — an invalid UUID in the URL returns a 404, not a cryptic database error.

### 4.4 Parallel Routes

Parallel routes render multiple pages in the same layout simultaneously. The `@modal` parallel route in the dashboard layout enables modal navigation without losing the underlying page state:

```typescript
// src/app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <Shell>
      {children}
      {modal}
    </Shell>
  );
}
```

When a user clicks a workout in the list, the app navigates to `/workouts/[workoutId]`. The workout detail page intercepts this route via `(.)workouts/[workoutId]` and renders inside the `@modal` slot as a dialog overlay. The workout list remains visible behind the modal. The URL reflects the workout detail state. Refreshing the page renders the full workout detail page (not inside a modal) because the parallel route interception only fires on soft navigation. This is the modal pattern that Linear and Vercel use — and MR Training adopts it for detail views, forms, and confirmation flows.

### 4.5 Intercepting Routes

Intercepting routes (`(.)segment`) capture navigation from a specific context and render an alternative view. The modal pattern described above is the primary use case. MR Training also uses intercepting routes for:

- **Quick-create forms** — A coach on the program list clicks "New Program" and a slide-over appears (`@modal/(.)programs/create`) instead of navigating to the full create page.
- **Inline editing** — Editing an exercise within a workout opens the editor in the context of the workout, not as a separate page.
- **Preview panels** — Clicking an athlete's name in the roster opens a preview panel on the side of the screen.

### 4.6 Middleware and Route Protection

Next.js middleware runs on the edge before every request. MR Training's middleware handles:

1. **Authentication gate** — Redirect unauthenticated users to login. Skip for public routes (marketing, legal, auth pages).
2. **Organization resolution** — For authenticated requests, ensure an active organization is selected. Redirect to organization picker if needed.
3. **Role-based redirect** — After login, redirect coaches to `/training/programs`, athletes to `/workouts`, admins to `/analytics`.
4. **Geo redirect** — Redirect to region-specific pricing or locale pages based on `Vercel.geo`.
5. **Security headers** — Inject CSP, HSTS, X-Frame-Options, and other security headers.

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/features',
  '/blog(.*)',
  '/privacy',
  '/terms',
  '/api/webhooks(.*)',
]);

const isAuthRoute = createRouteMatcher([
  '/login',
  '/register',
  '/sso-callback',
]);

export default clerkMiddleware((auth, req) => {
  if (isAuthRoute(req) && auth().userId) {
    return Response.redirect(new URL('/training/programs', req.url));
  }

  if (!isPublicRoute(req) && !auth().userId) {
    return Response.redirect(new URL('/login', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
```

---

## 5. Server vs Client Components

### 5.1 The Boundary

Every component starts as a Server Component. The `"use client"` directive is added only when the component requires:

- Event handlers (`onClick`, `onChange`, `onSubmit`)
- React hooks (`useState`, `useEffect`, `useReducer`, `useRef`)
- Browser APIs (`window`, `document`, `localStorage`, `navigator`)
- Custom hooks that depend on any of the above

A component that only renders data — a workout card, a program detail table, an athlete profile header — is a Server Component. It fetches its data server-side and sends HTML to the client. The component's JavaScript is never sent to the browser. This is the single biggest performance optimization available in React — and MR Training uses it aggressively.

### 5.2 Data Fetching Pattern

Server Components fetch data directly — no `useEffect`, no `useState`, no loading spinners for the initial render:

```typescript
// src/app/(dashboard)/training/programs/page.tsx
import { getPrograms } from '@features/training/api/programs';
import { ProgramList } from '@features/training';
import { auth } from '@clerk/nextjs/server';

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { sport?: string; status?: string; page?: string };
}) {
  const { orgId } = auth();
  const programs = await getPrograms({
    orgId: orgId!,
    sport: searchParams.sport,
    status: searchParams.status,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Programs</h1>
        <CreateProgramButton />
      </div>
      <ProgramFilters />
      <ProgramList programs={programs.data} pagination={programs.pagination} />
    </div>
  );
}
```

The `CreateProgramButton` and `ProgramFilters` are Client Components — they need interactivity. They are leaf components deep in the tree. The page itself remains a Server Component. This pattern — Server Component pages that compose Client Component leaves — is the standard architecture for MR Training.

### 5.3 Streaming

Slow data sources — analytics dashboards that aggregate months of data, AI-generated workout recommendations that call an external service — use Suspense boundaries to stream content progressively:

```typescript
import { Suspense } from 'react';
import { Skeleton } from '@components/ui/skeleton';
import { AthleteMetricsChart } from '@features/athletes/components/AthleteMetricsChart';
import { AIRecommendations } from '@features/ai/components/AIRecommendations';

export default function AthleteDashboard({ params }: { params: { athleteId: string } }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Suspense fallback={<Skeleton className="h-[400px]" />}>
          <AthleteMetricsChart athleteId={params.athleteId} />
        </Suspense>
      </div>
      <div>
        <Suspense fallback={<Skeleton className="h-[400px]" />}>
          <AIRecommendations athleteId={params.athleteId} />
        </Suspense>
      </div>
    </div>
  );
}
```

The page shell renders instantly. The metrics chart streams in 300ms later. The AI recommendations — which may take 2-3 seconds — stream in when ready. The user sees a loading skeleton, not a blank screen. The layout is complete before the data arrives.

### 5.4 Rules for "use client"

1. Client boundaries are pushed as far down the component tree as possible. A page is never marked "use client" unless every single component in it requires interactivity — which is essentially never the case.
2. Client Components can import Server Components only as children (through the `children` prop). They cannot render Server Components directly.
3. Data fetched in a Server Component can be passed as props to Client Components. This is the primary mechanism for getting server data into interactive components.
4. Shared UI components from `src/components/ui/` default to Client Components (they wrap Radix primitives which require interactivity). Layout components that contain interactive elements (Sidebar, Header) are Client Components. Otherwise, they are Server Components.

---

## 6. State Management

### 6.1 State Categories

MR Training classifies all frontend state into four categories. Each category has exactly one tool. Using the wrong tool for a category is a bug caught at code review.

| State Category | Tool | Description |
|---|---|---|
| Server State | TanStack Query | Data that originates on the server and is persisted in the database. Programs, workouts, athletes, nutrition plans. The source of truth is the server. The client holds a cached copy. |
| Client State | Zustand | Ephemeral UI state that does not originate from the server. Active sidebar item, open dialog state, workout log draft, form wizard step. |
| Form State | React Hook Form | The transient state of a form being filled out. Input values, validation errors, dirty status, submission state. |
| URL State | searchParams / useSearchParams | State that should survive a page refresh and be shareable. Filter selections, sort order, pagination page, selected tab. |

### 6.2 Server State — TanStack Query

TanStack Query is the cache layer between the UI and the API. Every GET request goes through a query. Every mutation goes through a mutation. The query client handles caching, background refetching, optimistic updates, and cache invalidation. No component manages loading, error, or data state manually. No component writes `const [data, setData] = useState(null)`. No component writes `useEffect(() => { fetch(...) }, [])`.

```typescript
// src/features/training/hooks/usePrograms.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrograms, createProgram, deleteProgram } from '../api/programs';
import type { CreateProgramInput } from '../types';

export function usePrograms(params: {
  orgId: string;
  sport?: string;
  status?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ['programs', params],
    queryFn: () => getPrograms(params),
    staleTime: 30 * 1000, // 30 seconds before background refetch
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProgramInput) => createProgram(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}
```

The `queryKey` is the identity of the data. When the key changes — different sport filter, different page — the query refetches. The `staleTime` prevents unnecessary refetches: navigating away and back within 30 seconds doesn't trigger a network request. Mutations invalidate related queries, triggering automatic refetch of stale data.

### 6.3 Optimistic Updates

For high-frequency actions that should feel instant — marking a workout as complete, toggling a favorite, reordering exercises — TanStack Query supports optimistic updates:

```typescript
export function useCompleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workoutId, data }: { workoutId: string; data: CompleteWorkoutInput }) =>
      completeWorkout(workoutId, data),

    onMutate: async ({ workoutId }) => {
      await queryClient.cancelQueries({ queryKey: ['workouts'] });
      const previousWorkouts = queryClient.getQueryData(['workouts']);
      queryClient.setQueryData(['workouts'], (old: Workout[]) =>
        old.map((w) => (w.id === workoutId ? { ...w, status: 'completed' } : w))
      );
      return { previousWorkouts };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['workouts'], context?.previousWorkouts);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}
```

The UI updates immediately — the workout card flips to "completed" before the server responds. If the server call fails, the mutation rolls back to the previous state. This pattern is used for every action where the user expects instant feedback. In a sports performance platform where athletes log multiple workouts per day, the difference between a 200ms spinner and an instant response compounds into a dramatically different user experience.

### 6.4 Infinite Queries

Feeds — community activity, athlete notifications, workout history — use TanStack Query's `useInfiniteQuery` for cursor-based pagination with "load more" buttons or intersection-observer-based infinite scroll:

```typescript
export function useWorkoutHistory(athleteId: string) {
  return useInfiniteQuery({
    queryKey: ['workouts', 'history', athleteId],
    queryFn: ({ pageParam }) =>
      getWorkoutHistory(athleteId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}
```

### 6.5 Client State — Zustand

Zustand stores manage UI state that doesn't belong to the server. A store is created for a specific concern — never a global "app state" store:

```typescript
// src/features/training/stores/workoutLogStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExerciseLogEntry {
  exerciseId: string;
  sets: { reps: number; weight: number; rpe: number }[];
  notes: string;
}

interface WorkoutLogState {
  workoutId: string | null;
  exercises: ExerciseLogEntry[];
  currentExerciseIndex: number;
  isTimerRunning: boolean;
  startWorkout: (workoutId: string, exercises: ExerciseLogEntry[]) => void;
  logSet: (reps: number, weight: number, rpe: number) => void;
  nextExercise: () => void;
  toggleTimer: () => void;
}

export const useWorkoutLogStore = create<WorkoutLogState>()(
  persist(
    (set, get) => ({
      workoutId: null,
      exercises: [],
      currentExerciseIndex: 0,
      isTimerRunning: false,
      startWorkout: (workoutId, exercises) =>
        set({ workoutId, exercises, currentExerciseIndex: 0 }),
      logSet: (reps, weight, rpe) => {
        const { exercises, currentExerciseIndex } = get();
        const updated = [...exercises];
        updated[currentExerciseIndex].sets.push({ reps, weight, rpe });
        set({ exercises: updated });
      },
      nextExercise: () =>
        set((s) => ({ currentExerciseIndex: s.currentExerciseIndex + 1 })),
      toggleTimer: () => set((s) => ({ isTimerRunning: !s.isTimerRunning })),
    }),
    { name: 'workout-log' }
  )
);
```

The workout log store persists to localStorage so an athlete's in-progress workout survives a browser crash or accidental navigation. This is critical: an athlete who loses 45 minutes of workout data because they accidentally swiped back will never trust the platform again. Zustand's `persist` middleware handles this with one line of configuration.

### 6.6 URL State — searchParams

Filter selections, sort order, and pagination state live in URL search parameters. A coach filters programs by sport type and the URL becomes `/training/programs?sport=running&status=active&page=2`. This URL is shareable — the coach can send it to another coach and they see the exact same view. The browser back button undoes filter changes naturally because each filter change is a navigation.

```typescript
// src/features/training/components/ProgramFilters.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function ProgramFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset page on filter change
    router.push(`/training/programs?${params.toString()}`);
  };

  return (
    <div className="flex gap-3">
      <Select
        value={searchParams.get('sport') ?? ''}
        onValueChange={(v) => updateFilter('sport', v)}
      >
        {/* sport options */}
      </Select>
      <Select
        value={searchParams.get('status') ?? ''}
        onValueChange={(v) => updateFilter('status', v)}
      >
        {/* status options */}
      </Select>
    </div>
  );
}
```

---

## 7. Data Fetching

### 7.1 Server-Side Fetching

Server Components fetch data directly using the server-side fetch client. This client reads authentication cookies from the request, attaches the organization context, and calls the API server — all without exposing credentials to the browser:

```typescript
// src/lib/api/server.ts
import { auth } from '@clerk/nextjs/server';
import { cookies, headers } from 'next/headers';

const API_BASE = process.env.API_URL!;

export async function serverFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const { getToken } = auth();
  const token = await getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Organization-ID': cookies().get('x-org-id')?.value ?? '',
      ...options?.headers,
    },
    // Next.js extends fetch with automatic request deduplication
    // and caching via next.revalidate and next.tags
  });

  if (!res.ok) {
    throw new ServerFetchError(res.status, await res.text());
  }

  return res.json();
}
```

Server Components use this client in their body. The fetch call executes at request time on the server. Next.js deduplicates identical fetch requests made by multiple components in the same render pass — if both the page and a deeply nested component fetch the same workout data, only one HTTP request is made to the API.

### 7.2 Client-Side Fetching

Client Components fetch data through TanStack Query, which uses the client-side fetch wrapper:

```typescript
// src/lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export async function clientFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Send httpOnly cookies
  });

  if (res.status === 401) {
    // Redirect to login or refresh token
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(res.status, error);
  }

  return res.json();
}
```

The client fetch is never called from a Server Component — Server Components use `serverFetch`. The boundary is enforced through imports: `@lib/api/server` is only imported in Server Components (files without "use client"). `@lib/api/client` is only imported in Client Components and TanStack Query hooks. Importing `server.ts` in a Client Component causes a build error because `cookies()` and `headers()` are server-only APIs.

### 7.3 Prefetching

TanStack Query's `prefetchQuery` and `HydrationBoundary` enable server-side prefetching for critical data. The page prefetches data on the server, dehydrates the query client, sends it to the browser, and the client hydrates with the data already in cache. The user never sees a loading state for prefetched data:

```typescript
// src/app/(dashboard)/training/programs/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getPrograms } from '@features/training/api/programs';
import { ProgramList } from '@features/training';

export default async function ProgramsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['programs', { page: 1 }],
    queryFn: () => getPrograms({ page: 1 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProgramList />
    </HydrationBoundary>
  );
}
```

This is the best of both worlds: the initial render happens on the server with real data, and subsequent interactions use client-side TanStack Query with all its caching, background refetching, and optimistic update capabilities.

### 7.4 Revalidation and Cache Tags

For data that changes infrequently — exercise library, public blog posts, landing page content — Next.js's built-in fetch caching is used with time-based revalidation and on-demand tag-based revalidation:

```typescript
// Server Component revalidates every hour
const exercises = await fetch(`${API_BASE}/exercises`, {
  next: { revalidate: 3600, tags: ['exercises'] },
});
```

When a coach adds a new exercise to the library, a server action or API call triggers `revalidateTag('exercises')`, which purges the cache for all pages using that tag. This approach eliminates the need for client-side data fetching for static-like content while ensuring freshness when data changes.

---

## 8. Authentication

### 8.1 Clerk Integration

Authentication is handled entirely by Clerk. The application never stores passwords, implements password reset, or manages multi-factor authentication. Clerk owns the authentication lifecycle. MR Training integrates Clerk at three levels:

**Middleware** — `clerkMiddleware` runs on every request, validates the session token, and injects the user's identity into the request context. Unauthenticated requests to protected routes are redirected to login.

**Server Components** — `auth()` from `@clerk/nextjs/server` provides the user's ID, session claims, and organization membership. Server Components call this synchronously in their body:

```typescript
const { userId, orgId, sessionClaims } = auth();
if (!userId || !orgId) redirect('/login');
```

**Client Components** — `useAuth()` and `useUser()` from `@clerk/nextjs` provide the same data on the client, with loading states for the initial session verification. Client Components that need auth data use these hooks — never prop-drill user data from Server Components.

### 8.2 Organization-Aware Authorization

MR Training is multi-tenant. A coach belongs to an organization. An athlete belongs to an organization. Every API request carries the active organization ID. The middleware resolves the organization from three sources, in order of priority:

1. `X-Organization-ID` header (set by the organization switcher)
2. `x-org-id` cookie (persisted across sessions)
3. Default to the user's primary organization

The organization context is available in every Server Component through `auth().orgId` and in every Client Component through `useAuth().orgId`. API calls attach it automatically through the fetch wrappers. A component never manually manages organization context — it is ambient state injected by the framework.

### 8.3 Role-Based Route Guards

Role-based access is enforced at three levels:

**Middleware** — Coarse-grained routing: athletes cannot access coach-only routes (`/training/programs/create`, `/athletes/create`). The middleware checks the user's role from the session claims and redirects unauthorized access.

**Layout** — Route group layouts verify that the current user's role is compatible with the route group. The dashboard layout checks `sessionClaims.metadata.role` and renders an unauthorized state for incompatible roles.

**Component** — Fine-grained feature gating: a "Delete Program" button is rendered only if the user has the `training.programs.delete` permission. A "Billing" navigation item appears only for organization admins. Permission checks use a declarative component:

```typescript
// src/components/auth/Can.tsx
import { useAuth } from '@clerk/nextjs';

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { sessionClaims } = useAuth();
  const permissions = (sessionClaims?.metadata as any)?.permissions ?? [];

  if (!permissions.includes(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

Usage:

```tsx
<Can permission="training.programs.delete">
  <DeleteProgramButton programId={program.id} />
</Can>
```

Permission strings match the backend's RBAC permissions exactly. The same `RolePermissions` map used by the Go backend serves as the source of truth — a script generates the client-side permission constants from the backend definition to prevent drift.

### 8.4 Session Management

Clerk manages session tokens as httpOnly, Secure, SameSite=Lax cookies. The client never accesses the raw token. TanStack Query's `onError` handler detects 401 responses and redirects to login. The `useAuth()` hook provides a `signOut()` method for explicit logout. Session expiry is handled by Clerk's token rotation — short-lived access tokens (1 hour) with automatic silent refresh via Clerk's frontend API.

---

## 9. Component Architecture

### 9.1 Atomic Design

Components are organized following atomic design, but the terminology is simplified for practicality:

**Atoms** (`src/components/ui/`) — The smallest building blocks. Button, Input, Label, Badge, Avatar, Icon, Skeleton. Atoms are imported from shadcn/ui and customized with MR Training's design tokens. They have no dependencies on other components except each other (a Button can contain an Icon). Atoms never know about domain concepts — a Button does not know it triggers "Create Program." It knows it fires `onClick`.

**Molecules** (`src/components/`) — Compositions of atoms that form a distinct UI unit. Card, Dialog, DropdownMenu, Tabs, DataTable, Command (search palette), Sheet (slide-over). Molecules compose atoms and add behavior — a Dialog composes a Button, an overlay, and a content container, managing open/close state and focus trapping. Molecules are still domain-agnostic — a Card renders whatever children it receives, never "Program Card" specifically.

**Organisms** (`src/features/*/components/`) — Feature-specific compositions of molecules and atoms. ProgramCard, WorkoutLog, AthleteProgressTimeline, MealPlanGrid. Organisms live inside feature directories because they embody domain knowledge. A ProgramCard knows what a program is, which fields to display, what actions are available. It composes Card, Badge, Button, and Avatar from the shared molecule/atom layer.

**Templates** (`src/app/(dashboard)/layout.tsx`, page files) — Page-level compositions that arrange organisms into a complete screen. Templates handle layout, routing, and data orchestration. They are typically Server Components that fetch data and pass it to organism components.

### 9.2 Compound Components

Compound components provide a flexible API for complex UI patterns. A compound component exposes a parent that manages shared state and children that tap into that state through context. This pattern is used for components where the consumer needs control over the rendered structure:

```typescript
// src/components/data/DataTable.tsx
import { createContext, useContext } from 'react';

interface DataTableContextValue<T> {
  data: T[];
  columns: ColumnDef<T>[];
  selection: Record<string, boolean>;
  onSelectionChange: (id: string, selected: boolean) => void;
}

const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

function Root<T>({ data, columns, children, onSelectionChange }: DataTableProps<T>) {
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  return (
    <DataTableContext.Provider
      value={{ data, columns, selection, onSelectionChange: setSelection }}
    >
      <div className="w-full overflow-auto">
        <table className="w-full">{children}</table>
      </div>
    </DataTableContext.Provider>
  );
}

function Header() { /* renders column headers */ }
function Body() { /* renders rows */ }
function Row({ id, children }: { id: string; children: React.ReactNode }) { /* selectable row */ }
function Cell({ children }: { children: React.ReactNode }) { /* table cell */ }
function Toolbar({ children }: { children: React.ReactNode }) { /* bulk action toolbar */ }

export const DataTable = {
  Root,
  Header,
  Body,
  Row,
  Cell,
  Toolbar,
};
```

Usage:

```tsx
<DataTable.Root data={programs} columns={columns}>
  <DataTable.Toolbar>
    <DeleteSelectedButton />
  </DataTable.Toolbar>
  <DataTable.Header />
  <DataTable.Body>
    {(row) => (
      <DataTable.Row id={row.id}>
        <DataTable.Cell>{row.name}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.status} /></DataTable.Cell>
        <DataTable.Cell>{formatDate(row.startDate)}</DataTable.Cell>
      </DataTable.Row>
    )}
  </DataTable.Body>
</DataTable.Root>
```

### 9.3 Render Props

Render props are used sparingly — only when the composition model requires the consumer to control rendering based on internal state. The DataTable above uses a render prop for body rows because the consumer needs to define what each cell renders. This is a deliberate choice: the alternative — passing a `renderCell` function in the column definition — couples the rendering logic to the column configuration, which is harder to read and harder to type correctly.

---

## 10. Styling

### 10.1 Tailwind CSS with Design Tokens

MR Training uses Tailwind CSS as the styling engine, extended with design tokens from the design system. The Tailwind configuration maps design tokens to utility classes:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
} satisfies Config;
```

### 10.2 CSS Variables for Theming

All design tokens are defined as CSS custom properties in `globals.css`. This enables runtime theming — including dark mode — without JavaScript class swapping for every style:

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --primary: 142 76% 36%;
    --primary-foreground: 355 100% 97%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --success: 142 76% 36%;
    --success-foreground: 355 100% 97%;
    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 89%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 142 76% 36%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 20 14.3% 4.1%;
    --foreground: 0 0% 95%;
    --primary: 142 69% 43%;
    --primary-foreground: 144 17% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 15%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 12 6.5% 15.1%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 85.7% 97.3%;
    --success: 142 69% 43%;
    --success-foreground: 144 17% 10%;
    --warning: 35 92% 47%;
    --warning-foreground: 25 80% 20%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 142 69% 43%;
  }
}
```

Colors are defined in HSL with space-separated values — this format is required by shadcn/ui's theming system and enables opacity modifiers (e.g., `bg-primary/80` for 80% opacity). The green primary palette aligns with MR Training's brand guidelines (growth, energy, performance), while the dark mode palette is a warm-toned neutral scheme that reduces eye strain during early-morning and late-night training sessions.

### 10.3 Utility-First Styling

Every component is styled with Tailwind utility classes. The `cn()` utility merges Tailwind classes with conditional classes, handling conflicts correctly:

```typescript
// src/lib/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Components accept a `className` prop that is merged at the root element, enabling consumers to extend styles without breaking encapsulation:

```tsx
<Button className="w-full" variant="primary">Create Program</Button>
```

### 10.4 Dark Mode

Dark mode uses the Tailwind `class` strategy — a `.dark` class on the `<html>` element toggles the theme. The `next-themes` library provides the `ThemeProvider` that manages the class, persists the preference to localStorage, and respects the system preference (`prefers-color-scheme`). The provider wraps the root layout:

```tsx
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 11. Performance

### 11.1 Core Web Vitals Targets

| Metric | Target | Measurement |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | All pages. Server-side rendering + streaming achieves < 1.5s for most pages. |
| INP (Interaction to Next Paint) | < 200ms | All interactions. shadcn/ui's Radix primitives are optimized for low interaction latency. |
| CLS (Cumulative Layout Shift) | < 0.1 | All pages. Server-side rendering eliminates layout shift from async data loading. Image dimensions are always explicit. |
| FCP (First Contentful Paint) | < 1.8s | All pages. Font self-hosting, critical CSS inlining, and edge middleware contribute to fast FCP. |
| TTFB (Time to First Byte) | < 800ms | Server-rendered pages. API responses cached at edge where possible. |

### 11.2 Code Splitting

Dynamic imports split the JavaScript bundle along route and feature boundaries:

```typescript
import dynamic from 'next/dynamic';

const WorkoutLog = dynamic(
  () => import('@features/training/components/WorkoutLog'),
  {
    loading: () => <Skeleton className="h-[600px]" />,
    ssr: false, // WorkoutLog uses browser APIs (timers, audio)
  }
);

const AthleteMetricsChart = dynamic(
  () => import('@features/athletes/components/AthleteMetricsChart'),
  { loading: () => <Skeleton className="h-[400px]" /> }
);
```

Heavy components — the workout logging interface (timers, audio cues, complex form state), the analytics charting library (Recharts), the rich text editor for program descriptions (TipTap), the video player for exercise demonstrations — are loaded only when the user navigates to the relevant page. The initial bundle is under 150KB gzipped.

### 11.3 Image Optimization

`next/image` provides automatic WebP/AVIF conversion, responsive sizes, lazy loading, and blur-up placeholders:

```tsx
import Image from 'next/image';
import exerciseVideoPoster from '@/public/images/exercise-placeholder.jpg';

<Image
  src={exercise.thumbnailUrl}
  alt={exercise.name}
  width={400}
  height={300}
  className="rounded-lg object-cover"
  placeholder="blur"
  blurDataURL={exercise.blurDataURL}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

All images pass through Next.js's image optimization pipeline. Remote images from the S3 media bucket are configured in `next.config.js` under `images.remotePatterns`. No raw `<img>` tags exist in the application — every image uses `<Image>` or the equivalent `next/future/image` pattern.

### 11.4 Font Optimization

Fonts are self-hosted using `next/font`. Inter is the primary UI font. JetBrains Mono is used for code-like displays (RPE scales, workout timers). Neither font loads from Google Fonts — they are bundled at build time and served from the same origin:

```typescript
// src/app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});
```

`next/font` subsets the fonts to only the characters used, generates a size-adjusted fallback font to eliminate CLS, and inlines the font CSS at build time. Network waterfalls for font loading do not exist in production.

### 11.5 Bundle Analysis

`@next/bundle-analyzer` generates a treemap visualization of the JavaScript bundles. This runs on every CI build for the production branch and fails the build if any route's bundle exceeds 200KB gzipped (initial JS). The bundle analysis is a blocking check — not a dashboard that accumulates warnings.

### 11.6 Animation Performance

Motion animations use CSS transforms and opacity exclusively — properties that the browser can composite on the GPU without triggering layout or paint:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>
  {children}
</motion.div>
```

Layout animations (`layout` prop) animate elements between positions without layout thrashing. The `will-change` property is used judiciously for elements that animate frequently — workout timers, progress bars, animated counters. Animations are disabled when `prefers-reduced-motion` is active:

```tsx
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
>
```

---

## 12. Accessibility

### 12.1 WCAG 2.1 AA Compliance

Every component is built to meet WCAG 2.1 AA standards. shadcn/ui's Radix primitives provide the foundation — focus management, keyboard navigation, ARIA attributes, and screen reader announcements are built in. The application layer adds semantic structure, color contrast, and responsive design for accessibility.

### 12.2 Semantic HTML

The component hierarchy mirrors the document outline. Pages use one `<h1>`. Section headings use `<h2>` and `<h3>` in logical order. Navigation uses `<nav>`. Interactive elements use `<button>`, not `<div onClick>`. Tables use `<table>`, `<thead>`, `<tbody>`, `<th>` with proper `scope` attributes. Lists use `<ul>`/`<ol>` with `<li>`. Forms use `<form>`, `<label htmlFor>`, and proper fieldset/legend groupings.

### 12.3 Keyboard Navigation

All interactive elements are keyboard accessible. Tab order follows visual layout. Focus is never trapped except in modals and dialogs (where it should be). Skip-to-content links appear on first tab. Custom keyboard shortcuts use `Cmd+K` for the command palette, `Escape` to close dialogs and sheets. The `useKeyboardShortcut` hook registers global and scoped shortcuts:

```typescript
export function useKeyboardShortcut(
  keys: { key: string; metaKey?: boolean; ctrlKey?: boolean },
  callback: () => void,
  scope?: 'global' | 'dialog'
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === keys.key &&
        !!e.metaKey === !!keys.metaKey &&
        !!e.ctrlKey === !!keys.ctrlKey
      ) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keys, callback]);
}
```

### 12.4 Focus Management

Focus is programmatically managed for dynamic content. Opening a dialog moves focus to the first focusable element. Closing a dialog returns focus to the trigger. Navigating to a new page moves focus to the `<h1>` (via a route change announcement). The `useFocusTrap` hook confines focus within modals for screen reader and keyboard users.

### 12.5 Screen Reader Announcements

Dynamic content changes — workout completed, program published, athlete added — are announced to screen readers through a live region:

```tsx
// src/components/feedback/LiveRegion.tsx
'use client';

import { useEffect, useRef } from 'react';

export function LiveRegion({ message, 'aria-live': ariaLive = 'polite' }: {
  message: string;
  'aria-live'?: 'polite' | 'assertive';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = '';
      // Force re-announcement by clearing and resetting
      setTimeout(() => {
        if (ref.current) ref.current.textContent = message;
      }, 50);
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={ariaLive}
      className="sr-only"
    />
  );
}
```

The component is rendered once in the root layout. Features announce status changes by updating a Zustand store that the `LiveRegion` subscribes to. A workout completion triggers `announce('Workout completed. Great work!')`. The announcement is spoken by screen readers without visual clutter.

### 12.6 Color Contrast and Focus Indicators

All text meets a minimum contrast ratio of 4.5:1 (AA) for normal text and 3:1 (AA) for large text. Focus indicators are visible — shadcn/ui's default focus ring (`ring-2 ring-ring ring-offset-2`) is used throughout. The ring color uses the `--ring` CSS variable, which is the brand green in light mode and a slightly brighter green in dark mode for adequate contrast against dark backgrounds.

---

## 13. Testing Strategy

### 13.1 Unit Tests — Vitest

Pure functions — date formatting, volume calculations, permission checks, Zod schema validations — are unit tested with Vitest. Unit tests live alongside the code they test, in `__tests__` directories or co-located `.test.ts` files:

```typescript
// src/features/training/utils/__tests__/calculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateVolume, calculateEstimatedOneRM } from '../calculations';

describe('calculateVolume', () => {
  it('returns total weight lifted across all sets', () => {
    const sets = [
      { reps: 10, weight: 100 },
      { reps: 8, weight: 110 },
      { reps: 6, weight: 120 },
    ];
    expect(calculateVolume(sets)).toBe(1000 + 880 + 720); // 2600
  });

  it('returns 0 for empty sets', () => {
    expect(calculateVolume([])).toBe(0);
  });
});

describe('calculateEstimatedOneRM', () => {
  it('calculates Epley formula correctly', () => {
    // Epley: weight * (1 + reps / 30)
    expect(calculateEstimatedOneRM(100, 10)).toBeCloseTo(133.33, 1);
  });

  it('returns weight for 1 rep', () => {
    expect(calculateEstimatedOneRM(200, 1)).toBe(200);
  });
});
```

Unit tests cover: domain calculations (RPE, volume, training load, 1RM estimation), permission logic, date formatting and manipulation, Zod schema validations (both success and error paths), URL construction and parameter parsing, hook return values (via `@testing-library/react-hooks`).

### 13.2 Component Tests — React Testing Library

Component tests verify behavior from the user's perspective. Tests interact with the rendered component through accessible queries (role, label, text) and assert on visible output — never on internal state or implementation details:

```typescript
// src/features/training/components/__tests__/ProgramCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgramCard } from '../ProgramCard';

const mockProgram = {
  id: '123',
  name: 'Marathon Prep',
  sportType: 'running',
  status: 'active',
  athleteCount: 12,
  startDate: '2026-01-01',
  endDate: '2026-04-15',
};

describe('ProgramCard', () => {
  it('renders program name and sport type', () => {
    render(<ProgramCard program={mockProgram} />);
    expect(screen.getByText('Marathon Prep')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('displays athlete count', () => {
    render(<ProgramCard program={mockProgram} />);
    expect(screen.getByText('12 athletes')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(<ProgramCard program={mockProgram} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('123');
  });
});
```

Components are tested in isolation with mocked API calls and context providers. The `render` wrapper includes the necessary providers (QueryClient, Clerk, Theme) through a shared `test-utils.tsx`:

```typescript
// src/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/nextjs';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function customRender(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render };
```

### 13.3 E2E Tests — Playwright

Playwright tests verify critical user flows end-to-end against a staging deployment. These are the "happy path" tests that ensure the application works for real users:

- **Coach creates and publishes a program** — Login → Navigate to programs → Create → Fill form → Add phases → Assign athletes → Publish → Verify program appears in list
- **Athlete logs a workout** — Login → View today's workout → Start workout → Log sets → Complete workout → Verify confirmation
- **Athlete checks progress dashboard** — Login → Navigate to metrics → Verify charts load with data
- **Coach reviews a completed workout** — Login → Navigate to pending reviews → Open workout → Add feedback → Submit review → Verify status change
- **Organization admin manages team** — Login → Navigate to settings → Team → Invite coach → Verify invitation sent

Playwright tests run in CI on every PR against a staging environment. They use the `playwright.config.ts` with projects for Chromium, Firefox, and Safari (mobile viewport):

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14 Pro'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 14. Forms

### 14.1 React Hook Form + Zod

Every form in MR Training uses React Hook Form for state management and Zod for schema validation. The integration is tight — Zod schemas define the shape and validation rules, and React Hook Form's `zodResolver` wires them into the form:

```typescript
// src/features/training/schemas/index.ts
import { z } from 'zod';

export const createProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(255),
  description: z.string().max(2000).optional(),
  sportType: z.enum(['gym', 'running', 'tennis', 'swimming', 'cycling', 'crossfit']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  phases: z.array(
    z.object({
      name: z.string().min(1, 'Phase name is required'),
      description: z.string().optional(),
      weekStart: z.number().int().min(1),
      weekEnd: z.number().int().min(1),
    })
  ).min(1, 'At least one phase is required'),
  athleteIds: z.array(z.string().uuid()).min(1, 'Assign at least one athlete'),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
```

```typescript
// src/features/training/components/ProgramForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProgramSchema, type CreateProgramInput } from '../schemas';
import { useCreateProgram } from '../hooks/usePrograms';

export function ProgramForm() {
  const createProgram = useCreateProgram();

  const form = useForm<CreateProgramInput>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: '',
      sportType: 'gym',
      phases: [{ name: '', weekStart: 1, weekEnd: 4 }],
      athleteIds: [],
    },
  });

  const onSubmit = (data: CreateProgramInput) => {
    createProgram.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program Name</FormLabel>
              <FormControl>
                <Input placeholder="Marathon Prep - Spring 2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sportType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sport Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="tennis">Tennis</SelectItem>
                  <SelectItem value="swimming">Swimming</SelectItem>
                  <SelectItem value="cycling">Cycling</SelectItem>
                  <SelectItem value="crossfit">CrossFit</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date pickers, phase editor, athlete selector... */}

        <Button type="submit" disabled={createProgram.isPending}>
          {createProgram.isPending ? 'Creating...' : 'Create Program'}
        </Button>
      </form>
    </Form>
  );
}
```

### 14.2 Field Arrays

Dynamic form sections — workout exercises (variable number), program phases (variable number), meal plan days — use React Hook Form's `useFieldArray`:

```typescript
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'phases',
});

{fields.map((field, index) => (
  <div key={field.id} className="flex gap-4 items-start">
    <FormField
      control={form.control}
      name={`phases.${index}.name`}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input placeholder="Phase name" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button variant="ghost" size="icon" onClick={() => remove(index)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
))}

<Button
  variant="outline"
  onClick={() => append({ name: '', weekStart: 1, weekEnd: 4 })}
>
  Add Phase
</Button>
```

### 14.3 Multi-Step Forms

Complex workflows — program creation wizard, athlete onboarding — are split into steps using a Zustand-managed step index. Each step is its own form section. Progress is persisted to prevent data loss. The step validation is partial — a step's fields are validated in isolation, and the full schema is validated only on final submission.

### 14.4 Async Validation

Fields that require server-side validation — unique program names within an organization, valid athlete email addresses — use React Hook Form's async validation through Zod's `refine` with asynchronous checks:

```typescript
const programNameSchema = z.string().refine(
  async (name) => {
    const { exists } = await checkProgramNameUnique(name, orgId);
    return !exists;
  },
  { message: 'A program with this name already exists' }
);
```

Async validation is debounced (300ms) to avoid flooding the server on every keystroke.

---

## 15. Error Boundaries

### 15.1 Error Boundary Hierarchy

Error boundaries isolate failures so that an error in one feature doesn't crash the entire application. MR Training uses a hierarchical error boundary strategy:

```
┌─────────────────────────────────────────┐
│           Global Error Boundary          │
│  Catches uncaught errors across the app  │
│  Renders: "Something went wrong" + CTA   │
├─────────────────────────────────────────┤
│           Route Group Error Boundaries   │
│  (auth), (dashboard), (marketing) each   │
│  have their own boundary. A dashboard    │
│  error doesn't crash the marketing site. │
├─────────────────────────────────────────┤
│           Feature Error Boundaries       │
│  Training, Athletes, Nutrition each have │
│  a boundary. An analytics chart error    │
│  doesn't prevent logging a workout.      │
└─────────────────────────────────────────┘
```

Next.js's file-based error boundaries (`error.tsx`) handle the route group level:

```typescript
// src/app/(dashboard)/error.tsx
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@components/ui/button';
import { Shell } from '@components/layout/Shell';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Shell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </Shell>
  );
}
```

### 15.2 Feature-Level Error Boundaries

Feature-level boundaries are implemented as React error boundary class components (the App Router's `error.tsx` only works at the route segment level):

```typescript
// src/components/feedback/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  feature?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      tags: { feature: this.props.feature },
      contexts: { react: { componentStack: info.componentStack } },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This section encountered an error. The rest of the page is still functional.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

```tsx
// Usage in a page
<ErrorBoundary feature="training.analytics" fallback={<AnalyticsErrorFallback />}>
  <AthleteMetricsChart athleteId={params.athleteId} />
</ErrorBoundary>
```

### 15.3 Error Reporting — Sentry

Sentry captures both server-side and client-side errors with full context — user ID, organization ID, route, browser, and a replay of what led to the error. The Sentry configuration separates server and client initialization (different DSNs, different environments) and filters out known non-actionable errors (network failures during navigation, hydration mismatches from browser extensions):

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  beforeSend(event) {
    // Filter known false positives
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') return null;
    return event;
  },
});
```

### 15.4 Graceful Degradation

When a feature boundary catches an error, the feature degrades gracefully. An analytics chart that fails to render shows a "Could not load chart" placeholder with a retry button — it doesn't crash the sidebar, the header, or the workout list. A data table that fails to load shows an error state with the table headers still visible — the user retains spatial context. This principle is fundamental: partial failures should never become total failures.

---

**End of Frontend Architecture — Version 1.0**
