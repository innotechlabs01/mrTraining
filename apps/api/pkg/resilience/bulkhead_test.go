package resilience

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

func TestBulkhead_EnforcesMaxConcurrency(t *testing.T) {
	bh := NewBulkhead("wompi", 2, 10*time.Millisecond)
	started := make(chan struct{}, 2)
	release := make(chan struct{})

	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = bh.Execute(context.Background(), func(context.Context) error {
				started <- struct{}{}
				<-release
				return nil
			})
		}()
	}

	<-started
	<-started

	err := bh.Execute(context.Background(), func(context.Context) error { return nil })
	if !errors.Is(err, ErrBulkheadFull) {
		t.Fatalf("expected ErrBulkheadFull when saturated, got %v", err)
	}

	close(release)
	wg.Wait()

	if bh.Available() != 2 || bh.InFlight() != 0 {
		t.Fatalf("expected full release, available=%d inflight=%d", bh.Available(), bh.InFlight())
	}
}
