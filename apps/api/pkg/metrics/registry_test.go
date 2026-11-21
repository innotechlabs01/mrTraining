package metrics

import (
	"strings"
	"testing"

	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

func TestRegistry_ExposesCounterGaugeHistogramAndCollectors(t *testing.T) {
	reg := NewRegistry()
	c := reg.NewCounter("test_requests_total", "Total requests", "method", "status")
	c.Inc("GET", "200")
	c.Add(2, "GET", "200")

	g := reg.NewGauge("test_workers", "Active workers", "pool")
	g.Set(3, "nats")

	h := reg.NewHistogram("test_latency_seconds", "Latency", []float64{0.1, 0.5}, "route")
	h.Observe(0.05, "/health")
	h.Observe(0.30, "/health")
	h.Observe(1.20, "/health")

	reg.RegisterCollector(func() []Sample {
		return []Sample{{
			Name:   "test_dynamic_gauge",
			Help:   "Dynamic sample",
			Type:   TypeGauge,
			Labels: map[string]string{"name": "db"},
			Value:  42,
		}}
	})

	out := reg.Render()
	for _, want := range []string{
		`# TYPE test_requests_total counter`,
		`test_requests_total{method="GET",status="200"} 3`,
		`test_workers{pool="nats"} 3`,
		`test_latency_seconds_bucket{route="/health",le="0.1"} 1`,
		`test_latency_seconds_bucket{route="/health",le="0.5"} 2`,
		`test_latency_seconds_bucket{route="/health",le="+Inf"} 3`,
		`test_latency_seconds_count{route="/health"} 3`,
		`test_dynamic_gauge{name="db"} 42`,
	} {
		if !strings.Contains(out, want) {
			t.Fatalf("missing %q in rendered metrics:\n%s", want, out)
		}
	}
}

func TestRegisterDefaultCollectors_IncludesResilienceState(t *testing.T) {
	cbReg := resilience.NewRegistry()
	cb := cbReg.Register(resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{Name: "unit-cb"}))
	_ = cb.State()
	RegisterBreakerRegistry(cbReg)

	out := DefaultRegistry.Render()
	if !strings.Contains(out, `circuit_breaker_state{name="unit-cb"} 0`) {
		t.Fatalf("expected breaker gauge in output:\n%s", out)
	}
}
