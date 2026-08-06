# MR Training — Mobile Architecture (React Native)

**Version 1.0 — 2026**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Clean Architecture Layers](#4-clean-architecture-layers)
5. [API Integration](#5-api-integration)
6. [Authentication](#6-authentication)
7. [Navigation](#7-navigation)
8. [Offline Support](#8-offline-support)
9. [Video Streaming](#9-video-streaming)

---

## 1. Architecture Overview

### 1.1 Guiding Principles

The mobile app is NOT a separate backend. It is a client that consumes the SAME Next.js API routes (`/api/coaching/*`) that the web app uses. This means:

- **No new backend needed.** Next.js API routes handle all CRUD operations via TursoDB.
- **Auth via Clerk.** Both web and mobile share Clerk user accounts. Mobile uses `@clerk/clerk-react-native`.
- **Feature-first organization.** Every feature is self-contained under `src/features/`.
- **Clean Architecture.** 4 layers: `/domain`, `/application`, `/infrastructure`, `/presentation`.

```
React Native App → HTTP → Next.js API Routes → TursoDB
                   ↑ Auth via Clerk
```

### 1.2 Dependency Rule

```
┌──────────────────────────────────────────────────────┐
│              Presentation Layer (Screens, UI)        │
│  React Navigation, components, hooks, styles         │
├──────────────────────────────────────────────────────┤
│              Application Layer                       │
│  Use cases, state management (Zustand), React Query  │
├──────────────────────────────────────────────────────┤
│                Domain Layer                          │
│  Entities, value objects, repository interfaces      │
├──────────────────────────────────────────────────────┤
│            Infrastructure Layer                      │
│  API clients, MMKV storage, Clerk integration        │
└──────────────────────────────────────────────────────┘
```

Dependencies point inward. Infrastructure knows about domain. Never the reverse.

---

## 2. Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React Native CLI (0.76+) | Native performance, no Expo limitations |
| Language | TypeScript 5.x strict | No `any`, explicit return types |
| Auth | `@clerk/clerk-react-native` | Shared auth with web |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) | Type-safe navigation |
| State | Zustand 5 | Lightweight, no boilerplate |
| Server State | TanStack React Query 5 | Caching, refetch, optimistic updates |
| Forms | React Hook Form + Zod | Validation at the edge |
| Storage | MMKV (react-native-mmkv) | Encrypted local storage |
| Lists | FlashList (`@shopify/flash-list`) | 60 FPS scrolling |
| Animations | Reanimated 3 + Gesture Handler 2 | Native-thread animations |
| HTTP | Axios or fetch with React Query | Configurable base URL, interceptors |
| Safe Area | `react-native-safe-area-context` | Notch/island/dynamic island support |
| Video | react-native-webrtc | Live workout streaming (future) |

---

## 3. Project Structure

```
apps/mobile/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root: providers, navigation container
│   │   └── Navigation.tsx             # Stack + tab configuration
│   ├── features/
│   │   ├── auth/                      # Sign-in, sign-up, onboarding
│   │   │   ├── domain/                # Auth entity, validation rules
│   │   │   ├── application/           # SignInUseCase, SignUpUseCase
│   │   │   ├── infrastructure/        # Clerk auth repo, token storage
│   │   │   └── presentation/          # Screens, components
│   │   ├── training/                  # Workouts, exercises, programs
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   ├── nutrition/                 # Meal plans, recipes
│   │   ├── recovery/                  # Sleep, readiness, HRV
│   │   ├── community/                 # Feed, squads, challenges
│   │   ├── communications/            # Messaging, notifications
│   │   └── live-session/              # WebRTC video streaming
│   ├── shared/
│   │   ├── api/                       # API client factory, interceptors
│   │   ├── hooks/                     # useAuth, useTheme, useDebounce
│   │   ├── theme/                     # Design tokens, dark/light mode
│   │   ├── types/                     # Shared DTOs, API contracts
│   │   └── utils/                     # Date formatting, validators
│   └── infrastructure/
│       ├── api/                       # Axios instance, React Query setup
│       ├── auth/                      # Clerk provider wrapper
│       ├── storage/                   # MMKV keys and helpers
│       └── push/                      # Firebase Cloud Messaging
├── android/
├── ios/
├── tsconfig.json
├── package.json
└── babel.config.js
```

---

## 4. Clean Architecture Layers

### 4.1 Domain Layer (`/domain`)

Pure TypeScript. Zero dependencies. Zero framework imports.

- **Entities:** Athlete, Workout, Exercise, MealPlan, Coach
- **Value Objects:** Email, TrainingLoad, ReadinessScore, MacroRatio
- **Repository interfaces:** `AthleteRepository`, `WorkoutRepository` (contracts only)
- **Domain events:** `WorkoutCompleted`, `AthleteFlagged`

### 4.2 Application Layer (`/application`)

- **Use cases:** `GetTodayWorkoutUseCase`, `LogExerciseSetUseCase`, `UpdateRecoveryScoreUseCase`
- **State management:** Zustand stores (domain-specific slices)
- **React Query:** Custom hooks wrapping `useQuery`/`useMutation`
- **Ports:** Interfaces for infrastructure services

### 4.3 Infrastructure Layer (`/infrastructure`)

- **API client:** Axios instance with Clerk JWT interceptor
- **Auth repository:** Clerk SDK wrapper
- **Storage repository:** MMKV implementation
- **Push notification service:** FCM setup
- **WebRTC service:** Video streaming (future)

### 4.4 Presentation Layer (`/presentation`)

- **Screens:** One screen per route. Orchestrate features. No business logic.
- **Components:** Atomic Design (Atoms → Molecules → Organisms → Templates)
- **Hooks:** `useAuth`, `useWorkout`, `useTheme` — thin wrappers over application layer

---

## 5. API Integration

The mobile app calls the **same Next.js API routes** as the web app:

| Mobile Feature | API Endpoint |
|---------------|-------------|
| Athlete profile | `GET/PUT /api/coaching/athletes` |
| Today's workout | `GET /api/coaching/sessions` |
| Workout history | `GET /api/coaching/assigned-workouts` |
| Meal plans | `GET /api/coaching/plans` |
| Messages | `GET/POST /api/coaching/messages` |
| Events | `GET /api/coaching/events` |
| Dashboard | `GET /api/coaching/dashboard` |
| Products/Sales | `GET/POST /api/coaching/products` |

**Config:** `API_BASE_URL` environment variable points to `/api/coaching`.

```typescript
// shared/api/client.ts
const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await Clerk.session?.getToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 6. Authentication

### Clerk React Native SDK

```typescript
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react-native';
```

- Same Clerk app as web. Users sign in once, access both platforms.
- Token stored securely by Clerk SDK (not AsyncStorage).
- JWT attached to every API request via axios interceptor.
- Role-based navigation: athlete sees athlete tabs, coach sees coach tabs.

### Auth Flow

```
App Launch → Clerk session check
  ├─ No session → SignInScreen
  └─ Has session → Role check
       ├─ athlete → AthleteNavigator (tabs: Today, Workouts, Nutrition, Profile)
       └─ coach   → CoachNavigator (tabs: Dashboard, Athletes, Training, Settings)
```

---

## 7. Navigation

```typescript
// React Navigation 7 with type safety
type RootStackParamList = {
  Auth: undefined;
  AthleteTabs: undefined;
  CoachTabs: undefined;
  WorkoutSession: { workoutId: string };
  ExerciseDetail: { exerciseId: string };
};
```

**Bottom tabs (athlete):** Today, Training, Nutrition, Recovery, Profile
**Bottom tabs (coach):** Dashboard, Athletes, Schedule, Training, Settings

---

## 8. Offline Support

- **MMKV** caches API responses locally.
- **React Query** `staleTime` + `gcTime` for offline resilience.
- **Pending mutations** queued when offline, replayed on reconnect.
- **Optimistic updates** for workout logging, set completion.

---

## 9. Video Streaming (Future)

Live workout sessions via WebRTC:

```
Coach Phone → WebRTC → Signalling Server (Next.js API) → Athlete Phone
```

- `react-native-webrtc` for peer connection.
- Next.js WebSocket or Server-Sent Events for signalling.
- TURN/STUN servers for NAT traversal.
- Will require a dedicated signalling endpoint on the Next.js API.

This is a **future feature** — not required for initial QA.
