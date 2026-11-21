// Package jobs runs scheduled background workers:
//   - challenge expiration (hourly)
//   - TRM prefetch (every 4h)
//   - inactivity retention pushes (every 24h)
//
// Dependencies are injected so jobs can be started from cmd/api or cmd/worker
// without duplicating wiring.
package jobs

import (
	"context"
	"database/sql"
	"fmt"
	"hash/fnv"
	"sync"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/application/challenge"
	"github.com/innotechlabs01/mr-training-api/internal/application/gamification"
	"github.com/innotechlabs01/mr-training-api/internal/application/notification"
	"github.com/innotechlabs01/mr-training-api/internal/application/trm"
	"go.uber.org/zap"
)

// DistributedLocker coordinates single-leader scheduled execution across
// horizontal API/worker instances.
type DistributedLocker interface {
	WithLock(ctx context.Context, lockKey string, fn func(context.Context) error) (acquired bool, err error)
}

// PGAdvisoryLocker implements DistributedLocker using PostgreSQL session-level
// advisory locks on a pinned connection from *sql.DB.
type PGAdvisoryLocker struct {
	db *sql.DB
}

// NewPGAdvisoryLocker creates a PostgreSQL advisory locker backed by db.
func NewPGAdvisoryLocker(db *sql.DB) *PGAdvisoryLocker {
	return &PGAdvisoryLocker{db: db}
}

// WithLock acquires a non-blocking session advisory lock for lockKey, runs fn,
// and releases the lock on exit.
func (l *PGAdvisoryLocker) WithLock(ctx context.Context, lockKey string, fn func(context.Context) error) (bool, error) {
	if l == nil || l.db == nil {
		return true, fn(ctx)
	}
	conn, err := l.db.Conn(ctx)
	if err != nil {
		return false, err
	}
	defer conn.Close()

	key := advisoryLockID(lockKey)
	var acquired bool
	if err := conn.QueryRowContext(ctx, "SELECT pg_try_advisory_lock($1)", key).Scan(&acquired); err != nil {
		return false, err
	}
	if !acquired {
		return false, nil
	}
	defer func() {
		unlockCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = conn.ExecContext(unlockCtx, "SELECT pg_advisory_unlock($1)", key)
	}()

	return true, fn(ctx)
}

func advisoryLockID(lockKey string) int64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(lockKey))
	return int64(h.Sum64() & 0x7fffffffffffffff)
}

// Runner holds the services needed by each scheduled job.
type Runner struct {
	challengeSvc *challenge.Service
	gamifSvc     *gamification.Service
	notifSvc     *notification.Service
	trmSvc       *trm.Service
	locker       DistributedLocker
	log          *zap.Logger
}

// NewRunner constructs a jobs runner.
func NewRunner(
	challengeSvc *challenge.Service,
	gamifSvc *gamification.Service,
	notifSvc *notification.Service,
	trmSvc *trm.Service,
	log *zap.Logger,
) *Runner {
	if log == nil {
		log = zap.NewNop()
	}
	return &Runner{
		challengeSvc: challengeSvc,
		gamifSvc:     gamifSvc,
		notifSvc:     notifSvc,
		trmSvc:       trmSvc,
		log:          log,
	}
}

// WithLocker configures a distributed locker so only one replica executes each job tick.
func (r *Runner) WithLocker(locker DistributedLocker) *Runner {
	r.locker = locker
	return r
}

// WithDB configures a PostgreSQL advisory locker backed by db.
func (r *Runner) WithDB(db *sql.DB) *Runner {
	if db != nil {
		r.locker = NewPGAdvisoryLocker(db)
	}
	return r
}

// Start launches all scheduled jobs and blocks until ctx is cancelled and all
// job loops exit cleanly.
func (r *Runner) Start(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}
	var wg sync.WaitGroup
	wg.Add(3)
	go r.runChallengeExpiration(ctx, &wg)
	go r.runTRMPrefetch(ctx, &wg)
	go r.runInactivityRetentionLoop(ctx, &wg)
	<-ctx.Done()
	wg.Wait()
	return nil
}

func (r *Runner) runChallengeExpiration(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if r.challengeSvc == nil {
				continue
			}
			if err := r.executeLocked(ctx, "jobs:challenge_expiration", 2*time.Minute, func(_ context.Context) error {
				return r.challengeSvc.ExpireChallenges()
			}); err != nil {
				r.log.Error("failed to expire challenges", zap.Error(err))
			}
		}
	}
}

func (r *Runner) runTRMPrefetch(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	ticker := time.NewTicker(4 * time.Hour)
	defer ticker.Stop()

	runOnce := func() {
		if r.trmSvc == nil {
			return
		}
		if err := r.executeLocked(ctx, "jobs:trm_prefetch", 30*time.Second, func(jobCtx context.Context) error {
			_, err := r.trmSvc.GetCurrent(jobCtx)
			return err
		}); err != nil {
			r.log.Warn("scheduled TRM fetch failed", zap.Error(err))
		}
	}

	runOnce()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			runOnce()
		}
	}
}

func (r *Runner) runInactivityRetentionLoop(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	runOnce := func() {
		if r.gamifSvc == nil || r.notifSvc == nil {
			return
		}
		if err := r.executeLocked(ctx, "jobs:inactivity_retention", 5*time.Minute, r.runInactivityRetention); err != nil {
			r.log.Warn("inactivity retention job failed", zap.Error(err))
		}
	}

	runOnce()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			runOnce()
		}
	}
}

func (r *Runner) executeLocked(parent context.Context, lockKey string, timeout time.Duration, fn func(context.Context) error) error {
	jobCtx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	if r.locker == nil {
		return fn(jobCtx)
	}
	acquired, err := r.locker.WithLock(jobCtx, lockKey, fn)
	if err != nil {
		return err
	}
	if !acquired {
		r.log.Debug("skipping job tick, lock held by another instance", zap.String("lock_key", lockKey))
	}
	return nil
}

// runInactivityRetention sends retention pushes to athletes inactive 3+ days.
// Notifies at day 3 (streak at risk) and every 7 days thereafter (re-engage).
func (r *Runner) runInactivityRetention(ctx context.Context) error {
	streaks, err := r.gamifSvc.ListAllStreaks(ctx)
	if err != nil {
		return err
	}
	today := time.Now().UTC().Format("2006-01-02")
	todayTime, err := time.Parse("2006-01-02", today)
	if err != nil {
		return err
	}
	for _, streak := range streaks {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if streak.LastWorkoutDate == nil || *streak.LastWorkoutDate == "" {
			continue
		}
		if streak.CurrentStreak <= 0 {
			continue
		}
		lastWorkoutTime, err := time.Parse("2006-01-02", *streak.LastWorkoutDate)
		if err != nil {
			continue
		}
		daysInactive := int(todayTime.Sub(lastWorkoutTime).Hours() / 24)
		if daysInactive < 3 {
			continue
		}
		if daysInactive != 3 && daysInactive%7 != 0 {
			continue
		}
		title := "Te extrañamos"
		if daysInactive >= 7 {
			title = "Volvé a entrenar"
		}
		body := fmt.Sprintf("Llevás %d días sin entrenar. Tu racha está en peligro, no la pierdas.", daysInactive)
		if _, nerr := r.notifSvc.SendNotification(
			ctx, streak.AthleteID, "inactivity", title, body, "",
		); nerr != nil {
			r.log.Warn("failed to send inactivity retention push",
				zap.String("athlete_id", streak.AthleteID),
				zap.Int("days_inactive", daysInactive),
				zap.Error(nerr))
		}
	}
	return nil
}
