package metrics

import (
	"database/sql"
	"runtime"
	"sync"
	"time"

	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

// DefaultRegistry holds process-wide API and worker metrics exported at /metrics.
var DefaultRegistry = NewRegistry()

var (
	HTTPRequestsTotal = DefaultRegistry.NewCounter(
		"http_requests_total",
		"Total HTTP requests processed by Fiber router.",
		"method", "route", "status",
	)
	HTTPRequestDurationSeconds = DefaultRegistry.NewHistogram(
		"http_request_duration_seconds",
		"HTTP request latency distribution in seconds.",
		[]float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		"method", "route",
	)
	ExternalCallDurationSeconds = DefaultRegistry.NewHistogram(
		"external_call_duration_seconds",
		"Duration of outbound calls to third-party APIs and infrastructure.",
		[]float64{0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		"dependency", "outcome",
	)
	ExternalCallsTotal = DefaultRegistry.NewCounter(
		"external_calls_total",
		"Total outbound dependency calls partitioned by outcome.",
		"dependency", "outcome",
	)
	CircuitBreakerTransitionsTotal = DefaultRegistry.NewCounter(
		"circuit_breaker_transitions_total",
		"Circuit breaker state transitions.",
		"name", "from", "to",
	)
	CacheOperationsTotal = DefaultRegistry.NewCounter(
		"cache_operations_total",
		"Cache operations partitioned by operation and result.",
		"op", "result",
	)
	OutboxEventsPublishedTotal = DefaultRegistry.NewCounter(
		"outbox_events_published_total",
		"Outbox relay publication attempts partitioned by event_type and status.",
		"event_type", "status",
	)
	OutboxPendingGauge = DefaultRegistry.NewGauge(
		"outbox_pending_events",
		"Current number of pending/failed outbox events observed by relay.",
	)
	OutboxDeadGauge = DefaultRegistry.NewGauge(
		"outbox_dead_events",
		"Current number of dead-lettered outbox events observed by relay.",
	)
	NATSConsumerMessagesTotal = DefaultRegistry.NewCounter(
		"nats_consumer_messages_total",
		"NATS JetStream worker messages processed partitioned by subject and outcome.",
		"subject", "outcome",
	)
	NATSConsumerDurationSeconds = DefaultRegistry.NewHistogram(
		"nats_consumer_duration_seconds",
		"NATS JetStream worker handler execution duration in seconds.",
		[]float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5},
		"subject",
	)
	WebhooksReceivedTotal = DefaultRegistry.NewCounter(
		"webhooks_received_total",
		"Inbound webhooks processed partitioned by provider and outcome.",
		"provider", "outcome",
	)
	IdempotencyHitsTotal = DefaultRegistry.NewCounter(
		"idempotency_hits_total",
		"HTTP Idempotency-Key lookups partitioned by outcome.",
		"outcome",
	)
)

var (
	runtimeRegistered sync.Once
	resilienceOnce    sync.Once
)

// RegisterDefaultCollectors wires Go runtime stats and the default circuit
// breaker registry onto DefaultRegistry (safe to call repeatedly).
func RegisterDefaultCollectors() {
	runtimeRegistered.Do(func() {
		DefaultRegistry.RegisterCollector(func() []Sample {
			var ms runtime.MemStats
			runtime.ReadMemStats(&ms)
			return []Sample{
				{
					Name:  "go_goroutines",
					Help:  "Number of goroutines currently active.",
					Type:  TypeGauge,
					Value: float64(runtime.NumGoroutine()),
				},
				{
					Name:  "go_mem_alloc_bytes",
					Help:  "Bytes of allocated heap objects.",
					Type:  TypeGauge,
					Value: float64(ms.HeapAlloc),
				},
			}
		})
	})

	resilienceOnce.Do(func() {
		RegisterBreakerRegistry(resilience.DefaultRegistry)
		resilience.SetDefaultOnStateChange(func(name string, from, to resilience.State) {
			CircuitBreakerTransitionsTotal.Inc(name, from.String(), to.String())
		})
		resilience.SetHTTPObserver(func(dependency, outcome string, d time.Duration) {
			ExternalCallsTotal.Inc(dependency, outcome)
			ExternalCallDurationSeconds.Observe(d.Seconds(), dependency, outcome)
		})
	})
}

// RegisterBreakerRegistry exposes all CircuitBreakers in reg on DefaultRegistry.
func RegisterBreakerRegistry(reg *resilience.Registry) {
	if reg == nil {
		return
	}
	DefaultRegistry.RegisterCollector(func() []Sample {
		snap := reg.Snapshot()
		out := make([]Sample, 0, len(snap)*2)
		for _, item := range snap {
			val := 0.0
			switch item.State {
			case "open":
				val = 1.0
			case "half-open":
				val = 2.0
			}
			out = append(out,
				Sample{
					Name:   "circuit_breaker_state",
					Help:   "Circuit breaker state (0=closed, 1=open, 2=half-open).",
					Type:   TypeGauge,
					Labels: map[string]string{"name": item.Name},
					Value:  val,
				},
				Sample{
					Name:   "circuit_breaker_consecutive_failures",
					Help:   "Current consecutive failures recorded by the breaker.",
					Type:   TypeGauge,
					Labels: map[string]string{"name": item.Name},
					Value:  float64(item.Counts.ConsecutiveFailures),
				},
			)
		}
		return out
	})
}

// RegisterDBStats exports sql.DB pool statistics on DefaultRegistry.
func RegisterDBStats(db *sql.DB) {
	if db == nil {
		return
	}
	DefaultRegistry.RegisterCollector(func() []Sample {
		st := db.Stats()
		return []Sample{
			{Name: "db_pool_connections_open", Help: "Number of open database connections.", Type: TypeGauge, Value: float64(st.OpenConnections)},
			{Name: "db_pool_connections_in_use", Help: "Number of connections currently in use.", Type: TypeGauge, Value: float64(st.InUse)},
			{Name: "db_pool_connections_idle", Help: "Number of idle database connections.", Type: TypeGauge, Value: float64(st.Idle)},
			{Name: "db_pool_wait_count_total", Help: "Total number of connections waited for.", Type: TypeCounter, Value: float64(st.WaitCount)},
		}
	})
}
