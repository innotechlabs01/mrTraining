package resilience

import (
	"context"
	"errors"
	"math"
	"math/rand"
	"time"
)

// RetryConfig controls exponential backoff with optional jitter.
type RetryConfig struct {
	MaxAttempts  int
	InitialDelay time.Duration
	MaxDelay     time.Duration
	Multiplier   float64
	Jitter       bool
	RetryIf      func(error) bool
}

// DefaultRetryConfig provides conservative retry defaults for idempotent requests.
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:  3,
		InitialDelay: 100 * time.Millisecond,
		MaxDelay:     2 * time.Second,
		Multiplier:   2.0,
		Jitter:       true,
		RetryIf:      DefaultRetryIf,
	}
}

// DefaultRetryIf retries transient errors, skipping non-retryable, circuit-open, and canceled contexts.
func DefaultRetryIf(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, ErrCircuitOpen) || errors.Is(err, ErrHalfOpenLimit) || errors.Is(err, ErrBulkheadFull) {
		return false
	}
	if errors.Is(err, context.Canceled) {
		return false
	}
	return !IsNonRetryable(err)
}

func (c RetryConfig) normalize() RetryConfig {
	if c.MaxAttempts <= 0 {
		c.MaxAttempts = 3
	}
	if c.InitialDelay <= 0 {
		c.InitialDelay = 100 * time.Millisecond
	}
	if c.MaxDelay <= 0 {
		c.MaxDelay = 2 * time.Second
	}
	if c.Multiplier <= 0 {
		c.Multiplier = 2.0
	}
	if c.RetryIf == nil {
		c.RetryIf = DefaultRetryIf
	}
	return c
}

// BackoffDuration computes the delay before retry attempt n (0-indexed after first failure).
func (c RetryConfig) BackoffDuration(attempt int) time.Duration {
	c = c.normalize()
	if attempt < 0 {
		attempt = 0
	}
	base := float64(c.InitialDelay) * math.Pow(c.Multiplier, float64(attempt))
	if c.Jitter {
		// Equal jitter in [0.5*base, 1.5*base)
		base = base * (0.5 + rand.Float64())
	}
	delay := time.Duration(base)
	if delay > c.MaxDelay {
		return c.MaxDelay
	}
	if delay < 0 {
		return 0
	}
	return delay
}

// Do retries fn up to cfg.MaxAttempts times while RetryIf returns true and ctx remains active.
func Do(ctx context.Context, cfg RetryConfig, fn func(context.Context) error) error {
	cfg = cfg.normalize()
	var lastErr error
	for attempt := 0; attempt < cfg.MaxAttempts; attempt++ {
		if ctx != nil && ctx.Err() != nil {
			if lastErr != nil {
				return lastErr
			}
			return ctx.Err()
		}

		lastErr = fn(ctx)
		if lastErr == nil {
			return nil
		}
		if attempt == cfg.MaxAttempts-1 || !cfg.RetryIf(lastErr) {
			return lastErr
		}
		if ctx != nil && ctx.Err() != nil {
			return lastErr
		}

		delay := cfg.BackoffDuration(attempt)
		timer := time.NewTimer(delay)
		if ctx != nil {
			select {
			case <-ctx.Done():
				timer.Stop()
				return lastErr
			case <-timer.C:
			}
		} else {
			<-timer.C
		}
	}
	return lastErr
}

// DoVal retries value-returning fn up to cfg.MaxAttempts times.
func DoVal[T any](ctx context.Context, cfg RetryConfig, fn func(context.Context) (T, error)) (T, error) {
	var out T
	err := Do(ctx, cfg, func(inner context.Context) error {
		var innerErr error
		out, innerErr = fn(inner)
		return innerErr
	})
	return out, err
}
