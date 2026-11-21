package jobs

import (
	"context"
	"regexp"
	"sync/atomic"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"go.uber.org/zap"
)

type stubLocker struct {
	acquire bool
	calls   atomic.Int32
}

func (s *stubLocker) WithLock(ctx context.Context, _ string, fn func(context.Context) error) (bool, error) {
	s.calls.Add(1)
	if !s.acquire {
		return false, nil
	}
	return true, fn(ctx)
}

func TestRunner_StartStopsCleanlyOnCancel(t *testing.T) {
	r := NewRunner(nil, nil, nil, nil, zap.NewNop())
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan error, 1)
	go func() {
		done <- r.Start(ctx)
	}()

	time.Sleep(20 * time.Millisecond)
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("expected nil error on shutdown, got %v", err)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Runner.Start did not exit after ctx cancellation")
	}
}

func TestRunner_ExecuteLocked_SkipsWhenNotAcquired(t *testing.T) {
	locker := &stubLocker{acquire: false}
	r := NewRunner(nil, nil, nil, nil, zap.NewNop()).WithLocker(locker)

	ran := false
	err := r.executeLocked(context.Background(), "jobs:test", time.Second, func(context.Context) error {
		ran = true
		return nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ran {
		t.Fatal("expected job fn not to run when lock was not acquired")
	}
	if locker.calls.Load() != 1 {
		t.Fatalf("expected locker called once, got %d", locker.calls.Load())
	}
}

func TestPGAdvisoryLocker_AcquiresAndUnlocks(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT pg_try_advisory_lock($1)")).
		WithArgs(advisoryLockID("jobs:trm_prefetch")).
		WillReturnRows(sqlmock.NewRows([]string{"pg_try_advisory_lock"}).AddRow(true))
	mock.ExpectExec(regexp.QuoteMeta("SELECT pg_advisory_unlock($1)")).
		WithArgs(advisoryLockID("jobs:trm_prefetch")).
		WillReturnResult(sqlmock.NewResult(0, 1))

	locker := NewPGAdvisoryLocker(db)
	ran := false
	acquired, err := locker.WithLock(context.Background(), "jobs:trm_prefetch", func(context.Context) error {
		ran = true
		return nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !acquired || !ran {
		t.Fatalf("expected lock acquired and fn run (acquired=%v ran=%v)", acquired, ran)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sqlmock expectations: %v", err)
	}
}
