package resilience

import (
	"context"
	"sync/atomic"
	"time"
)

// Bulkhead bounds the number of concurrent calls to a downstream dependency.
type Bulkhead struct {
	name           string
	sem            chan struct{}
	acquireTimeout time.Duration
	inFlight       atomic.Int64
}

// NewBulkhead creates a semaphore-based concurrency limiter.
func NewBulkhead(name string, maxConcurrent int, acquireTimeout time.Duration) *Bulkhead {
	if maxConcurrent <= 0 {
		maxConcurrent = 1
	}
	return &Bulkhead{
		name:           name,
		sem:            make(chan struct{}, maxConcurrent),
		acquireTimeout: acquireTimeout,
	}
}

// Name returns the bulkhead identifier.
func (b *Bulkhead) Name() string {
	return b.name
}

// Capacity returns the maximum concurrent executions allowed.
func (b *Bulkhead) Capacity() int {
	return cap(b.sem)
}

// InFlight returns the number of currently executing calls.
func (b *Bulkhead) InFlight() int {
	return int(b.inFlight.Load())
}

// Available returns remaining free concurrency slots.
func (b *Bulkhead) Available() int {
	rem := cap(b.sem) - len(b.sem)
	if rem < 0 {
		return 0
	}
	return rem
}

// Execute acquires a bulkhead slot, runs fn, and always releases the slot.
func (b *Bulkhead) Execute(ctx context.Context, fn func(context.Context) error) error {
	if b == nil {
		return fn(ctx)
	}
	if ctx != nil && ctx.Err() != nil {
		return ctx.Err()
	}

	if err := b.acquire(ctx); err != nil {
		return err
	}
	b.inFlight.Add(1)
	defer func() {
		b.inFlight.Add(-1)
		<-b.sem
	}()
	return fn(ctx)
}

func (b *Bulkhead) acquire(ctx context.Context) error {
	if b.acquireTimeout <= 0 {
		select {
		case b.sem <- struct{}{}:
			return nil
		default:
			return ErrBulkheadFull
		}
	}

	timer := time.NewTimer(b.acquireTimeout)
	defer timer.Stop()

	if ctx != nil {
		select {
		case b.sem <- struct{}{}:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		case <-timer.C:
			return ErrBulkheadFull
		}
	}

	select {
	case b.sem <- struct{}{}:
		return nil
	case <-timer.C:
		return ErrBulkheadFull
	}
}
