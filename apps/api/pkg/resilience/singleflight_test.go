package resilience

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestFlight_DeduplicatesConcurrentLookups(t *testing.T) {
	flight := NewFlight[string](2 * time.Second)
	var calls atomic.Int32
	gate := make(chan struct{})

	const n = 10
	results := make([]string, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			val, _, err := flight.Do(context.Background(), "clerk:user_1", func(context.Context) (string, error) {
				calls.Add(1)
				<-gate
				return "coach", nil
			})
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			results[idx] = val
		}(i)
	}

	time.Sleep(25 * time.Millisecond)
	close(gate)
	wg.Wait()

	if calls.Load() != 1 {
		t.Fatalf("expected exactly 1 underlying call for stampede, got %d", calls.Load())
	}
	for i, r := range results {
		if r != "coach" {
			t.Fatalf("caller %d got %q", i, r)
		}
	}
}
