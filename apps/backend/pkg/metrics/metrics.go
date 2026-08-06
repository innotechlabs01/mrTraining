package metrics

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/adaptor/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	HTTPRequestsInFlight = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "http_requests_in_flight",
			Help: "Current number of in-flight HTTP requests",
		},
		[]string{"method", "path"},
	)

	DatabaseQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "database_query_duration_seconds",
			Help:    "Database query latency in seconds",
			Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1},
		},
		[]string{"query", "table"},
	)

	CacheHitsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"cache", "operation"},
	)

	CacheMissesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"cache", "operation"},
	)

	BusinessEventsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "business_events_total",
			Help: "Total number of business events",
		},
		[]string{"event", "status"},
	)

	WorkoutCompletedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "workout_completed_total",
			Help: "Total number of workouts completed",
		},
	)

	WorkoutAssignedTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "workout_assigned_total",
			Help: "Total number of workouts assigned to athletes",
		},
	)

	ActiveAthletes = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_athletes",
			Help: "Number of active athletes",
		},
	)

	ActiveCoaches = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_coaches",
			Help: "Number of active coaches",
		},
	)
)

func RecordHTTPRequest(method, path string, status int, duration time.Duration) {
	HTTPRequestsTotal.WithLabelValues(method, path, fmtStatus(status)).Inc()
	HTTPRequestDuration.WithLabelValues(method, path).Observe(duration.Seconds())
}

func fmtStatus(s int) string {
	switch {
	case s >= 500:
		return "5xx"
	case s >= 400:
		return "4xx"
	case s >= 300:
		return "3xx"
	case s >= 200:
		return "2xx"
	default:
		return "1xx"
	}
}

func RecordDBQuery(query, table string, duration time.Duration) {
	DatabaseQueryDuration.WithLabelValues(query, table).Observe(duration.Seconds())
}

func RecordCacheHit(cache, operation string) {
	CacheHitsTotal.WithLabelValues(cache, operation).Inc()
}

func RecordCacheMiss(cache, operation string) {
	CacheMissesTotal.WithLabelValues(cache, operation).Inc()
}

func RecordBusinessEvent(event, status string) {
	BusinessEventsTotal.WithLabelValues(event, status).Inc()
}

func IncrementWorkoutsCompleted() {
	WorkoutCompletedTotal.Inc()
}

func IncrementWorkoutsAssigned() {
	WorkoutAssignedTotal.Inc()
}

func MetricsMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		path := c.Route().Path
		if path == "" {
			path = c.Path()
		}

		HTTPRequestsInFlight.WithLabelValues(c.Method(), path).Inc()
		defer HTTPRequestsInFlight.WithLabelValues(c.Method(), path).Dec()

		err := c.Next()

		duration := time.Since(start)
		RecordHTTPRequest(c.Method(), path, c.Response().StatusCode(), duration)

		return err
	}
}

func FiberMetricsHandler() fiber.Handler {
	return adaptor.HTTPHandler(promhttp.Handler())
}
