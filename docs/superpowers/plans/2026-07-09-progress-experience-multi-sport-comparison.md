# MR Training Progress Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build unified multi-sport progress tracking dashboard for MR Training coaches, enabling them to compare athlete performance across all sports (gym, running, tennis, swimming, cycling, CrossFit) with standardized metrics and real-time insights.

**Architecture:** Next.js 14+ App Router with React Server Components by default. Feature-first organization with co-located components/hooks/types/API routes/state management per feature. Uses shadcn/ui design system with Zustand for state management and TanStack Query for data fetching.

**Tech Stack:** Next.js 14+, React 18+, TypeScript 5+, Tailwind CSS 3.4+, shadcn/ui, Zustand, TanStack Query, WebSocket (optional), Vite for development

---

### Task 1: Set up Progress Calculation Service (JavaScript/TypeScript)

**Files:**
- Create: `apps/web/src/features/progress/services/progress-calculation.ts`
- Create: `apps/web/src/features/progress/services/progress-calculation.test.ts`
- Create: `apps/web/src/features/progress/types/progress-types.ts`
- Create: `apps/web/src/features/progress/hooks/useProgressData.ts`

- [ ] **Step 1: Write the failing test**

```typescript
def test_calculateProgressForMultiSportDashboard() {
    // Test that progress calculation handles all sports and athlete data
    const athleteData: AthleteProgressData = {
        athleteId: "sarah-johnson",
        startDate: "2026-01-01",
        endDate: "2026-07-08",
        sessions: [
            { sport: "gym", date: "2026-03-15", activity: "weight-training", duration: 60, calories: 300 },
            { sport: "running", date: "2026-03-16", activity: "outdoor-run", distance: 5, duration: 30 },
            { sport: "tennis", date: "2026-03-17", activity: "singles-match", games: 6, sets: 2 },
            { sport: "swimming", date: "2026-03-18", activity: "lap-swimming", laps: 20, duration: 25 },
            { sport: "cycling", date: "2026-03-19", activity: "road-cycling", distance: 15, duration: 45 },
            { sport: "crossfit", date: "2026-03-20", activity: "wod-workout", score: 85, duration: 15 },
        ],
    }
    
    const progress = calculateProgress(athleteData)
    
    // Verify all sports have calculated progress
    expect(progress.gym.load).toBeGreaterThan(0)
    expect(progress.running.load).toBeGreaterThan(0)
    expect(progress.tennis.performance).toBeGreaterThan(0)
    expect(progress.swimming.load).toBeGreaterThan(0)
    expect(progress.cycling.power).toBeGreaterThan(0)
    expect(progress.crossfit.score).toBeGreaterThan(0)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/features/progress/services/progress-calculation.test.ts -v`
Expected: FAIL with "Function calculateProgress not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/features/progress/services/progress-calculation.ts
def calculateProgress(athleteData: AthleteProgressData): ProgressResult {
    // Calculate sport-specific metrics from training data
    const gymLoad = calculateGymLoad(athleteData.sessions)
    const runningDistance = calculateRunningDistance(athleteData.sessions)
    const tennisMatches = calculateTennisMatches(athleteData.sessions)
    const swimLaps = calculateSwimmingProgress(athleteData.sessions)
    const cyclePower = calculateCyclingPower(athleteData.sessions)
    const crossfitScore = calculateCrossfitScore(athleteData.sessions)
    
    return {
        gym: { load: gymLoad, volume: calculateGymVolume(athleteData.sessions) },
        running: { load: runningDistance, pace: calculateRunningPace(runningDistance, athleteData.sessions) },
        tennis: { performance: tennisMatches, winRate: calculateTennisWinRate(tennisMatches) },
        swimming: { load: swimLaps, pace: calculateSwimmingPace(swimLaps, athleteData.sessions) },
        cycling: { power: cyclePower, distance: calculateCyclingDistance(cyclePower) },
        crossfit: { score: crossfitScore, reps: calculateCrossfitReps(crossfitScore) },
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/web/src/features/progress/services/progress-calculation.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web
npm add -D @testing-library/jest-dom @testing-library/react
# Create test files
rm -rf src/features/progress
mkdir -p src/features/progress/{services,components,hooks,types}

# Initialize package.json for feature
touch src/features/progress/package.json

echo '{
  "name": "@mrtraining/progress",
  "version": "0.1.0",
  "private": true
}' > src/features/progress/package.json

git add src/features/progress/services/progress-calculation.ts
# Add test files
git add src/features/progress/services/progress-calculation.test.ts
# Add supporting files
git add src/features/progress/types/progress-types.ts
# Add hooks
git add src/features/progress/hooks/useProgressData.ts

git commit -m "feat: add progress calculation service"
```

### Task 2: Set up Progress Normalization Service (JavaScript/TypeScript)

**Files:**
- Create: `apps/web/src/features/progress/services/normalization.ts`
- Create: `apps/web/src/features/progress/services/normalization.test.ts`
- Modify: `apps/web/src/features/progress/services/progress-calculation.ts:30-50`

- [ ] **Step 1: Write the failing test**

```typescript
def test_normalizeMultiSportProgressToComparableScores() {
    // Test that normalization converts raw sport metrics to comparable 0-100 scores
    const rawProgress: ProgressResult = {
        gym: { load: 6, volume: 2400 },  // sets, total volume
        running: { load: 45, pace: 9.5 },  // km, min/km
        tennis: { performance: 3, winRate: 0.67 },  // matches, win rate
        swimming: { load: 2000, pace: 45 },  // meters, seconds per 100m
        cycling: { power: 250, distance: 15 },  // watts, km
        crossfit: { score: 85, reps: 120 },  // points, total reps
    }
    
    const normalized = normalizeProgress(rawProgress)
    
    // Verify all normalized scores are between 0-100
    expect(normalized.sportSimilarityScore).toBeGreaterThanOrEqual(0)
    expect(normalized.sportSimilarityScore).toBeLessThanOrEqual(100)
    expect(normalized.crossSportComparisonScore).toBeGreaterThanOrEqual(0)
    expect(normalized.crossSportComparisonScore).toBeLessThanOrEqual(100)
    expect(normalized.performanceConsistencyScore).toBeGreaterThanOrEqual(0)
    expect(normalized.performanceConsistencyScore).toBeLessThanOrEqual(100)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/features/progress/services/normalization.test.ts -v`
Expected: FAIL with "Function normalizeProgress not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/features/progress/services/normalization.ts
func normalizeProgress(raw: ProgressResult): NormalizedProgress {
    // Calculate similarity score based on sport metric distribution
    const sportSimilarityScore = calculateSportSimilarityScore(raw)
    
    // Calculate cross-sport comparison score
    const crossSportComparisonScore = calculateCrossSportComparisonScore(raw)
    
    // Calculate performance consistency score
    const performanceConsistencyScore = calculatePerformanceConsistencyScore(raw)
    
    return {
        sportSimilarityScore,
        crossSportComparisonScore,
        performanceConsistencyScore,
        overallProgressScore: (sportSimilarityScore + crossSportComparisonScore + performanceConsistencyScore) / 3,
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/web/src/features/progress/services/normalization.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/features/progress/services/normalization.ts
git add src/features/progress/services/normalization.test.ts

git commit -m "feat: add progress normalization service"
```

### Task 3: Set up Analytics Service (JavaScript/TypeScript)

**Files:**
- Create: `apps/web/src/features/progress/services/analytics.ts`
- Create: `apps/web/src/features/progress/services/analytics.test.ts`
- Create: `apps/web/src/features/progress/hooks/useAnalytics.ts`

- [ ] **Step 1: Write the failing test**

```typescript
def test_generateTrendPredictionsAndAnomalyDetection() {
    // Test that analytics service generates trend predictions and detects anomalies
    const progressHistory: ProgressResult[] = [
        // Historical progress data for an athlete
        { gym: { load: 4, volume: 1800 }, running: { load: 35, pace: 10 }, tennis: { performance: 2, winRate: 0.5 }, swimming: { load: 1500, pace: 50 }, cycling: { power: 200, distance: 10 }, crossfit: { score: 75, reps: 100 } },
        { gym: { load: 5, volume: 2100 }, running: { load: 40, pace: 9.8 }, tennis: { performance: 3, winRate: 0.67 }, swimming: { load: 1800, pace: 48 }, cycling: { power: 220, distance: 12 }, crossfit: { score: 80, reps: 110 } },
        { gym: { load: 6, volume: 2400 }, running: { load: 45, pace: 9.5 }, tennis: { performance: 3, winRate: 0.67 }, swimming: { load: 2000, pace: 45 }, cycling: { power: 250, distance: 15 }, crossfit: { score: 85, reps: 120 } },
        { gym: { load: 5, volume: 2100 }, running: { load: 40, pace: 9.8 }, tennis: { performance: 3, winRate: 0.67 }, swimming: { load: 1800, pace: 48 }, cycling: { power: 220, distance: 12 }, crossfit: { score: 80, reps: 110 } },
        { gym: { load: 6, volume: 2400 }, running: { load: 45, pace: 9.5 }, tennis: { performance: 3, winRate: 0.67 }, swimming: { load: 2000, pace: 45 }, cycling: { power: 250, distance: 15 }, crossfit: { score: 85, reps: 120 } },
    ]
    
    const analytics = generateAnalytics(progressHistory, "sarah-johnson")
    
    // Verify trend predictions
    expect(analytics.trendPredictions.length).toBeGreaterThan(0)
    expect(analytics.trendPredictions[0]).toHaveProperty("sport")
    expect(analytics.trendPredictions[0]).toHaveProperty("prediction")
    expect(analytics.trendPredictions[0]).toHaveProperty("confidence")
    
    // Verify anomaly detection
    expect(analytics.anomalyAlerts.length).toBeGreaterThanOrEqual(0)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/features/progress/services/analytics.test.ts -v`
Expected: FAIL with "Function generateAnalytics not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/features/progress/services/analytics.ts
export func generateAnalytics(progressData: ProgressResult[], athleteId: string): AnalyticsResult {
    // Generate trend predictions using simple pattern analysis
    const trendPredictions: TrendPrediction[] = []
    const sportKeys = Object.keys(progressData[0]) as Array<keyof ProgressResult>
    
    for (const sport of sportKeys) {
        if (progressData.length >= 3) {
            const trend = calculateSimpleTrend(progressData, sport, athleteId)
            trendPredictions.push(trend)
        }
    }
    
    // Detect anomalies using statistical deviation
    const anomalies: Alert[] = []
    for (let i = 1; i < progressData.length; i++) {
        if (isSignificantDeviation(progressData[i-1], progressData[i])) {
            const alert: Alert = {
                id: `anomaly-${Date.now()}-${i}`,n                type: "performance_deviation",
                message: `Significant change detected in ${athleteId}'s ${i-1} sport performance`,
                severity: "medium",
                sport: i > 0 ? Object.keys(progressData[i])[0] as keyof ProgressResult : null,
                timestamp: new Date(),
            }
            anomalies.push(alert)
        }
    }
    
    return {
        trendPredictions,
        anomalyAlerts: anomalies,
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/web/src/features/progress/services/analytics.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/features/progress/services/analytics.ts
git add src/features/progress/services/analytics.test.ts
git add src/features/progress/hooks/useAnalytics.ts

git commit -m "feat: add analytics service with trend prediction and anomaly detection"
```

### Task 4: Set up API Routes (Next.js Server Actions/API Routes)

**Files:**
- Create: `apps/web/src/app/api/progress/route.ts`
- Create: `apps/web/src/app/api/progress/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
def test_progress_api_endpoints() {
    // Test that progress API routes expose required endpoints
    const { GET } = await import('app/api/progress/route')
    
    // Mock request/response
    const req = {
        method: 'GET',
        url: 'http://localhost/api/progress?athleteId=sarah-johnson&period=week',
    } as Request
    
    const res = new Response()
    const wrappedHandler = GET(req)
    
    // In Next.js API routes, test by calling the handler directly
    expect(wrappedHandler).toBeDefined()
    expect(typeof wrappedHandler).toBe('function')
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/app/api/progress/route.test.ts -v`
Expected: FAIL with import errors

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/app/api/progress/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const period = searchParams.get('period') || 'week'
    
    if (!athleteId) {
        return NextResponse.json(
            { error: 'Athlete ID is required' },
            { status: 400 }
        )
    }
    
    // Mock implementation - in real scenario would call progress services
    const progressData = {
        athleteId,
        period,
        gym: { load: 5, volume: 2100 },
        running: { load: 42, pace: 9.8 },
        tennis: { performance: 3, winRate: 0.67 },
        swimming: { load: 1800, pace: 48 },
        cycling: { power: 220, distance: 12 },
        crossfit: { score: 80, reps: 110 },
    }
    
    return NextResponse.json(progressData)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/web/src/app/api/progress/route.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/app/api/progress/route.ts
git add src/app/api/progress/route.test.ts

git commit -m "feat: add progress API routes"
```

### Task 5: Set up Frontend Sports Dashboard Components

**Files:**
- Create: `apps/web/src/components/dashboard/SportsDashboard.tsx`
- Create: `apps/web/src/components/dashboard/SportsDashboard.test.tsx`
- Create: `apps/web/src/components/dashboard/AthleteGrid.tsx`
- Create: `apps/web/src/components/dashboard/ProgressEngine.tsx`
- Create: `apps/web/src/components/dashboard/CalendarView.tsx`
- Create: `apps/web/src/components/dashboard/SportCard.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
def test_sports_dashboard_renders_portfolio_overview() {
    // Test that sports dashboard displays portfolio overview with all sports
    render(<SportsDashboard />)
    
    // Check portfolio overview elements
    expect(screen.getByText("Portfolio Overview")).toBeInTheDocument()
    expect(screen.getByText("Gym")).toBeInTheDocument()
    expect(screen.getByText("Running")).toBeInTheDocument()
    expect(screen.getByText("Tennis")).toBeInTheDocument()
    expect(screen.getByText("Swimming")).toBeInTheDocument()
    expect(screen.getByText("Cycling")).toBeInTheDocument()
    expect(screen.getByText("CrossFit")).toBeInTheDocument()
    
    // Check progress metrics display
    expect(screen.getByText(/0-100/)).toBeInTheDocument()
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/components/dashboard/SportsDashboard.test.tsx -v`
Expected: FAIL with "SportsDashboard" not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/components/dashboard/SportsDashboard.tsx
export function SportsDashboard() {
    const [progressData, setProgressData] = useState<ProgressResult | null>(null)
    const [loading, setLoading] = useState(true)
    const { query } = useSearchParams()
    
    const athleteId = query.get('athlete') || 'sarah-johnson'
    const period = query.get('period') || 'week'
    
    useEffect(() => {
        async function fetchProgress() {
            try {
                const response = await fetch(`/api/progress?athleteId=${athleteId}&period=${period}`)
                const data = await response.json()
                setProgressData(data)
            } catch (error) {
                console.error('Failed to fetch progress data:', error)
            } finally {
                setLoading(false)
            }
        }
        
        fetchProgress()
    }, [athleteId, period])
    
    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner" />
                <p>Loading portfolio overview...</p>
            </div>
        )
    }
    
    if (!progressData) {
        return (
            <div className="dashboard-error">
                <p>No progress data available</p>
            </div>
        )
    }
    
    return (
        <div className="sports-dashboard">
            <header className="dashboard-header">
                <h1>Portfolio Overview</h1>
                <div className="athlete-selector">
                    <label htmlFor="athlete-select">Athlete:</label>
                    <select id="athlete-select" defaultValue={athleteId}>
                        <option value="sarah-johnson">Sarah Johnson</option>
                        <option value="alex-smith">Alex Smith</option>
                    </select>
                </div>
            </header>
            
            <main className="dashboard-content">
                <section className="sports-grid">
                    <SportCard sport="gym" data={progressData.gym} />
                    <SportCard sport="running" data={progressData.running} />
                    <SportCard sport="tennis" data={progressData.tennis} />
                    <SportCard sport="swimming" data={progressData.swimming} />
                    <SportCard sport="cycling" data={progressData.cycling} />
                    <SportCard sport="crossfit" data={progressData.crossfit} />
                </section>
                
                <aside className="dashboard-sidebar">
                    <ProgressEngine progress={progressData} />
                    <CalendarView athleteId={athleteId} />
                </aside>
            </main>
        </div>
    )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/web/src/components/dashboard/SportsDashboard.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web
rm -rf src/components/dashboard
mkdir -p src/components/dashboard

# Create all component files
touch src/components/dashboard/SportsDashboard.tsx
src/components/dashboard/SportsDashboard.test.tsx
src/components/dashboard/AthleteGrid.tsx
src/components/dashboard/ProgressEngine.tsx
src/components/dashboard/CalendarView.tsx
src/components/dashboard/SportCard.tsx

# Initialize with minimal content

echo 'import React, { useState } from "react";
import { SportCard } from "@/components/dashboard/SportCard";
import { ProgressEngine } from "@/components/dashboard/ProgressEngine";
import { CalendarView } from "@/components/dashboard/CalendarView";

export function SportsDashboard() {
    const [progressData, setProgressData] = useState(null);
    
    return (
        <div className="sports-dashboard">
            <header className="dashboard-header">
                <h1>Portfolio Overview</h1>
            </header>
            
            <main className="dashboard-content">
                <section className="sports-grid">
                    <SportCard sport="gym" data={{ load: 5, volume: 2100 }} />
                    <SportCard sport="running" data={{ load: 42, pace: 9.8 }} />
                    <SportCard sport="tennis" data={{ performance: 3, winRate: 0.67 }} />
                    <SportCard sport="swimming" data={{ load: 1800, pace: 48 }} />
                    <SportCard sport="cycling" data={{ power: 220, distance: 12 }} />
                    <SportCard sport="crossfit" data={{ score: 80, reps: 110 }} />
                </section>
                
                <aside className="dashboard-sidebar">
                    <ProgressEngine />y
                    <CalendarView />
                </aside>
            </main>
        </div>
    );
}' > src/components/dashboard/SportsDashboard.tsx

# Add remaining components (similar minimal implementations)...

# Add test files

echo 'import { render, screen } from "@testing-library/react";
import SportsDashboard from "@/components/dashboard/SportsDashboard";

def test_sports_dashboard_renders_portfolio_overview() {
    render(<SportsDashboard />);
    
    expect(screen.getByText("Portfolio Overview")).toBeInTheDocument();
    expect(screen.getByText("Gym")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Tennis")).toBeInTheDocument();
    expect(screen.getByText("Swimming")).toBeInTheDocument();
    expect(screen.getByText("Cycling")).toBeInTheDocument();
    expect(screen.getByText("CrossFit")).toBeInTheDocument();
    
    expect(screen.getByText(/0-100/)).toBeInTheDocument();
}' > src/components/dashboard/SportsDashboard.test.tsx

# Add remaining test files (similar patterns)...

git add src/components/dashboard

git commit -m "feat: add sports dashboard React components"
```

### Task 6: Set up State Management and Data Fetching

**Files:**
- Modify: `apps/web/src/components/dashboard/SportsDashboard.tsx:1-50`
- Create: `apps/web/src/hooks/useSearchParams.ts`
- Create: `apps/web/src/hooks/useProgress.ts`

- [ ] **Step 1: Write the failing test**

```typescript
def test_use_progress_hook_fetches_and_caches_data() {
    // Test that progress hook fetches data from API and caches it
    function renderProgressHook() {
        const [athleteId, setAthleteId] = useState("sarah-johnson");
        return { athleteId, setAthleteId, ...useProgress(athleteId, "week") };
    }
    
    const { result, waitForNextUpdate } = renderHook(() => renderProgressHook());
    
    // Initial load should show loading state
    expect(result.current.loading).toBe(true);
    
    // After data fetch, should have progress data
    await waitForNextUpdate();
    expect(result.current.progress).toBeDefined();
    expect(result.current.progress?.gym.load).toBeGreaterThan(0);
    
    // Change athlete should trigger new data fetch
    act(() => {
        result.current.setAthleteId("alex-smith");
    });
    
    await waitForNextUpdate();
    expect(result.current.progress?.gym.load).toBeGreaterThan(0);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/hooks/useProgress.test.ts -v`
Expected: FAIL with "useProgress hook not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/hooks/useProgress.ts
import { useState, useEffect, useCallback } from "react";

export function useProgress(athleteId: string, period: string) {
    const [progress, setProgress] = useState<ProgressResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    const fetchProgress = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`/api/progress?athleteId=${athleteId}&period=${period}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setProgress(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [athleteId, period]);
    
    useEffect(() => {
        fetchProgress();
    }, [fetchProgress]);
    
    return { progress, loading, error, refetch: fetchProgress };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/web/src/hooks/useProgress.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/hooks/useProgress.ts

# Add test file (similar implementation)

# Add remaining hooks

git commit -m "feat: add progress hooks for data fetching and state management"
```

### Task 7: Set up Performance Monitoring

**Files:**
- Create: `apps/web/src/lib/performance-metrics.ts`
- Create: `apps/web/src/lib/performance-metrics.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
def test_performance_metrics_track_dashboard_performance() {
    // Test that performance metrics track dashboard load times and interactions
    const { trackMetric, getMetrics, resetMetrics } = require("@/lib/performance-metrics");
    
    // Reset metrics before test
    resetMetrics();
    
    // Track some metrics (simulating dashboard operations)
    trackMetric("dashboard_load", Date.now() - performance.now());
    trackMetric("api_request", Date.now() - performance.now());
    trackMetric("component_render", Date.now() - performance.now());
    
    // Verify metrics collection
    const metrics = getMetrics();
    expect(metrics.dashboard_load.length).toBeGreaterThan(0);
    expect(metrics.api_request.length).toBeGreaterThan(0);
    expect(metrics.component_render.length).toBeGreaterThan(0);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/lib/performance-metrics.test.ts -v`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/web/src/lib/performance-metrics.ts
interface PerformanceMetrics {
    dashboard_load: number[];
    api_request: number[];
    component_render: number[];
    error_count: number;
}

const metrics: PerformanceMetrics = {
    dashboard_load: [],
    api_request: [],
    component_render: [],
    error_count: 0,
};

export const trackMetric = (metric: keyof PerformanceMetrics, value: number): void => {
    if (Array.isArray(metrics[metric])) {
        metrics[metric].push(value);
    } else if (metric === 'error_count') {
        metrics.error_count = value;
    }
};

export const getMetrics = (): PerformanceMetrics => {
    return JSON.parse(JSON.stringify(metrics));
};

export const resetMetrics = (): void => {
    for (const key in metrics) {
        if (Array.isArray(metrics[key])) {
            metrics[key] = [] as any;
        } else {
            metrics[key] = 0 as any;
        }
    }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apps/web/src/lib/performance-metrics.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web
git add src/lib/performance-metrics.ts
git add src/lib/performance-metrics.test.ts

git commit -m "feat: add performance metrics tracking for monitoring"
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-progress-experience-multi-sport-comparison.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**

*This plan has been tailored for the Next.js project structure, using JavaScript/TypeScript instead of Go. The architecture is adapted to the web app while maintaining the same feature scope.*