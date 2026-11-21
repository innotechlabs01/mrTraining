package resilience

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestCircuitBreaker_LifecycleClosedOpenHalfOpenClosed(t *testing.T) {
	now := time.Unix(1700000000, 0)
	var mu sync.Mutex
	var transitions []string

	cb := NewCircuitBreaker(CircuitBreakerConfig{
		Name:                "wompi",
		FailureThreshold:    3,
		ResetTimeout:        10 * time.Second,
		HalfOpenMaxRequests: 1,
		SuccessThreshold:    2,
		Now:                 func() time.Time { return now },
		OnStateChange: func(name string, from, to State) {
			mu.Lock()
			transitions = append(transitions, name+":"+from.String()+"->"+to.String())
			mu.Unlock()
		},
	})

	downErr := errors.New("upstream 503")
	for i := 0; i < 3; i++ {
		if err := cb.Execute(context.Background(), func(context.Context) error { return downErr }); !errors.Is(err, downErr) {
			t.Fatalf("attempt %d: got %v", i, err)
		}
	}
	if cb.State() != StateOpen {
		t.Fatalf("expected Open after 3 failures, got %s", cb.State())
	}

	// Calls while open fail fast with ErrCircuitOpen
	called := false
	err := cb.Execute(context.Background(), func(context.Context) error {
		called = true
		return nil
	})
	if !errors.Is(err, ErrCircuitOpen) || called {
		t.Fatalf("expected ErrCircuitOpen without calling fn, got err=%v called=%v", err, called)
	}

	// Advance clock past ResetTimeout -> HalfOpen -> requires 2 consecutive successes
	now = now.Add(11 * time.Second)
	if cb.State() != StateHalfOpen {
		t.Fatalf("expected HalfOpen after reset timeout, got %s", cb.State())
	}

	if err := cb.Execute(context.Background(), func(context.Context) error { return nil }); err != nil {
		t.Fatalf("first probe failed: %v", err)
	}
	if cb.State() != StateHalfOpen {
		t.Fatalf("expected still HalfOpen after 1/2 probes, got %s", cb.State())
	}
	if err := cb.Execute(context.Background(), func(context.Context) error { return nil }); err != nil {
		t.Fatalf("second probe failed: %v", err)
	}
	if cb.State() != StateClosed {
		t.Fatalf("expected Closed after 2 consecutive successes, got %s", cb.State())
	}
}

func TestCircuitBreaker_IgnoresNonRetryable4xxErrors(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{
		Name:             "client-err",
		FailureThreshold: 2,
	})

	clientErr := MarkNonRetryable(&HTTPError{StatusCode: 400, Body: "bad payload"})
	for i := 0; i < 5; i++ {
		_ = cb.Execute(context.Background(), func(context.Context) error { return clientErr })
	}
	if cb.State() != StateClosed {
		t.Fatalf("expected Closed for 4xx client errors, got %s", cb.State())
	}
}

func TestCircuitBreaker_HalfOpenFailureReopensImmediately(t *testing.T) {
	now := time.Unix(1700000000, 0)
	cb := NewCircuitBreaker(CircuitBreakerConfig{
		Name:             "reopen",
		FailureThreshold: 1,
		ResetTimeout:     5 * time.Second,
		Now:              func() time.Time { return now },
	})
	_ = cb.Execute(context.Background(), func(context.Context) error { return errors.New("boom") })
	now = now.Add(6 * time.Second)
	_ = cb.Execute(context.Background(), func(context.Context) error { return errors.New("still down") })
	if cb.State() != StateOpen {
		t.Fatalf("expected immediate transition back to Open, got %s", cb.State())
	}
}
