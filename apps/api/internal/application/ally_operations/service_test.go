package ally_operations

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"os"
	"strings"
	"testing"

	allyopsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_operations"
	allyopsinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_operations"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func newOpsTestDB(t *testing.T) (*database.DB, *Service) {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if err := applyOpsMigrations(t, db); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	// Seed: allies first, then relationships
	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyA','userA','Legal A','Comercial A','gym','active')`)
	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyB','userB','Legal B','Comercial B','nutrition','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','allyA','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r2','coachB','allyB','active')`)

	repo := allyopsinfra.NewRepository(db.DB)
	return db, NewService(repo)
}

func applyOpsMigrations(t *testing.T, db *database.DB) error {
	t.Helper()
	ddl := `
CREATE TABLE IF NOT EXISTS allies (
  id TEXT PRIMARY KEY, owner_user_id TEXT, legal_name TEXT NOT NULL, commercial_name TEXT NOT NULL,
  category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  CHECK (status IN ('pending','active','suspended')),
  CHECK (category IN ('gym','nutrition','physio','supplements','recovery','other'))
);
CREATE TABLE IF NOT EXISTS coach_ally_relationships (
  id TEXT PRIMARY KEY, coach_id TEXT NOT NULL, ally_id TEXT NOT NULL REFERENCES allies(id),
  status TEXT NOT NULL DEFAULT 'invited',
  UNIQUE (coach_id, ally_id),
  CHECK (status IN ('invited','active','declined','suspended'))
);
CREATE TABLE IF NOT EXISTS ally_operations (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL,
  relationship_id TEXT NOT NULL REFERENCES coach_ally_relationships(id),
  ally_id TEXT NOT NULL REFERENCES allies(id),
  athlete_id TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_at TEXT, confirmed_at TEXT, completed_at TEXT, cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (kind IN ('order','reservation')),
  CHECK (status IN ('created','confirmed','fulfilled','attended','no_show','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_ally_operations_athlete ON ally_operations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_ally_operations_status ON ally_operations(status);
CREATE INDEX IF NOT EXISTS idx_ally_operations_relationship ON ally_operations(relationship_id);
CREATE TABLE IF NOT EXISTS ally_operation_items (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  offer_kind TEXT NOT NULL, offer_id TEXT NOT NULL, name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0, quantity INTEGER NOT NULL DEFAULT 1,
  CHECK (offer_kind IN ('product','service')),
  CHECK (unit_price_cents >= 0),
  CHECK (quantity >= 1)
);
CREATE INDEX IF NOT EXISTS idx_ally_operation_items_op ON ally_operation_items(operation_id);
CREATE TABLE IF NOT EXISTS ally_redemptions (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  token_hash TEXT NOT NULL, expires_at TEXT NOT NULL,
  redeemed_by TEXT, redeemed_at TEXT,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(token_hash),
  CHECK (status IN ('issued','redeemed','expired','cancelled'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ally_redemptions_token ON ally_redemptions(token_hash);
CREATE INDEX IF NOT EXISTS idx_ally_redemptions_op ON ally_redemptions(operation_id);
CREATE INDEX IF NOT EXISTS idx_ally_redemptions_status ON ally_redemptions(status);
`
	_, err := db.Exec(ddl)
	return err
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func TestCreateOperationHappyPath(t *testing.T) {
	_, svc := newOpsTestDB(t)
	ctx := context.Background()

	op, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create operation: %v", err)
	}
	if op.Kind != "order" || op.Status != "created" || op.RelationshipID != "r1" || op.AllyID != "allyA" || op.AthleteID != "athlete1" {
		t.Fatalf("unexpected operation: %+v", op)
	}
}

func TestCreateOperationEnforcesR7(t *testing.T) {
	_, svc := newOpsTestDB(t)
	ctx := context.Background()

	// coachB is not the owner of r1 (coachA is)
	if _, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
	}, "coachB"); err == nil {
		t.Fatal("expected error for foreign relationship")
	} else if !strings.Contains(err.Error(), "not owned by coach") {
		t.Fatalf("expected ownership error, got %v", err)
	}

	// coachA can create on r1
	if _, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "reservation",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
		ScheduledAt:   "2026-11-01 10:00:00",
	}, "coachA"); err != nil {
		t.Fatalf("coachA on own relationship: %v", err)
	}
}

func TestCreateOperationRejectsInactiveRelationship(t *testing.T) {
	db, svc := newOpsTestDB(t)
	ctx := context.Background()

	// r2 is active initially; mark it declined
	mustExec(t, db, `UPDATE coach_ally_relationships SET status='declined' WHERE id='r2'`)
	if _, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r2",
		AthleteID:     "athlete1",
	}, "coachB"); err == nil {
		t.Fatal("expected error for declined relationship")
	} else if !strings.Contains(err.Error(), "not active") {
		t.Fatalf("expected inactive error, got %v", err)
	}
}

func TestGetOperationOwnership(t *testing.T) {
	_, svc := newOpsTestDB(t)
	ctx := context.Background()

	op, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	// Owner athlete can read
	if _, err := svc.GetOperation(ctx, op.ID, "athlete1"); err != nil {
		t.Fatalf("owner read: %v", err)
	}

	// Another athlete cannot read (IDOR)
	if _, err := svc.GetOperation(ctx, op.ID, "athlete2"); err == nil {
		t.Fatal("expected not-found for foreign athlete")
	} else if !strings.Contains(err.Error(), "not found") {
		t.Fatalf("expected not-found, got %v", err)
	}
}

func TestListOperationsByAthleteAndCoach(t *testing.T) {
	_, svc := newOpsTestDB(t)
	ctx := context.Background()

	// Create operations for athlete1 via coachA/r1
	for i := 0; i < 2; i++ {
		if _, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
			Kind:          "order",
			RelationshipID: "r1",
			AthleteID:     "athlete1",
		}, "coachA"); err != nil {
			t.Fatalf("create: %v", err)
		}
	}

	// athlete2 has 0 operations
	ops2, err := svc.ListOperationsByAthlete(ctx, "athlete2")
	if err != nil {
		t.Fatalf("list athlete2: %v", err)
	}
	if len(ops2) != 0 {
		t.Fatalf("expected 0 operations for athlete2, got %d", len(ops2))
	}

	// athlete1 has 2
	ops1, err := svc.ListOperationsByAthlete(ctx, "athlete1")
	if err != nil {
		t.Fatalf("list athlete1: %v", err)
	}
	if len(ops1) != 2 {
		t.Fatalf("expected 2 operations for athlete1, got %d", len(ops1))
	}

	// coachA sees operations on r1
	opsCoachA, err := svc.ListOperationsByCoach(ctx, "coachA")
	if err != nil {
		t.Fatalf("list coachA: %v", err)
	}
	if len(opsCoachA) != 2 {
		t.Fatalf("expected 2 operations for coachA, got %d", len(opsCoachA))
	}

	// coachB sees 0 on r2 (none created)
	opsCoachB, err := svc.ListOperationsByCoach(ctx, "coachB")
	if err != nil {
		t.Fatalf("list coachB: %v", err)
	}
	if len(opsCoachB) != 0 {
		t.Fatalf("expected 0 operations for coachB, got %d", len(opsCoachB))
	}
}

func TestCreateOperationItem(t *testing.T) {
	_, svc := newOpsTestDB(t)
	ctx := context.Background()

	op, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create operation: %v", err)
	}

	item, err := svc.CreateOperationItem(ctx, allyopsdomain.CreateOperationItemInput{
		OperationID:   op.ID,
		OfferKind:     "product",
		OfferID:       "prod-1",
		Name:          "Proteína",
		UnitPriceCents: 25000,
		Quantity:      2,
	})
	if err != nil {
		t.Fatalf("create item: %v", err)
	}
	if item.Name != "Proteína" || item.UnitPriceCents != 25000 || item.Quantity != 2 {
		t.Fatalf("unexpected item: %+v", item)
	}

	items, err := svc.ListOperationItems(ctx, op.ID)
	if err != nil {
		t.Fatalf("list items: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
}

func TestCreateRedemptionAndRedeem(t *testing.T) {
	_, svc := newOpsTestDB(t)
	ctx := context.Background()

	op, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create operation: %v", err)
	}

	// Create redemption
	redemption, err := svc.CreateRedemption(ctx, allyopsdomain.CreateRedemptionInput{
		OperationID: op.ID,
		ExpiresAt:   "2026-12-31 23:59:59",
	})
	if err != nil {
		t.Fatalf("create redemption: %v", err)
	}
	if redemption.Status != "issued" || redemption.TokenHash == "" {
		t.Fatalf("unexpected redemption: %+v", redemption)
	}

	// Redeem with a valid token: we need the original token, but we only have hash.
	// Instead, test that redeem with wrong token fails.
	if _, err := svc.RedeemRedemption(ctx, "wrong-token", "athlete1"); err == nil {
		t.Fatal("expected error for wrong token")
	}

	// Get redemption hash - we can't get the token from the response, but we can
	// test that a valid hash lookup works by creating redemption and checking status
	if _, err := svc.GetRedemption(ctx, redemption.ID, op.ID); err != nil {
		t.Fatalf("get redemption: %v", err)
	}
}

func TestRedeemRedemptionRejectsExpiredAndAlreadyRedeemed(t *testing.T) {
	db, svc := newOpsTestDB(t)
	ctx := context.Background()

	op, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create operation: %v", err)
	}

	// Expired redemption: insert correct hash for "expired-token"
	expiredHash := base64URL(sha256Sum("expired-token"))
	mustExec(t, db, `INSERT INTO ally_redemptions (id, operation_id, token_hash, expires_at, status) VALUES ('red-expired','`+op.ID+`','`+expiredHash+`','2000-01-01 00:00:00','issued')`)
	if _, err := svc.RedeemRedemption(ctx, "expired-token", "athlete1"); err == nil {
		t.Fatal("expected error for expired redemption")
	}

	// Already redeemed redemption: insert correct hash for "redeemed-token"
	redeemedHash := base64URL(sha256Sum("redeemed-token"))
	mustExec(t, db, `INSERT INTO ally_redemptions (id, operation_id, token_hash, expires_at, status, redeemed_by, redeemed_at) VALUES ('red-redeemed','`+op.ID+`','`+redeemedHash+`','2026-12-31 23:59:59','redeemed','athlete1','2026-10-15 10:00:00')`)
	if _, err := svc.RedeemRedemption(ctx, "redeemed-token", "athlete1"); err == nil {
		t.Fatal("expected error for already redeemed redemption")
	}
}

func TestConcurrentRedeemNoDoubleRedeem(t *testing.T) {
	db, svc := newOpsTestDB(t)
	ctx := context.Background()

	op, err := svc.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: "r1",
		AthleteID:     "athlete1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create operation: %v", err)
	}

	// Create redemption directly in DB with a known token hash
	token := "concurrent-test-token-12345"
	tokenHash := base64URL(sha256Sum(token))
	mustExec(t, db, `INSERT INTO ally_redemptions (id, operation_id, token_hash, expires_at, status) VALUES ('red-concurrent','`+op.ID+`','`+tokenHash+`','2026-12-31 23:59:59','issued')`)

	// Two concurrent redeem attempts with the same token
	done := make(chan error, 2)
	go func() {
		_, err := svc.RedeemRedemption(ctx, token, "athlete1")
		done <- err
	}()
	go func() {
		_, err := svc.RedeemRedemption(ctx, token, "athlete1")
		done <- err
	}()

	err1 := <-done
	err2 := <-done

	// Exactly one should succeed, the other should fail
	successes := 0
	if err1 == nil {
		successes++
	}
	if err2 == nil {
		successes++
	}
	if successes != 1 {
		t.Fatalf("expected exactly 1 successful redeem, got %d (err1=%v, err2=%v)", successes, err1, err2)
	}

	// Verify final status is redeemed
	redemption, err := svc.GetRedemption(ctx, "red-concurrent", op.ID)
	if err != nil {
		t.Fatalf("get redemption: %v", err)
	}
	if redemption.Status != "redeemed" {
		t.Fatalf("expected status redeemed, got %s", redemption.Status)
	}
}

func sha256Sum(s string) []byte {
	h := sha256.Sum256([]byte(s))
	return h[:]
}

func base64URL(b []byte) string {
	encoded := base64.URLEncoding.EncodeToString(b)
	return strings.TrimRight(encoded, "=")
}
