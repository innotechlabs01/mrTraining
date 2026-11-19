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
	"fmt"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/application/challenge"
	"github.com/innotechlabs01/mr-training-api/internal/application/gamification"
	"github.com/innotechlabs01/mr-training-api/internal/application/notification"
	"github.com/innotechlabs01/mr-training-api/internal/application/trm"
	"go.uber.org/zap"
)

// Runner holds the services needed by each scheduled job.
type Runner struct {
	challengeSvc *challenge.Service
	gamifSvc     *gamification.Service
	notifSvc     *notification.Service
	trmSvc       *trm.Service
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
	return &Runner{
		challengeSvc: challengeSvc,
		gamifSvc:     gamifSvc,
		notifSvc:     notifSvc,
		trmSvc:       trmSvc,
		log:          log,
	}
}

// Start launches all scheduled jobs and blocks until ctx is cancelled.
// Each job runs in its own goroutine with its own ticker.
func (r *Runner) Start(ctx context.Context) error {
	r.startChallengeExpiration(ctx)
	r.startTRMPrefetch(ctx)
	r.startInactivityRetention(ctx)
	<-ctx.Done()
	return nil
}

func (r *Runner) startChallengeExpiration(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if err := r.challengeSvc.ExpireChallenges(); err != nil {
				r.log.Error("failed to expire challenges", zap.Error(err))
			}
		}
	}()
}

func (r *Runner) startTRMPrefetch(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(4 * time.Hour)
		defer ticker.Stop()
		if _, err := r.trmSvc.GetCurrent(context.Background()); err != nil {
			r.log.Warn("initial TRM fetch failed", zap.Error(err))
		}
		for range ticker.C {
			if _, err := r.trmSvc.GetCurrent(context.Background()); err != nil {
				r.log.Warn("scheduled TRM fetch failed", zap.Error(err))
			}
		}
	}()
}

func (r *Runner) startInactivityRetention(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		if err := r.runInactivityRetention(context.Background()); err != nil {
			r.log.Warn("initial inactivity retention job failed", zap.Error(err))
		}
		for range ticker.C {
			if err := r.runInactivityRetention(context.Background()); err != nil {
				r.log.Warn("scheduled inactivity retention job failed", zap.Error(err))
			}
		}
	}()
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
			context.Background(), streak.AthleteID, "inactivity", title, body, "",
		); nerr != nil {
			r.log.Warn("failed to send inactivity retention push",
				zap.String("athlete_id", streak.AthleteID),
				zap.Int("days_inactive", daysInactive),
				zap.Error(nerr))
		}
	}
	return nil
}
