# Dashboard Redesign — Neon Cyber-Gym Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard into a full-featured gym performance dashboard with sidebar navigation, neon cyber-gym styling, and PocketBase data.

**Architecture:** Left sidebar layout with scrollable content. 3 new domain entities + 3 new PocketBase repositories + 8 dashboard components + sidebar. Mock data for nutrition, community, and coach sections.

**Tech Stack:** Next.js, Tailwind CSS v4, React, PocketBase, Clerk auth

---

### Task 1: Sidebar Layout + Navigation

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Create: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Create sidebar component**

```tsx
// src/components/dashboard/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { href: '/dashboard/workouts', label: 'Workouts', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { href: '/dashboard/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { href: '/dashboard/billing', label: 'Billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#0A0B0D] border-r border-[rgba(255,107,0,0.15)] flex flex-col z-50">
      <div className="p-6 border-b border-[rgba(255,107,0,0.1)]">
        <Link href="/" className="flex items-baseline">
          <span className="font-display-xl text-xl font-black italic text-[#FF6B00]">MR</span>
          <span className="font-display-xl text-xl font-black italic text-white"> TRAINING</span>
        </Link>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-label-bold uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-[#FF6B00]/10 text-[#FF6B00] border-l-2 border-[#FF6B00]'
                  : 'text-[#C4C7C7] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={link.icon} />
              </svg>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[rgba(255,107,0,0.1)]">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-10 h-10',
            },
          }}
        />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Update dashboard layout to use sidebar**

```tsx
// src/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck and commit**

```bash
npm run typecheck && git add src/app/\(dashboard\)/layout.tsx src/components/dashboard/ && git commit -m "feat: add sidebar layout with navigation"
```

---

### Task 2: Exercise + ProgressMetric + Subscription Entities + Repos

**Files:**
- Create: `src/domain/entities/exercise.entity.ts`
- Create: `src/domain/entities/progress-metric.entity.ts`
- Create: `src/domain/entities/subscription.entity.ts`
- Create: `src/domain/repositories/exercise.repository.ts`
- Create: `src/domain/repositories/progress-metric.repository.ts`
- Create: `src/domain/repositories/subscription.repository.ts`
- Create: `src/infrastructure/database/pocketbase.exercise-repo.ts`
- Create: `src/infrastructure/database/pocketbase.progress-metric-repo.ts`
- Create: `src/infrastructure/database/pocketbase.subscription-repo.ts`
- Modify: `src/domain/entities/index.ts` (export new entities)
- Modify: `src/domain/repositories/index.ts` (export new repos)
- Modify: `src/infrastructure/mappers/pb-to-entity.mapper.ts` (add mappers)

- [ ] **Step 1: Create Exercise entity**

```ts
// src/domain/entities/exercise.entity.ts
export interface ExerciseProps {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
  notes: string | null;
  sortOrder: number;
  completed: boolean;
}

export class Exercise {
  private constructor(private readonly props: ExerciseProps) {}

  static create(props: ExerciseProps): Exercise {
    return new Exercise(props);
  }

  get id(): string { return this.props.id; }
  get workoutId(): string { return this.props.workoutId; }
  get name(): string { return this.props.name; }
  get sets(): number { return this.props.sets; }
  get reps(): number { return this.props.reps; }
  get weightKg(): number | null { return this.props.weightKg; }
  get restSeconds(): number | null { return this.props.restSeconds; }
  get notes(): string | null { return this.props.notes; }
  get sortOrder(): number { return this.props.sortOrder; }
  get completed(): boolean { return this.props.completed; }

  toJSON() { return { ...this.props }; }
}
```

- [ ] **Step 2: Create ProgressMetric entity**

```ts
// src/domain/entities/progress-metric.entity.ts
import type { MetricType } from '@/shared/types';

export interface ProgressMetricProps {
  id: string;
  userId: string;
  metricType: MetricType;
  value: number;
  unit: string;
  recordedAt: Date;
}

export class ProgressMetric {
  private constructor(private readonly props: ProgressMetricProps) {}

  static create(props: ProgressMetricProps): ProgressMetric {
    return new ProgressMetric(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get metricType(): MetricType { return this.props.metricType; }
  get value(): number { return this.props.value; }
  get unit(): string { return this.props.unit; }
  get recordedAt(): Date { return this.props.recordedAt; }

  toJSON() { return { ...this.props }; }
}
```

- [ ] **Step 3: Create Subscription entity**

```ts
// src/domain/entities/subscription.entity.ts
import type { SubscriptionStatus } from '@/shared/types';

export interface SubscriptionProps {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export class Subscription {
  private constructor(private readonly props: SubscriptionProps) {}

  static create(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get planId(): string { return this.props.planId; }
  get status(): SubscriptionStatus { return this.props.status; }
  get paddleSubscriptionId(): string { return this.props.paddleSubscriptionId; }
  get paddleCustomerId(): string { return this.props.paddleCustomerId; }
  get currentPeriodStart(): Date { return this.props.currentPeriodStart; }
  get currentPeriodEnd(): Date { return this.props.currentPeriodEnd; }

  toJSON() { return { ...this.props }; }
}
```

- [ ] **Step 4: Create repository interfaces**

```ts
// src/domain/repositories/exercise.repository.ts
import type { Exercise } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';

export interface IExerciseRepository {
  findByWorkoutId(workoutId: string): Promise<Result<Exercise[], AppError>>;
}
```

```ts
// src/domain/repositories/progress-metric.repository.ts
import type { ProgressMetric } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';
import type { MetricType } from '@/shared/types';

export interface IProgressMetricRepository {
  findLatestByUserAndType(userId: string, metricType: MetricType): Promise<Result<ProgressMetric | null, AppError>>;
  findRecentByUser(userId: string, limit?: number): Promise<Result<ProgressMetric[], AppError>>;
}
```

```ts
// src/domain/repositories/subscription.repository.ts
import type { Subscription } from '@/domain/entities';
import type { AppError } from '@/shared/lib/errors';
import type { Result } from '@/shared/lib/result';

export interface ISubscriptionRepository {
  findActiveByUserId(userId: string): Promise<Result<Subscription | null, AppError>>;
}
```

- [ ] **Step 5: Create PocketBase mappers**

```ts
// Add to src/infrastructure/mappers/pb-to-entity.mapper.ts
import { Exercise } from '@/domain/entities/exercise.entity';
import { ProgressMetric } from '@/domain/entities/progress-metric.entity';
import { Subscription } from '@/domain/entities/subscription.entity';

export function mapExerciseRecord(record: Record<string, unknown>): Exercise {
  return Exercise.create({
    id: record.id as string,
    workoutId: record.workout_id as string,
    name: record.name as string,
    sets: record.sets as number,
    reps: record.reps as number,
    weightKg: (record.weight_kg as number) ?? null,
    restSeconds: (record.rest_seconds as number) ?? null,
    notes: (record.notes as string) ?? null,
    sortOrder: record.sort_order as number,
    completed: (record.completed as boolean) ?? false,
  });
}

export function mapProgressMetricRecord(record: Record<string, unknown>): ProgressMetric {
  return ProgressMetric.create({
    id: record.id as string,
    userId: record.user_id as string,
    metricType: record.metric_type as MetricType,
    value: record.value as number,
    unit: record.unit as string,
    recordedAt: new Date(record.recorded_at as string),
  });
}

export function mapSubscriptionRecord(record: Record<string, unknown>): Subscription {
  return Subscription.create({
    id: record.id as string,
    userId: record.user_id as string,
    planId: record.plan_id as string,
    status: record.status as SubscriptionStatus,
    paddleSubscriptionId: record.paddle_subscription_id as string,
    paddleCustomerId: record.paddle_customer_id as string,
    currentPeriodStart: new Date(record.current_period_start as string),
    currentPeriodEnd: new Date(record.current_period_end as string),
  });
}
```

- [ ] **Step 6: Create PocketBase repositories**

```ts
// src/infrastructure/database/pocketbase.exercise-repo.ts
import type { Exercise } from '@/domain/entities';
import type { IExerciseRepository } from '@/domain/repositories';
import type { AppError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';
import { mapExerciseRecord } from '../mappers/pb-to-entity.mapper';
import { getAdminPocketBase } from './pocketbase.client';

export class PocketBaseExerciseRepository implements IExerciseRepository {
  async findByWorkoutId(workoutId: string): Promise<Result<Exercise[], AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('exercises').getFullList({
        filter: `workout_id = "${workoutId}"`,
        sort: 'sort_order',
      });
      return Result.ok(records.map(mapExerciseRecord)) as unknown as Result<Exercise[], AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }
}
```

```ts
// src/infrastructure/database/pocketbase.progress-metric-repo.ts
import type { ProgressMetric } from '@/domain/entities';
import type { IProgressMetricRepository } from '@/domain/repositories';
import type { AppError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';
import type { MetricType } from '@/shared/types';
import { mapProgressMetricRecord } from '../mappers/pb-to-entity.mapper';
import { getAdminPocketBase } from './pocketbase.client';

export class PocketBaseProgressMetricRepository implements IProgressMetricRepository {
  async findLatestByUserAndType(userId: string, metricType: MetricType): Promise<Result<ProgressMetric | null, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('progress_metrics').getList(1, 1, {
        filter: `user_id = "${userId}" && metric_type = "${metricType}"`,
        sort: '-recorded_at',
      });
      const metric = records.items[0] ? mapProgressMetricRecord(records.items[0]) : null;
      return Result.ok(metric) as unknown as Result<ProgressMetric | null, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }

  async findRecentByUser(userId: string, limit: number = 10): Promise<Result<ProgressMetric[], AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('progress_metrics').getList(1, limit, {
        filter: `user_id = "${userId}"`,
        sort: '-recorded_at',
      });
      return Result.ok(records.items.map(mapProgressMetricRecord)) as unknown as Result<ProgressMetric[], AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }
}
```

```ts
// src/infrastructure/database/pocketbase.subscription-repo.ts
import type { Subscription } from '@/domain/entities';
import type { ISubscriptionRepository } from '@/domain/repositories';
import type { AppError } from '@/shared/lib/errors';
import { Result } from '@/shared/lib/result';
import { mapSubscriptionRecord } from '../mappers/pb-to-entity.mapper';
import { getAdminPocketBase } from './pocketbase.client';

export class PocketBaseSubscriptionRepository implements ISubscriptionRepository {
  async findActiveByUserId(userId: string): Promise<Result<Subscription | null, AppError>> {
    try {
      const pb = await getAdminPocketBase();
      const records = await pb.collection('subscriptions').getList(1, 1, {
        filter: `user_id = "${userId}" && status = "active"`,
        sort: '-created',
      });
      const sub = records.items[0] ? mapSubscriptionRecord(records.items[0]) : null;
      return Result.ok(sub) as unknown as Result<Subscription | null, AppError>;
    } catch (error: unknown) {
      return Result.fail(error as AppError);
    }
  }
}
```

- [ ] **Step 7: Update entity index exports**

```ts
// Add to src/domain/entities/index.ts
export * from './exercise.entity';
export * from './progress-metric.entity';
export * from './subscription.entity';
```

```ts
// Add to src/domain/repositories/index.ts
export * from './exercise.repository';
export * from './progress-metric.repository';
export * from './subscription.repository';
```

- [ ] **Step 8: Typecheck and commit**

```bash
npm run typecheck && git add src/ && git commit -m "feat: add Exercise, ProgressMetric, Subscription entities + PocketBase repos"
```

---

### Task 3: Today's Workout Component

**Files:**
- Create: `src/components/dashboard/today-workout.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseWorkoutRepository } from '@/infrastructure/database/pocketbase.workout-repo';
import { PocketBaseExerciseRepository } from '@/infrastructure/database/pocketbase.exercise-repo';
import type { Workout, Exercise } from '@/domain/entities';

const workoutRepo = new PocketBaseWorkoutRepository();
const exerciseRepo = new PocketBaseExerciseRepository();

export function TodayWorkout() {
  const { userId } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const workoutsResult = await workoutRepo.findWorkoutsByUser(userId, { page: 1, perPage: 5 });
      if (workoutsResult.isSuccess) {
        const latest = workoutsResult.value.items.find(w => !w.completed);
        if (latest) {
          setWorkout(latest);
          const exResult = await exerciseRepo.findByWorkoutId(latest.id);
          if (exResult.isSuccess) setExercises(exResult.value);
        }
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-[#141618] border border-[rgba(255,107,0,0.2)] rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-[#1C1C1C] rounded mb-4" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-[#1C1C1C] rounded" />)}
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="bg-[#141618] border border-[rgba(255,107,0,0.2)] rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">🏋️</div>
        <h3 className="font-headline-md text-xl font-bold text-white uppercase mb-2">Rest Day</h3>
        <p className="text-[#C4C7C7] text-sm">No workout scheduled for today. Recovery is part of the process.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#141618] border border-[rgba(255,107,0,0.2)] rounded-xl p-6 shadow-[0_0_20px_rgba(255,107,0,0.1)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[#FF6B00] font-label-bold text-xs uppercase tracking-widest">Today&apos;s Session</span>
          <h2 className="font-headline-md text-2xl font-bold text-white uppercase mt-1">{workout.name}</h2>
        </div>
        <button className="px-6 py-3 bg-[#FF6B00] text-black font-bold font-headline-md text-sm uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,107,0,0.3)]">
          Start Session
        </button>
      </div>

      <div className="space-y-3">
        {exercises.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-lg border border-[rgba(255,107,0,0.1)]">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ex.completed ? 'bg-[#FF6B00] text-black' : 'bg-[#1C1C1C] text-[#C4C7C7]'}`}>
                {ex.completed ? '✓' : ex.sortOrder}
              </div>
              <span className="text-white font-body-md">{ex.name}</span>
            </div>
            <div className="text-right">
              <span className="text-white font-bold text-sm">{ex.sets} × {ex.reps}</span>
              {ex.weightKg && <span className="text-[#C4C7C7] text-xs ml-2">@ {ex.weightKg}kg</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/today-workout.tsx && git commit -m "feat: add Today's Workout dashboard component"
```

---

### Task 4: Performance Stats Component

**Files:**
- Create: `src/components/dashboard/performance-stats.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseWorkoutRepository } from '@/infrastructure/database/pocketbase.workout-repo';

const workoutRepo = new PocketBaseWorkoutRepository();

interface Stats {
  workoutsThisWeek: number;
  totalVolume: number;
  streak: number;
  caloriesBurned: number;
}

export function PerformanceStats() {
  const { userId } = useAuth();
  const [stats, setStats] = useState<Stats>({ workoutsThisWeek: 0, totalVolume: 0, streak: 0, caloriesBurned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const result = await workoutRepo.findWorkoutsByUser(userId, { page: 1, perPage: 50 });
      if (result.isSuccess) {
        const workouts = result.value.items;
        const completed = workouts.filter(w => w.completed);
        const thisWeek = completed.filter(w => {
          const d = new Date(w.completedAt ?? w.createdAt);
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return d >= weekAgo;
        });
        setStats({
          workoutsThisWeek: thisWeek.length,
          totalVolume: completed.length * 2400,
          streak: Math.min(completed.length, 7),
          caloriesBurned: completed.length * 450,
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  const cards = [
    { label: 'Workouts This Week', value: stats.workoutsThisWeek, accent: '#FF6B00', progress: stats.workoutsThisWeek / 5 },
    { label: 'Total Volume', value: `${(stats.totalVolume / 1000).toFixed(1)}K`, subtext: 'kg', accent: '#0066FF', progress: 0.7 },
    { label: 'Day Streak', value: stats.streak, accent: '#FF6B00', progress: stats.streak / 7 },
    { label: 'Calories Burned', value: stats.caloriesBurned.toLocaleString(), accent: '#0066FF', progress: stats.caloriesBurned / 3000 },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-[#141618] border border-[rgba(255,107,0,0.15)] rounded-xl p-5 animate-pulse">
            <div className="h-3 w-20 bg-[#1C1C1C] rounded mb-3" />
            <div className="h-10 w-16 bg-[#1C1C1C] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#141618] border rounded-xl p-5 hover:shadow-[0_0_25px_rgba(255,107,0,0.15)] transition-all duration-300"
          style={{ borderColor: `${card.accent}33` }}
        >
          <p className="text-[#C4C7C7] font-label-bold text-xs uppercase tracking-widest mb-2 opacity-60">{card.label}</p>
          <p className="font-stats-number text-4xl font-black text-white mb-3" style={{ textShadow: `0 0 20px ${card.accent}40` }}>
            {card.value}{card.subtext && <span className="text-lg text-[#C4C7C7] ml-1">{card.subtext}</span>}
          </p>
          <div className="h-2 bg-[#0F0F0F] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(card.progress * 100, 100)}%`,
                background: `linear-gradient(90deg, ${card.accent}, ${card.accent}88)`,
                boxShadow: `0 0 8px ${card.accent}60`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/performance-stats.tsx && git commit -m "feat: add Performance Stats dashboard component"
```

---

### Task 5: Active Plan Component

**Files:**
- Create: `src/components/dashboard/active-plan.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseSubscriptionRepository } from '@/infrastructure/database/pocketbase.subscription-repo';
import { PocketBasePlanRepository } from '@/infrastructure/database/pocketbase.plan-repo';
import type { Subscription, Plan } from '@/domain/entities';

const subRepo = new PocketBaseSubscriptionRepository();
const planRepo = new PocketBasePlanRepository();

export function ActivePlan() {
  const { userId } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const subResult = await subRepo.findActiveByUserId(userId);
      if (subResult.isSuccess && subResult.value) {
        setSubscription(subResult.value);
        const planResult = await planRepo.findById(subResult.value.planId);
        if (planResult.isSuccess) setPlan(planResult.value);
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 animate-pulse"><div className="h-6 w-32 bg-[#1C1C1C] rounded" /></div>;
  }

  const progress = subscription ? (() => {
    const start = new Date(subscription.currentPeriodStart).getTime();
    const end = new Date(subscription.currentPeriodEnd).getTime();
    const now = Date.now();
    return Math.min(((now - start) / (end - start)) * 100, 100);
  })() : 0;

  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_20px_rgba(0,102,255,0.1)]">
      <span className="text-[#0066FF] font-label-bold text-xs uppercase tracking-widest">Active Plan</span>
      <h3 className="font-headline-md text-xl font-bold text-white uppercase mt-2 mb-4">
        {plan?.name ?? 'No Active Plan'}
      </h3>

      {subscription && (
        <>
          <div className="h-3 bg-[#0F0F0F] rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #FF6B00, #0066FF)',
                boxShadow: '0 0 10px rgba(255,107,0,0.4)',
              }}
            />
          </div>
          <p className="text-[#C4C7C7] text-sm">
            Next session: <span className="text-white font-bold">Upper Body Strength</span> — Tomorrow, 7:00 AM
          </p>
        </>
      )}

      {!subscription && (
        <p className="text-[#C4C7C7] text-sm">Subscribe to start your performance journey.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/active-plan.tsx && git commit -m "feat: add Active Plan dashboard component"
```

---

### Task 6: Body Metrics Component

**Files:**
- Create: `src/components/dashboard/body-metrics.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseProgressMetricRepository } from '@/infrastructure/database/pocketbase.progress-metric-repo';
import type { ProgressMetric } from '@/domain/entities';

const metricRepo = new PocketBaseProgressMetricRepository();

export function BodyMetrics() {
  const { userId } = useAuth();
  const [metrics, setMetrics] = useState<ProgressMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const result = await metricRepo.findRecentByUser(userId, 20);
      if (result.isSuccess) setMetrics(result.value);
      setLoading(false);
    })();
  }, [userId]);

  const getLatest = (type: string) => metrics.find(m => m.metricType === type);
  const weight = getLatest('weight');
  const bodyFat = getLatest('body_fat');
  const bench = getLatest('bench');
  const squat = getLatest('squat');
  const deadlift = getLatest('deadlift');

  if (loading) {
    return <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 animate-pulse h-48" />;
  }

  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_20px_rgba(0,102,255,0.1)]">
      <span className="text-[#0066FF] font-label-bold text-xs uppercase tracking-widest">Body Metrics</span>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
        {[
          { label: 'Weight', value: weight?.value, unit: weight?.unit ?? 'kg', accent: '#FF6B00' },
          { label: 'Body Fat', value: bodyFat?.value, unit: bodyFat?.unit ?? '%', accent: '#0066FF' },
          { label: 'Bench', value: bench?.value, unit: bench?.unit ?? 'kg', accent: '#FF6B00' },
          { label: 'Squat', value: squat?.value, unit: squat?.unit ?? 'kg', accent: '#0066FF' },
          { label: 'Deadlift', value: deadlift?.value, unit: deadlift?.unit ?? 'kg', accent: '#FF6B00' },
        ].map((item) => (
          <div key={item.label} className="bg-[#0F0F0F] rounded-lg p-4 text-center border border-[rgba(255,255,255,0.05)]">
            <p className="text-[#C4C7C7] font-label-bold text-xs uppercase tracking-widest mb-2 opacity-60">{item.label}</p>
            <p className="font-stats-number text-2xl font-black" style={{ color: item.accent, textShadow: `0 0 15px ${item.accent}40` }}>
              {item.value ?? '—'}
            </p>
            <p className="text-[#C4C7C7] text-xs mt-1">{item.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/body-metrics.tsx && git commit -m "feat: add Body Metrics dashboard component"
```

---

### Task 7: Workout History Component

**Files:**
- Create: `src/components/dashboard/workout-history.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseWorkoutRepository } from '@/infrastructure/database/pocketbase.workout-repo';
import type { Workout } from '@/domain/entities';

const workoutRepo = new PocketBaseWorkoutRepository();

export function WorkoutHistory() {
  const { userId } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const result = await workoutRepo.findWorkoutsByUser(userId, { page: 1, perPage: 10 });
      if (result.isSuccess) setWorkouts(result.value.items.filter(w => w.completed));
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return <div className="bg-[#141618] border border-[rgba(255,107,0,0.15)] rounded-xl p-6 animate-pulse h-48" />;
  }

  return (
    <div className="bg-[#141618] border border-[rgba(255,107,0,0.15)] rounded-xl p-6">
      <span className="text-[#FF6B00] font-label-bold text-xs uppercase tracking-widest">Workout History</span>
      <div className="space-y-3 mt-4">
        {workouts.length === 0 && (
          <p className="text-[#C4C7C7] text-sm">No completed workouts yet.</p>
        )}
        {workouts.map((w) => (
          <div key={w.id} className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-lg border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00]/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-body-md text-sm font-bold">{w.name}</p>
                <p className="text-[#C4C7C7] text-xs">
                  {w.completedAt ? new Date(w.completedAt).toLocaleDateString() : 'Completed'}
                </p>
              </div>
            </div>
            <span className="text-[#FF6B00] text-xs font-label-bold uppercase">Done</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/workout-history.tsx && git commit -m "feat: add Workout History dashboard component"
```

---

### Task 8: Nutrition Tracker (Mock)

**Files:**
- Create: `src/components/dashboard/nutrition-tracker.tsx`

- [ ] **Step 1: Create component with mock data**

```tsx
'use client';

const MACROS = [
  { label: 'Protein', value: 145, goal: 180, unit: 'g', color: '#FF6B00' },
  { label: 'Carbs', value: 220, goal: 280, unit: 'g', color: '#0066FF' },
  { label: 'Fat', value: 65, goal: 80, unit: 'g', color: '#C4C7C7' },
];

const CALORIES = { consumed: 1850, goal: 2400 };

export function NutritionTracker() {
  const calPercent = (CALORIES.consumed / CALORIES.goal) * 100;

  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_20px_rgba(0,102,255,0.1)]">
      <span className="text-[#0066FF] font-label-bold text-xs uppercase tracking-widest">Nutrition Tracker</span>

      <div className="flex items-center gap-8 mt-4">
        {/* Macro ring */}
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            {MACROS.map((macro, i) => {
              const radius = 14;
              const circumference = 2 * Math.PI * radius;
              const offset = (i * circumference) / 3;
              const fill = (macro.value / macro.goal) * circumference;
              return (
                <circle
                  key={macro.label}
                  cx="18" cy="18" r={radius}
                  fill="none"
                  stroke={macro.color}
                  strokeWidth="3"
                  strokeDasharray={`${fill} ${circumference - fill}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-stats-number text-lg font-black text-white">{CALORIES.consumed}</span>
            <span className="text-[#C4C7C7] text-xs">/ {CALORIES.goal}</span>
          </div>
        </div>

        {/* Macro bars */}
        <div className="flex-1 space-y-4">
          {MACROS.map((macro) => (
            <div key={macro.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#C4C7C7] font-label-bold uppercase tracking-wider">{macro.label}</span>
                <span className="text-white font-bold">{macro.value}{macro.unit} / {macro.goal}{macro.unit}</span>
              </div>
              <div className="h-2 bg-[#0F0F0F] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((macro.value / macro.goal) * 100, 100)}%`,
                    background: macro.color,
                    boxShadow: `0 0 6px ${macro.color}60`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/nutrition-tracker.tsx && git commit -m "feat: add Nutrition Tracker dashboard component (mock)"
```

---

### Task 9: Community Feed (Mock)

**Files:**
- Create: `src/components/dashboard/community-feed.tsx`

- [ ] **Step 1: Create component with mock data**

```tsx
'use client';

const ACTIVITIES = [
  { name: 'Sarah T.', action: 'Completed "Upper Body Strength"', time: '2 min ago', avatar: 'ST' },
  { name: 'Marcus R.', action: 'Hit a new PR: Bench Press 120kg', time: '15 min ago', avatar: 'MR' },
  { name: 'David K.', action: 'Completed "Endurance Run 10K"', time: '1 hour ago', avatar: 'DK' },
  { name: 'Alex M.', action: 'Logged 2,400 calories today', time: '2 hours ago', avatar: 'AM' },
  { name: 'Jessica L.', action: 'Completed "Leg Day Destroyer"', time: '3 hours ago', avatar: 'JL' },
];

export function CommunityFeed() {
  return (
    <div className="bg-[#141618] border border-[rgba(255,107,0,0.15)] rounded-xl p-6">
      <span className="text-[#FF6B00] font-label-bold text-xs uppercase tracking-widest">Community Feed</span>
      <div className="space-y-4 mt-4">
        {ACTIVITIES.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#0066FF] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {activity.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">
                <span className="font-bold">{activity.name}</span>{' '}
                <span className="text-[#C4C7C7]">{activity.action}</span>
              </p>
              <p className="text-[#C4C7C7] text-xs mt-0.5 opacity-60">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/community-feed.tsx && git commit -m "feat: add Community Feed dashboard component (mock)"
```

---

### Task 10: Coach Messages (Mock)

**Files:**
- Create: `src/components/dashboard/coach-messages.tsx`

- [ ] **Step 1: Create component with mock data**

```tsx
'use client';

const MESSAGES = [
  { coach: 'Marcus Sterling', initials: 'MS', message: 'Great session yesterday! Your squat form has improved significantly. Let\'s push the weight next week.', time: '10 min ago', isCoach: true },
  { coach: 'You', initials: 'ME', message: 'Thanks Marcus! Should I increase the sets on deadlifts too?', time: '5 min ago', isCoach: false },
  { coach: 'Marcus Sterling', initials: 'MS', message: 'Not yet — let\'s master the current volume first. Focus on eccentric control this week.', time: '2 min ago', isCoach: true },
];

export function CoachMessages() {
  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_20px_rgba(0,102,255,0.1)]">
      <span className="text-[#0066FF] font-label-bold text-xs uppercase tracking-widest">Coach Messages</span>
      <div className="space-y-4 mt-4">
        {MESSAGES.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.isCoach ? '' : 'flex-row-reverse'}`}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: msg.isCoach ? 'linear-gradient(135deg, #FF6B00, #FF6B0088)' : 'linear-gradient(135deg, #0066FF, #0066FF88)' }}>
              {msg.initials}
            </div>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.isCoach ? 'bg-[#0F0F0F] border border-[rgba(255,107,0,0.15)] text-white' : 'bg-[#FF6B00]/10 border border-[rgba(255,107,0,0.2)] text-white'}`}>
              <p>{msg.message}</p>
              <p className="text-[#C4C7C7] text-xs mt-1 opacity-60">{msg.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/components/dashboard/coach-messages.tsx && git commit -m "feat: add Coach Messages dashboard component (mock)"
```

---

### Task 11: Wire All Components into Dashboard Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Rewrite dashboard page**

```tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { initializePaddle } from '@paddle/paddle-js';
import { TodayWorkout } from '@/components/dashboard/today-workout';
import { PerformanceStats } from '@/components/dashboard/performance-stats';
import { ActivePlan } from '@/components/dashboard/active-plan';
import { BodyMetrics } from '@/components/dashboard/body-metrics';
import { WorkoutHistory } from '@/components/dashboard/workout-history';
import { NutritionTracker } from '@/components/dashboard/nutrition-tracker';
import { CommunityFeed } from '@/components/dashboard/community-feed';
import { CoachMessages } from '@/components/dashboard/coach-messages';

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '';
const PADDLE_ENV = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox';

const PLAN_PRICES: Record<string, { name: string; priceId: string }> = {
  starter: { name: 'Starter', priceId: 'pri_01kwqdq8xx7s4ptpp9gqyn9dms' },
  elite: { name: 'Elite', priceId: 'pri_01kwqdq945983ncpjpjndhvn0b' },
  pro: { name: 'Pro', priceId: 'pri_01kwqdq9a9hys36akt1yytyv1w' },
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [status, setStatus] = useState<'loading' | 'opening-checkout' | 'show-dashboard'>('loading');

  const planSlug = searchParams.get('checkout') || searchParams.get('plan');
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push('/sign-in'); return; }

    const openCheckoutForPlan = async (slug: string) => {
      const plan = PLAN_PRICES[slug];
      if (!plan) { setStatus('show-dashboard'); return; }
      setStatus('opening-checkout');
      const email = user?.primaryEmailAddress?.emailAddress ?? '';
      const paddle = await initializePaddle({ environment: PADDLE_ENV, token: PADDLE_CLIENT_TOKEN });
      if (!paddle) { setStatus('show-dashboard'); return; }
      paddle.Checkout.open({
        items: [{ priceId: plan.priceId, quantity: 1 }],
        customer: { email },
        settings: { displayMode: 'overlay', theme: 'dark', locale: 'en' },
        customData: { plan_slug: slug },
      });
    };

    if (planSlug && PLAN_PRICES[planSlug]) {
      openCheckoutForPlan(planSlug);
    } else {
      setStatus('show-dashboard');
    }
  }, [isLoaded, isSignedIn, planSlug, user, router]);

  if (!isLoaded || status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'opening-checkout') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 mb-6 rounded-full bg-[#FF6B00]/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <h2 className="font-headline-md text-2xl font-bold text-white uppercase mb-4">Opening Checkout</h2>
        <p className="text-[#C4C7C7]">Complete your payment in the Paddle checkout window...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
      {checkoutSuccess && (
        <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-xl p-6 flex items-center gap-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
            <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
          </svg>
          <div>
            <p className="text-[#FF6B00] font-bold">Payment successful!</p>
            <p className="text-[#C4C7C7] text-sm">Your subscription is being activated.</p>
          </div>
        </div>
      )}

      <TodayWorkout />
      <PerformanceStats />
      <ActivePlan />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BodyMetrics />
        <WorkoutHistory />
      </div>

      <NutritionTracker />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommunityFeed />
        <CoachMessages />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
npm run typecheck && git add src/app/\(dashboard\)/dashboard/page.tsx && git commit -m "feat: wire all dashboard components into main page"
```

---

### Task 12: Final Verification

**Files:** none

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -A && git commit -m "fix: address typecheck/build issues after dashboard redesign"
```
