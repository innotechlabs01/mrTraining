package ally_payment_declaration

import (
	"context"
	"errors"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	allypaymentdeclarationdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_payment_declaration"
	allypaymentdeclarationinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_payment_declaration"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func newPaymentDeclarationTestDB(t *testing.T) (*database.DB, *Service) {
	t.Helper()
	path := t.TempDir() + "/test.db"
	db, err := database.Connect("file:"+path, "")
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}

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
CREATE TABLE IF NOT EXISTS ally_members (
  id TEXT PRIMARY KEY, ally_id TEXT NOT NULL REFERENCES allies(id),
  user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ally_id, user_id),
  CHECK (role IN ('owner','staff'))
);
CREATE TABLE IF NOT EXISTS ally_operations (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL,
  relationship_id TEXT NOT NULL REFERENCES coach_ally_relationships(id),
  ally_id TEXT NOT NULL REFERENCES allies(id),
  athlete_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (kind IN ('order','reservation')),
  CHECK (status IN ('created','confirmed','fulfilled','attended','no_show','cancelled'))
);
CREATE TABLE IF NOT EXISTS ally_payment_declarations (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  version INTEGER NOT NULL DEFAULT 1, supersedes_id TEXT REFERENCES ally_payment_declarations(id),
  amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'COP',
  method TEXT, declared_at TEXT NOT NULL, reference TEXT, evidence_ref TEXT,
  status TEXT NOT NULL DEFAULT 'declared',
  reviewed_by TEXT, reviewed_at TEXT, review_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (operation_id, version),
  CHECK (amount_cents >= 0),
  CHECK (currency IN ('COP')),
  CHECK (status IN ('declared','under_review','confirmed','rejected','reversed'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_decl_active ON ally_payment_declarations(operation_id)
  WHERE status IN ('declared','under_review','confirmed');
CREATE INDEX IF NOT EXISTS idx_ally_payment_declarations_operation ON ally_payment_declarations(operation_id);
CREATE TABLE IF NOT EXISTS financial_audit_events (
  id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL,
  actor_id TEXT, actor_type TEXT NOT NULL DEFAULT 'user', payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (actor_type IN ('user','system'))
);
CREATE INDEX IF NOT EXISTS idx_financial_audit_entity ON financial_audit_events(entity, entity_id);
`
	if _, err := db.Exec(ddl); err != nil {
		t.Fatalf("apply ddl: %v", err)
	}

	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyA','userA','Legal A','Comercial A','gym','active')`)
	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyB','userB','Legal B','Comercial B','nutrition','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','allyA','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r2','coachB','allyB','active')`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o1','order','r1','allyA','athlete1','fulfilled')`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o2','order','r2','allyB','athlete2','fulfilled')`)

	repo := allypaymentdeclarationinfra.NewRepository(db.DB)
	return db, NewService(repo)
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func TestCreatePaymentDeclaration(t *testing.T) {
	_, svc := newPaymentDeclarationTestDB(t)
	ctx := context.Background()

	decl, err := svc.CreatePaymentDeclaration(ctx, "userA", allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID:  "o1",
		AmountCents:  50000,
		Currency:     "COP",
		Method:       "transfer",
		DeclaredAt:   "2026-10-16 00:00:00",
		Reference:    "ref-123",
		EvidenceRef:  "/private/evidence/1",
	})
	if err != nil {
		t.Fatalf("create declaration: %v", err)
	}
	if decl.Version != 1 || decl.Status != "declared" || decl.AmountCents != 50000 {
		t.Fatalf("unexpected declaration: %+v", decl)
	}

	// Get it back
	got, err := svc.GetPaymentDeclaration(ctx, "userA", decl.ID)
	if err != nil {
		t.Fatalf("get declaration: %v", err)
	}
	if got.ID != decl.ID {
		t.Fatalf("get returned wrong declaration")
	}
}

func TestCreatePaymentDeclarationValidatesInput(t *testing.T) {
	_, svc := newPaymentDeclarationTestDB(t)
	ctx := context.Background()

	if _, err := svc.CreatePaymentDeclaration(ctx, "userA", allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID: "o1", AmountCents: -100,
	}); err == nil {
		t.Fatal("expected error for negative amount")
	}

	if _, err := svc.CreatePaymentDeclaration(ctx, "userA", allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID: "nope", AmountCents: 100,
	}); err == nil {
		t.Fatal("expected error for unknown operation")
	}
}

func TestListPaymentDeclarationsByAlly(t *testing.T) {
	_, svc := newPaymentDeclarationTestDB(t)
	ctx := context.Background()

	if _, err := svc.CreatePaymentDeclaration(ctx, "userA", allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID:  "o1", AmountCents: 50000, Currency: "COP",
	}); err != nil {
		t.Fatalf("create: %v", err)
	}

	list, err := svc.ListPaymentDeclarationsByAlly(ctx, "userA")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 declaration for userA, got %d", len(list))
	}

	// userB has no declarations
	listB, err := svc.ListPaymentDeclarationsByAlly(ctx, "userB")
	if err != nil {
		t.Fatalf("list userB: %v", err)
	}
	if len(listB) != 0 {
		t.Fatalf("expected 0 declarations for userB, got %d", len(listB))
	}
}

func TestReviewPaymentDeclaration(t *testing.T) {
	_, svc := newPaymentDeclarationTestDB(t)
	ctx := context.Background()

	decl, err := svc.CreatePaymentDeclaration(ctx, "userA", allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID:  "o1", AmountCents: 50000, Currency: "COP",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	// Coach reviews and confirms
	reviewed, err := svc.ReviewPaymentDeclaration(ctx, decl.ID, "coachA", allypaymentdeclarationdomain.ReviewPaymentDeclarationInput{
		Status:     "confirmed",
		ReviewedBy: "coachA",
		ReviewNote: "verified",
	})
	if err != nil {
		t.Fatalf("review confirm: %v", err)
	}
	if reviewed.Status != "confirmed" || reviewed.ReviewedBy != "coachA" {
		t.Fatalf("unexpected reviewed state: %+v", reviewed)
	}

	// Trying to review again should fail (already confirmed)
	if _, err := svc.ReviewPaymentDeclaration(ctx, decl.ID, "coachA", allypaymentdeclarationdomain.ReviewPaymentDeclarationInput{
		Status:     "rejected",
		ReviewedBy: "coachA",
	}); err == nil {
		t.Fatal("expected error reviewing already confirmed declaration")
	}
}

func TestReversePaymentDeclaration(t *testing.T) {
	_, svc := newPaymentDeclarationTestDB(t)
	ctx := context.Background()

	decl, err := svc.CreatePaymentDeclaration(ctx, "userA", allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID:  "o1", AmountCents: 50000, Currency: "COP",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	// Confirm first
	if _, err := svc.ReviewPaymentDeclaration(ctx, decl.ID, "coachA", allypaymentdeclarationdomain.ReviewPaymentDeclarationInput{
		Status:     "confirmed",
		ReviewedBy: "coachA",
	}); err != nil {
		t.Fatalf("confirm: %v", err)
	}

	// Reverse
	reversed, err := svc.ReversePaymentDeclaration(ctx, "userA", decl.ID)
	if err != nil {
		t.Fatalf("reverse: %v", err)
	}
	if reversed.Status != "declared" || reversed.SupersedesID != decl.ID || reversed.Version != 2 {
		t.Fatalf("unexpected reversed state: %+v", reversed)
	}

	// Original should now be reversed
	orig, err := svc.GetPaymentDeclaration(ctx, "userA", decl.ID)
	if err != nil {
		t.Fatalf("get original: %v", err)
	}
	if orig.Status != "reversed" {
		t.Fatalf("expected original to be reversed, got %s", orig.Status)
	}
}

func TestIDOR_PaymentDeclarationBelongsToOtherAlly(t *testing.T) {
	_, svc := newPaymentDeclarationTestDB(t)
	ctx := context.Background()

	// userA creates a declaration on o1 (allyA)
	decl, err := svc.CreatePaymentDeclaration(ctx, "userA", allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID:  "o1", AmountCents: 50000, Currency: "COP",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	// userB (allyB) tries to get userA's declaration - should fail (IDOR)
	if _, err := svc.GetPaymentDeclaration(ctx, "userB", decl.ID); err == nil {
		t.Fatal("expected error for foreign declaration")
	} else if !errors.Is(err, allypaymentdeclarationdomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// userB listing sees only their own (none)
	list, err := svc.ListPaymentDeclarationsByAlly(ctx, "userB")
	if err != nil {
		t.Fatalf("list userB: %v", err)
	}
	if len(list) != 0 {
		t.Fatalf("expected userB to see 0 declarations, got %d", len(list))
	}

	// Reverse by non-owner should also fail
	if _, err := svc.ReversePaymentDeclaration(ctx, "userB", decl.ID); err == nil {
		t.Fatal("expected error reversing foreign declaration")
	} else if !strings.Contains(err.Error(), "not found") {
		t.Fatalf("expected not found error, got %v", err)
	}
}
