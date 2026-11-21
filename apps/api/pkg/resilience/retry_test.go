package resilience

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

func TestRetry_DoSucceedsAfterTransientFailures(t *testing.T) {
	var attempts atomic.Int32
	val, err := DoVal(context.Background(), RetryConfig{
		MaxAttempts:  3,
		InitialDelay: 5 * time.Millisecond,
		MaxDelay:     20 * time.Millisecond,
		Multiplier:   2,
	}, func(context.Context) (string, error) {
		n := attempts.Add(1)
		if n < 3 {
			return "", errors.New("transient timeout")
		}
		return "ok", nil
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if val != "ok" || attempts.Load() != 3 {
		t.Fatalf("expected ok after 3 attempts, got val=%q attempts=%d", val, attempts.Load())
	}
}

func TestRetry_StopsImmediatelyOnNonRetryableOrCircuitOpen(t *testing.T) {
	for _, tc := range []struct {
		name string
		err  error
	}{
		{"non_retryable", MarkNonRetryable(errors.New("validation failed"))},
		{"http_404", &HTTPError{StatusCode: 404}},
		{"circuit_open", ErrCircuitOpen},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var attempts atomic.Int32
			err := Do(context.Background(), RetryConfig{
				MaxAttempts:  4,
				InitialDelay: time.Millisecond,
			}, func(context.Context) error {
				attempts.Add(1)
				return tc.err
			})
			if !errors.Is(err, tc.err) {
				t.Fatalf("expected %v, got %v", tc.err, err)
			}
			if attempts.Load() != 1 {
				t.Fatalf("expected 1 attempt without retries, got %d", attempts.Load())
			}
		})
	}
}
