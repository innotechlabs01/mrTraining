package wompicheckouttest

import (
	"context"
		"testing"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/application/payment"
	"github.com/innotechlabs01/mr-training-api/internal/application/membership"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	memberInfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/membership"
)

func TestWompiMembershipCheckoutReadiness(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.WompiPrivateKey == "" {
		t.Skip("WOMPI_PRIVATE_KEY not loaded")
	}
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	ctx := context.Background()
	coachID := "coach-wompi-b4"
	athleteID := "athlete-wompi-b4"
	memberID := "mem-wompi-b4"

	// Seed within coach transaction (RLS-controlled tables/tables using simple inserts)
	u := database.NewUnitOfWork(db.DB)
	if err := u.Begin(ctx, coachID, coachID, "coach"); err != nil {
		t.Fatal(err)
	}
	defer u.Rollback(ctx)
	for _, q := range []struct {
		stmt string
		args []any
	}{
		{`INSERT INTO coaches (id,email,name,is_active,is_accepting_athletes) VALUES ($1,'a@test.com','coach B4',1,1) ON CONFLICT (id) DO NOTHING`, []any{coachID}},
		{`INSERT INTO athlete_profiles (id,email,name) VALUES ($1,'a@test.com','athlete B4') ON CONFLICT (id) DO NOTHING`, []any{athleteID}},
		{`INSERT INTO coach_athlete_links (coach_id,athlete_id,status) VALUES ($1,$2,'active') ON CONFLICT DO NOTHING`, []any{coachID, athleteID}},
		{`INSERT INTO athlete_memberships (id,athlete_id,coach_id,plan_name,plan_price,billing_period,status,current_period_start,current_period_end,grace_period_days,payment_due_date,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) ON CONFLICT (id) DO NOTHING`,
			[]any{memberID, athleteID, coachID, "Wompi sandbox plan", float64(5000), "monthly", "pending", time.Now().UTC().Format("2006-01-02"), time.Now().AddDate(0,1,0).UTC().Format("2006-01-02"), 5, time.Now().AddDate(0,1,0).UTC().Format("2006-01-02")}},
	} {
		if _, err := u.Tx().ExecContext(ctx, q.stmt, q.args...); err != nil {
			t.Fatalf("seed %s: %v", q.stmt, err)
		}
	}
	if err := u.Commit(ctx); err != nil {
		t.Fatal(err)
	}

	memRepo := memberInfra.NewRepository(db.DB)
	memSvc := membership.NewService(memRepo)
	_ = memSvc

	// Athlete UoW to inject RLS context for membership GetByAthleteID
	uw := database.NewUnitOfWork(db.DB)
	if err := uw.Begin(ctx, athleteID, coachID, "athlete"); err != nil {
		t.Fatal(err)
	}
	defer uw.Rollback(ctx)
	memRepoTx := memRepo.WithExecutor(uw.Tx())
	memSvcTx := membership.NewService(memRepoTx)
	svc := payment.NewService(cfg, nil, memSvcTx)

	resp, err := svc.CreateMembershipPreference(ctx, athleteID)
	if err != nil {
		t.Fatalf("CreateMembershipPreference: %v", err)
	}
	t.Logf("wompi checkout reference=%s initpoint=%s total=%v currency=%s", resp.MembershipID, resp.InitPoint, resp.Total, resp.Currency)
	if resp.InitPoint == "" {
		t.Fatal("empty init point")
	}
	if resp.Total != 5000 {
		t.Fatalf("unexpected total: %v", resp.Total)
	}

	// verify membership under athlete context
	m, err := memSvcTx.GetMembership(ctx, athleteID)
	if err != nil {
		t.Fatalf("get membership: %v", err)
	}
	if m.ID != memberID || m.Status != "pending" {
		t.Fatalf("unexpected membership state: %#v", m)
	}

	// cleanup now before assertion comes later? Do not cleanup to inspect; defer not needed
	defer func() {
		du := database.NewUnitOfWork(db.DB)
		if du.Begin(ctx, coachID, coachID, "coach") == nil {
			_, _ = du.Tx().ExecContext(ctx, `DELETE FROM athlete_memberships WHERE id=$1`, memberID)
			_, _ = du.Tx().ExecContext(ctx, `DELETE FROM coach_athlete_links WHERE coach_id=$1 AND athlete_id=$2`, coachID, athleteID)
			_, _ = du.Tx().ExecContext(ctx, `DELETE FROM athlete_profiles WHERE id=$1`, athleteID)
			_, _ = du.Tx().ExecContext(ctx, `DELETE FROM coaches WHERE id=$1`, coachID)
			_ = du.Commit(ctx)
		}
	}()
}
