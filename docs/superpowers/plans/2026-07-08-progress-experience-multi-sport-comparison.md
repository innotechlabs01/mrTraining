# Progress Experience 10 - Multi-Sport Progress Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build unified dashboard for coaches to compare athlete performance across all sports (gym, running, tennis, swimming, cycling, CrossFit) with normalized metrics and real-time insights.

**Architecture:** Microservices architecture with Go backend services (Progress Calculation, Normalization, Analytics) connected via REST APIs to Next.js frontend components. Follow existing MR Training patterns with shadcn/ui design system.

**Tech Stack:** Go (Fiber), PostgreSQL 16+, Next.js 14+, React 18+, TypeScript 5+, Tailwind CSS 3.4+, shadcn/ui, Zustand, TanStack Query, WebSocket for real-time updates, Prometheus/Grafana for monitoring

---

### Task 1: Set up Progress Calculation Service (Go)

**Files:**
- Create: `apps/api/services/progress_calculation.go`
- Create: `apps/api/services/progress_calculation_test.go`
- Create: `apps/api/handlers/progress.go`
- Create: `apps/api/handlers/progress_test.go`

- [ ] **Step 1: Write the failing test**

```go
def test_progress_calculation_handles_sport_specific_metrics() {
    // Test that progress calculation calculates sport-specific metrics
    // including load, recovery, and performance for gym, running, tennis, swimming, cycling, CrossFit
    result = calculate_progress_for_athlete("sarah-johnson", "2026-01-01", "2026-07-08")
    
    // Verify sport-specific metrics are calculated
    assert(result.gym.load > 0)
    assert(result.running.load > 0)
    assert(result.tennis.performance > 0)
    assert(result.swimming.load > 0)
    assert(result.cycling.power > 0)
    assert(result.crossfit.score > 0)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./apps/api/services -v`
Expected: FAIL with "function calculate_progress_for_athlete not defined"

- [ ] **Step 3: Write minimal implementation**

```go
func calculate_progress_for_athlete(athleteID string, startDate, endDate string) (*ProgressResult, error) {
    // Calculate sport-specific metrics from training data
    gymLoad := calculateGymLoad(athleteID, startDate, endDate)
    runDistance := calculateRunningDistance(athleteID, startDate, endDate)
    tennisMatches := calculateTennisMatches(athleteID, startDate, endDate)
    swimLaps := calculateSwimmingProgress(athleteID, startDate, endDate)
    cyclePower := calculateCyclingPower(athleteID, startDate, endDate)
    crossfitScore := calculateCrossfitScore(athleteID, startDate, endDate)
    
    return &ProgressResult{
        Gym: &GymProgress{Load: gymLoad},
        Running: &RunningProgress{Load: runDistance},
        Tennis: &TennisProgress{Performance: tennisMatches},
        Swimming: &SwimmingProgress{Load: swimLaps},
        Cycling: &CyclingProgress{Power: cyclePower},
        Crossfit: &CrossfitProgress{Score: crossfitScore},
    }, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./apps/api/services -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/services/progress_calculation.go apps/api/services/progress_calculation_test.go apps/api/handlers/progress.go apps/api/handlers/progress_test.go
git commit -m "feat: add progress calculation service"
```

### Task 2: Set up Progress Normalization Service (Go)

**Files:**
- Create: `apps/api/services/normalization.go`
- Create: `apps/api/services/normalization_test.go`
- Modify: `apps/api/handlers/progress.go:30-45`

- [ ] **Step 1: Write the failing test**

```go
def test_normalization_converts_raw_metrics_to_normalized_scores() {
    // Test that normalization service converts raw sport metrics to comparable 0-100 scores
    rawMetrics := &ProgressResult{
        Gym: &GymProgress{Load: 6},  // sets
        Running: &RunningProgress{Load: 45},  // km
        Tennis: &TennisProgress{Performance: 3},  // matches won
        Swimming: &SwimmingProgress{Load: 2000},  // meters
        Cycling: &CyclingProgress{Power: 250},  // watts
        Crossfit: &CrossfitProgress{Score: 85},  // points
    }
    
    // Calculate normalized scores
    normalized := normalizeProgress(rawMetrics)
    
    // Verify all normalized scores are between 0-100
    assert(normalized.similarityScore >= 0 && normalized.similarityScore <= 100)
    assert(normalized.crossSportComparisonScore >= 0 && normalized.crossSportComparisonScore <= 100)
    assert(normalized.performanceConsistencyScore >= 0 && normalized.performanceConsistencyScore <= 100)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./apps/api/services -v`
Expected: FAIL with "function normalizeProgress not defined"

- [ ] **Step 3: Write minimal implementation**

```go
func normalizeProgress(raw *ProgressResult) *NormalizedProgress {
    // Calculate similarity score based on sport metric distribution
    similarityScore := calculateSportSimilarityScore(raw)
    
    // Calculate cross-sport comparison score
    comparisonScore := calculateCrossSportComparisonScore(raw)
    
    // Calculate performance consistency score
    consistencyScore := calculatePerformanceConsistencyScore(raw)
    
    return &NormalizedProgress{
        SportSimilarityScore: similarityScore,
        CrossSportComparisonScore: comparisonScore,
        PerformanceConsistencyScore: consistencyScore,
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./apps/api/services -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/services/normalization.go apps/api/services/normalization_test.go
git commit -m "feat: add progress normalization service"
```

### Task 3: Set up Analytics Service (Go)

**Files:**
- Create: `apps/api/services/analytics.go`
- Create: `apps/api/services/analytics_test.go`
- Create: `apps/api/websocket/analytics_ws.go`

- [ ] **Step 1: Write the failing test**

```go
def test_analytics_generates_trend_predictions_and_alerts() {
    // Test that analytics service generates AI-powered trend predictions and anomaly detection
    progressData := [][]ProgressResult{
        // Mock historical progress data for an athlete
        {getProgressForPeriod("2026-01-01", "2026-01-07")},
        {getProgressForPeriod("2026-01-08", "2026-01-14")},
        {getProgressForPeriod("2026-01-15", "2026-01-21")},
        {getProgressForPeriod("2026-01-22", "2026-01-28")},
    }
    
    // Generate predictions and alerts
    predictions, alerts := generateAnalytics(progressData, "sarah-johnson")
    
    // Verify trend prediction for running distance
    assert(len(predictions.TrendPredictions) > 0)
    assert(predictions.TrendPredictions[0].Sport == "running")
    assert(predictions.TrendPredictions[0].PredictionDirection == "increasing")
    
    // Verify anomaly detection
    assert(len(alerts.AnomalyAlerts) >= 0)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./apps/api/services -v`
Expected: FAIL with "function generateAnalytics not defined"

- [ ] **Step 3: Write minimal implementation**

```go
func generateAnalytics(progressData [][]ProgressResult, athleteID string) (*AnalyticsResult, []Alert) {
    // Generate trend predictions using AI algorithms
    trendPredictions := make([]TrendPrediction, 0)
    for sport, _ := range progressData[0] {
        if len(progressData) >= 3 {
            trend := calculateTrendPrediction(progressData, sport, athleteID)
            trendPredictions = append(trendPredictions, trend)
        }
    }
    
    // Detect anomalies in progress patterns
    alerts := make([]Alert, 0)
    for i := 1; i < len(progressData); i++ {
        if isSignificantDeviation(progressData[i-1], progressData[i]) {
            alert := createAnomalyAlert("progress_deviation", athleteID, sport, progressData[i])
            alerts = append(alerts, alert)
        }
    }
    
    return &AnalyticsResult{
        TrendPredictions: trendPredictions,
        AnomalyAlerts: alerts,
    }, alerts
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./apps/api/services -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/services/analytics.go apps/api/services/analytics_test.go apps/api/websocket/analytics_ws.go
git commit -m "feat: add analytics service with WebSocket support"
```

### Task 4: Set up PostgreSQL Database Schema

**Files:**
- Create: `apps/api/migrations/0001_create_progress_tables.up.sql`
- Create: `apps/api/migrations/0001_create_progress_tables.down.sql`
- Create: `apps/api/queries/progress_queries.sql`

- [ ] **Step 1: Write the schema**

```sql
-- Create progress calculations table
CREATE TABLE progress_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id VARCHAR(50) NOT NULL,
    calculation_date DATE NOT NULL,
    gym_load DECIMAL(10, 2),
    gym_volume DECIMAL(10, 2),
    running_distance DECIMAL(10, 2),
    running_elevation DECIMAL(10, 2),
    tennis_matches_played INTEGER,
    tennis_games_won INTEGER,
    swimming_laps DECIMAL(10, 2),
    swimming_distance DECIMAL(10, 2),
    cycling_power_avg DECIMAL(10, 2),
    cycling_distance DECIMAL(10, 2),
    cycling_elevation DECIMAL(10, 2),
    crossfit_workout_count INTEGER,
    crossfit_wod_scores JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress normalization table
CREATE TABLE progress_normalization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_calculation_id UUID REFERENCES progress_calculations(id) ON DELETE CASCADE,
    sport_similarity_score DECIMAL(5, 2) NOT NULL,
    cross_sport_comparison_score DECIMAL(5, 2) NOT NULL,
    performance_consistency_score DECIMAL(5, 2) NOT NULL,
    overall_progress_score DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics alerts table
CREATE TABLE analytics_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    alert_message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_progress_calculations_athlete_date ON progress_calculations(athlete_id, calculation_date);
CREATE INDEX idx_progress_calculations_created_at ON progress_calculations(created_at);
CREATE INDEX idx_analytics_alerts_athlete ON analytics_alerts(athlete_id, is_read);
```

- [ ] **Step 2: Apply migration**

Run: `cd apps/api && go run cmd/migrate/main.go`
Expected: Migration applied successfully

- [ ] **Step 5: Commit**

```bash
git add apps/api/migrations/0001_create_progress_tables.up.sql apps/api/migrations/0001_create_progress_tables.down.sql apps/api/queries/progress_queries.sql
git commit -m "feat: add PostgreSQL schema for progress tracking"
```

### Task 5: Set up API Gateway (Fiber)

**Files:**
- Create: `apps/api/routes/progress_routes.go`
- Create: `apps/api/routes/progress_routes_test.go`

- [ ] **Step 1: Write the failing test**

```go
def test_progress_routes_handle_api_endpoints() {
    // Test that progress routes expose required API endpoints
    router := setup_test_router()
    
    // Test GET /api/progress/athlete/{athleteId} - Get athlete progress
    req, _ := http.NewRequest("GET", "/api/progress/athlete/sarah-johnson", nil)
    resp := httptest.NewRecorder()
    router.ServeHTTP(resp, req)
    
    assert(resp.Code == http.StatusOK)
    assert(strings.Contains(resp.Body.String(), "gym"))
    assert(strings.Contains(resp.Body.String(), "running"))
    
    // Test GET /api/progress/comparison - Cross-sport comparison
    req, _ = http.NewRequest("GET", "/api/progress/comparison?athleteId=sarah-johnson&period=week", nil)
    resp = httptest.NewRecorder()
    router.ServeHTTP(resp, req)
    
    assert(resp.Code == http.StatusOK)
    assert(strings.Contains(resp.Body.String(), "normalized"))
    assert(strings.Contains(resp.Body.String(), "sports"))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./apps/api/routes -v`
Expected: FAIL with "function setupTestRouter not defined"

- [ ] **Step 3: Write minimal implementation**

```go
// progress_routes.go
func setupProgressRoutes(router *fiber.App) {
    api := router.Group("/api/progress")
    
    // Athlete-specific progress endpoints
    api.Get("/athlete/:athleteId", getAthleteProgress)
    api.Get("/athlete/:athleteId/compare", getCrossSportComparison)
    api.Get("/analytics/:athleteId", getAnalytics)
    
    // WebSocket endpoints for real-time updates
    api.Get("/ws/analytics", analyticsWebSocket)
}

func getAthleteProgress(c *fiber.Ctx) error {
    athleteId := c.Params("athleteId")
    period := c.Query("period", "week")
    
    // Get progress calculations for athlete
    progress, err := calculateProgressForAthlete(athleteId, period)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }
    
    return c.JSON(progress)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./apps/api/routes -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/routes/progress_routes.go apps/api/routes/progress_routes_test.go
git commit -m "feat: add API routes for progress endpoints"
```

### Task 6: Set up Frontend Sports Dashboard (React)

**Files:**
- Create: `apps/web/src/components/dashboard/SportsDashboard.tsx`
- Create: `apps/web/src/components/dashboard/SportsDashboard.test.tsx`
- Create: `apps/web/src/components/dashboard/AthleteGrid.tsx`
- Create: `apps/web/src/components/dashboard/ProgressEngine.tsx`
- Create: `apps/web/src/components/dashboard/CalendarView.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
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

Run: `cd apps/web && npm test -- SportsDashboard.test.tsx -v`
Expected: FAIL with "SportsDashboard" not defined

- [ ] **Step 3: Write minimal implementation**

```tsx
// SportsDashboard.tsx
export function SportsDashboard() {
    const [progressData, setProgressData] = useState<ProgressResult | null>(null)
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
        async function fetchProgress() {
            const response = await fetch('/api/progress/athlete/sarah-johnson?period=week')
            const data = await response.json()
            setProgressData(data)
            setLoading(false)
        }
        
        fetchProgress()
    }, [])
    
    if (loading) {
        return <div>Loading portfolio overview...</div>
    }
    
    return (
        <div className="sports-dashboard">
            <div className="portfolio-overview">
                <h2>Portfolio Overview</h2>
                <div className="sports-grid">
                    <div className="sport-card">
                        <h3>Gym</h3>
                        <div className="metric">Load: {progressData?.gym.load}</div>
                        <div className="normalized-score">Score: {progressData?.overallProgressScore}</div>
                    </div>
                    // Other sports cards...
                </div>
            </div>
            <AthleteGrid />
            <ProgressEngine />
            <CalendarView />
        </div>
    )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npm test -- SportsDashboard.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web && git add src/components/dashboard/SportsDashboard.tsx src/components/dashboard/SportsDashboard.test.tsx
apps/web && git add src/components/dashboard/AthleteGrid.tsx
apps/web && git add src/components/dashboard/ProgressEngine.tsx
apps/web && git add src/components/dashboard/CalendarView.tsx
git commit -m "feat: add sports dashboard React components"
```

### Task 7: Set up WebSocket for Real-time Updates

**Files:**
- Create: `apps/api/websocket/manager.go`
- Create: `apps/api/websocket/analytics_ws.go`
- Create: `apps/api/handlers/websocket_handler.go`

- [ ] **Step 1: Write the failing test**

```go
def test_websocket_connection_establishes_real_time_updates() {
    // Test that WebSocket connection establishes real-time progress updates
    // Create WebSocket server
    server := NewWebSocketServer()
    
    // Start server in goroutine
    go server.Start(":8080")
    defer server.Stop()
    
    // Wait for server to start
    time.Sleep(100 * time.Millisecond)
    
    // Connect to WebSocket
    conn, _, err := websocket.Dial("ws://localhost:8080/ws/analytics", "", "http://localhost")
    assert.NoError(err)
    defer conn.Close()
    
    // Send subscription message
    subscription := WebSocketMessage{
        Type: "subscribe",
        Data: map[string]string{"athlete_id": "sarah-johnson"},
    }
    
    err = conn.WriteJSON(subscription)
    assert.NoError(err)
    
    // Read response (initial progress update)
    var response WebSocketMessage
    err = conn.ReadJSON(&response)
    assert.NoError(err)
    
    // Verify response contains progress data
    assert response.Type == "progress_update"
    assert(len(response.Data) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./apps/api/websocket -v`
Expected: FAIL with WebSocket setup functions not defined

- [ ] **Step 3: Write minimal implementation**

```go
// websocket_manager.go
func NewWebSocketServer() *WebSocketServer {
    clients := make(map[*websocket.Conn]bool)
    broadcasts := make(chan WebSocketMessage)
    
    server := &WebSocketServer{
        Clients: clients,
        Broadcasts: broadcasts,
        Register: make(chan *websocket.Conn),
        Unregister: make(chan *websocket.Conn),
    }
    
    return server
}

func (s *WebSocketServer) Start(addr string) {
    listener, _ := net.Listen("tcp", addr)
    s.Listener = listener
    
    go s.acceptConnections()
    go s.broadcastMessages()
}

func (s *WebSocketServer) acceptConnections() {
    for {
        conn, err := s.Listener.Accept()
        if err != nil {
            break
        }
        
        s.Register <- conn
        go s.handleClient(conn)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./apps/api/websocket -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/websocket/manager.go apps/api/websocket/analytics_ws.go apps/api/handlers/websocket_handler.go
git commit -m "feat: add WebSocket server for real-time updates"
```

### Task 8: Set up Performance Monitoring

**Files:**
- Create: `apps/api/monitoring/prometheus_metrics.go`
- Create: `apps/api/monitoring/metrics_test.go`

- [ ] **Step 1: Write the failing test**

```go
def test_prometheus_metrics_tracking_system_performance() {
    // Test that Prometheus metrics track system performance
    // Reset metrics before test
    prometheus_metrics.RequestsTotal.Reset()
    prometheus_metrics.RequestDuration.Reset()
    
    // Record some metrics
    prometheus_metrics.RequestsTotal.WithLabelValues("GET", "/api/progress/athlete/sarah-johnson", "200").Inc()
    prometheus_metrics.RequestDuration.WithLabelValues("GET", "/api/progress/athlete/sarah-johnson").Observe(0.150)
    
    // Verify metrics collection
    requestsTotal := prometheus_metrics.RequestsTotal.WithLabelValues("GET", "/api/progress/athlete/sarah-johnson", "200").Value()
    assert requestsTotal == 1.0
    
    duration := prometheus_metrics.RequestDuration.WithLabelValues("GET", "/api/progress/athlete/sarah-johnson").Value()
    assert duration > 0.0
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./apps/api/monitoring -v`
Expected: FAIL with Prometheus metric definitions not defined

- [ ] **Step 3: Write minimal implementation**

```go
// prometheus_metrics.go
// Prometheus metrics for performance monitoring
var (
    RequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status_code"},
    )
    
    RequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )
    
    ProgressCalculationDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "progress_calculation_duration_seconds",
            Help: "Progress calculation duration in seconds",
            Buckets: prometheus.LinearBuckets(0.001, 0.001, 100),
        },
        []string{"sport"},
    )
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./apps/api/monitoring -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/monitoring/prometheus_metrics.go apps/api/monitoring/metrics_test.go
git commit -m "feat: add Prometheus metrics for monitoring"
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-08-progress-experience-multi-sport-comparison.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**