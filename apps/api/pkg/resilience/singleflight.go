package resilience

import (
	"context"
	"time"

	"golang.org/x/sync/singleflight"
)

// Flight deduplicates concurrent identical lookups by key so stampedes invoke
// the underlying resolver only once while respecting each waiter's context.
type Flight[T any] struct {
	group   singleflight.Group
	timeout time.Duration
}

// NewFlight builds a Flight deduplicator with a maximum shared fetch timeout
// (defaults to 15s when non-positive).
func NewFlight[T any](fetchTimeout time.Duration) *Flight[T] {
	if fetchTimeout <= 0 {
		fetchTimeout = 15 * time.Second
	}
	return &Flight[T]{timeout: fetchTimeout}
}

// Do runs fn once per concurrently active key and returns its value along with
// shared=true when multiple callers shared the result.
func (f *Flight[T]) Do(ctx context.Context, key string, fn func(context.Context) (T, error)) (T, bool, error) {
	var zero T
	if ctx != nil && ctx.Err() != nil {
		return zero, false, ctx.Err()
	}

	ch := f.group.DoChan(key, func() (interface{}, error) {
		base := context.Background()
		if ctx != nil {
			base = context.WithoutCancel(ctx)
		}
		execCtx, cancel := context.WithTimeout(base, f.timeout)
		defer cancel()
		return fn(execCtx)
	})

	if ctx == nil {
		res := <-ch
		if res.Err != nil {
			return zero, res.Shared, res.Err
		}
		val, _ := res.Val.(T)
		return val, res.Shared, nil
	}

	select {
	case <-ctx.Done():
		return zero, false, ctx.Err()
	case res := <-ch:
		if res.Err != nil {
			return zero, res.Shared, res.Err
		}
		val, _ := res.Val.(T)
		return val, res.Shared, nil
	}
}
