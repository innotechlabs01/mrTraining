package coach_settlement

import (
	"context"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_settlement"
	coachsetinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach_settlement"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func newSettlementTestDB(t *testing.T) (*database.DB, *Service) {
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
CREATE TABLE IF NOT EXISTS commission_agreements (
  id TEXT PRIMARY KEY, relationship_id TEXT NOT NULL REFERENCES coach_ally_relationships(id),
  version INTEGER NOT NULL, rate_bps INTEGER NOT NULL DEFAULT 0,
  fixed_amount_cents INTEGER NOT NULL DEFAULT 0, eligible_base_rule TEXT NOT NULL DEFAULT 'gross_minus_discount_minus_tax',
  rounding TEXT NOT NULL DEFAULT 'half_up', currency TEXT NOT NULL DEFAULT 'COP',
  valid_from TEXT NOT NULL, valid_to TEXT, status TEXT NOT NULL DEFAULT 'proposed',
  UNIQUE (relationship_id, version),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (fixed_amount_cents >= 0),
  CHECK (status IN ('proposed','accepted','superseded','ended'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agreement_open ON commission_agreements(relationship_id) WHERE valid_to IS NULL;
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
CREATE TABLE IF NOT EXISTS ally_operation_items (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  offer_kind TEXT NOT NULL, offer_id TEXT NOT NULL, name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0, quantity INTEGER NOT NULL DEFAULT 1,
  CHECK (offer_kind IN ('product','service')),
  CHECK (unit_price_cents >= 0),
  CHECK (quantity >= 1)
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
CREATE TABLE IF NOT EXISTS commission_entries (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  relationship_id TEXT NOT NULL, coach_id TEXT NOT NULL,
  agreement_id TEXT NOT NULL REFERENCES commission_agreements(id),
  agreement_version INTEGER NOT NULL, base_cents INTEGER NOT NULL,
  rate_bps INTEGER NOT NULL, fixed_amount_cents INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'accrued', computed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (operation_id),
  CHECK (base_cents >= 0),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (fixed_amount_cents >= 0),
  CHECK (amount_cents >= 0),
  CHECK (currency IN ('COP')),
  CHECK (status IN ('accrued','reversed'))
);
CREATE TABLE IF NOT EXISTS coach_settlements (
  id TEXT PRIMARY KEY, coach_id TEXT NOT NULL, ally_id TEXT NOT NULL REFERENCES allies(id),
  period_start TEXT NOT NULL, period_end TEXT NOT NULL, period_key TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'draft',
  operations_count INTEGER NOT NULL DEFAULT 0,
  base_total_cents INTEGER NOT NULL DEFAULT 0,
  commission_gross_cents INTEGER NOT NULL DEFAULT 0,
  adjustments_cents INTEGER NOT NULL DEFAULT 0,
  commission_net_cents INTEGER NOT NULL DEFAULT 0,
  calculated_at TEXT, approved_at TEXT, closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (coach_id, ally_id, period_key, currency),
  CHECK (currency = 'COP'),
  CHECK (status IN ('draft','calculated','under_review','approved','document_issued','paid_external','disputed','void'))
);
CREATE TABLE IF NOT EXISTS settlement_items (
  id TEXT PRIMARY KEY, settlement_id TEXT NOT NULL REFERENCES coach_settlements(id),
  entry_id TEXT NOT NULL REFERENCES commission_entries(id),
  base_cents INTEGER NOT NULL, rate_bps INTEGER NOT NULL,
  fixed_amount_cents INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL, released_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (settlement_id, entry_id),
  CHECK (base_cents >= 0),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (amount_cents >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_item_active ON settlement_items(entry_id) WHERE released_at IS NULL;
CREATE TABLE IF NOT EXISTS settlement_documents (
  id TEXT PRIMARY KEY, settlement_id TEXT NOT NULL REFERENCES coach_settlements(id),
  kind TEXT NOT NULL DEFAULT 'draft_account_of_collection', content_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')), sent_at TEXT,
  CHECK (status IN ('draft','reviewed','approved'))
);
CREATE TABLE IF NOT EXISTS coach_payment_records (
  id TEXT PRIMARY KEY, settlement_id TEXT NOT NULL REFERENCES coach_settlements(id),
  coach_id TEXT NOT NULL, payer_ally_id TEXT NOT NULL REFERENCES allies(id),
  amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'COP',
  actor_id TEXT NOT NULL, actor_type TEXT NOT NULL DEFAULT 'user',
  reference TEXT, evidence_ref TEXT, declared_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'declared', created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (actor_type IN ('user','system')),
  CHECK (status IN ('declared','confirmed')),
  CHECK (amount_cents >= 0)
);
CREATE TABLE IF NOT EXISTS financial_audit_events (
  id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL,
  actor_id TEXT, actor_type TEXT NOT NULL DEFAULT 'user', payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (actor_type IN ('user','system'))
);
`
	if _, err := db.Exec(ddl); err != nil {
		t.Fatalf("apply ddl: %v", err)
	}

	// Seed: coach, ally, relationship, operation, entry.
	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('a1','userA','Legal A','Comercial A','gym','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','a1','active')`)
	mustExec(t, db, `INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, status) VALUES ('ag1','r1',1,1000,0,'gross_minus_discount_minus_tax','half_up','COP','2026-01-01 00:00:00','accepted')`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o1','order','r1','a1','ath1','fulfilled')`)
	mustExec(t, db, `INSERT INTO ally_operation_items (id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity) VALUES ('i1','o1','product','p1','Producto',200000,2)`)
	mustExec(t, db, `INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd1','o1',1,50000,'COP','2026-10-16 00:00:00','declared')`)
	mustExec(t, db, `INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at) VALUES ('ce1','o1','r1','coachA','ag1',1,400000,1000,0,40000,'COP','accrued','2026-10-16 00:00:00')`)

	repo := coachsetinfra.NewRepository(db.DB)
	return db, NewService(repo)
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func TestCreateSettlement(t *testing.T) {
	_, svc := newSettlementTestDB(t)
	ctx := context.Background()

	settlement, err := svc.CreateSettlement(ctx, domain.CreateSettlementInput{
		CoachID:     "coachA",
		AllyID:      "a1",
		PeriodStart: "2026-10-01",
		PeriodEnd:   "2026-10-31",
		PeriodKey:   "2026-10",
		Currency:    "COP",
	}, "coachA")
	if err != nil {
		t.Fatalf("create settlement: %v", err)
	}
	if settlement.Status != domain.StatusDraft || settlement.CoachID != "coachA" || settlement.PeriodKey != "2026-10" {
		t.Fatalf("unexpected settlement: %+v", settlement)
	}
}

func TestCreateSettlementRejectsNonCOP(t *testing.T) {
	_, svc := newSettlementTestDB(t)
	ctx := context.Background()

	if _, err := svc.CreateSettlement(ctx, domain.CreateSettlementInput{
		CoachID:     "coachA",
		AllyID:      "a1",
		PeriodStart: "2026-10-01",
		PeriodEnd:   "2026-10-31",
		PeriodKey:   "2026-10",
		Currency:    "USD",
	}, "coachA"); err == nil {
		t.Fatal("expected error for non-COP currency")
	}
}

func TestCalculateSettlement(t *testing.T) {
	_, svc := newSettlementTestDB(t)
	ctx := context.Background()

	settlement, err := svc.CreateSettlement(ctx, domain.CreateSettlementInput{
		CoachID:     "coachA",
		AllyID:      "a1",
		PeriodStart: "2026-10-01",
		PeriodEnd:   "2026-10-31",
		PeriodKey:   "2026-10",
		Currency:    "COP",
	}, "coachA")
	if err != nil {
		t.Fatalf("create settlement: %v", err)
	}

	settlement, items, err := svc.CalculateSettlement(ctx, settlement.ID, "coachA")
	if err != nil {
		t.Fatalf("calculate settlement: %v", err)
	}
	if settlement.Status != domain.StatusCalculated {
		t.Fatalf("expected status calculated, got %s", settlement.Status)
	}
	if settlement.BaseTotalCents != 400000 {
		t.Fatalf("expected base_total_cents 400000, got %d", settlement.BaseTotalCents)
	}
	if settlement.CommissionGrossCents != 40000 {
		t.Fatalf("expected commission_gross_cents 40000, got %d", settlement.CommissionGrossCents)
	}
	if settlement.CommissionNetCents != 40000 {
		t.Fatalf("expected commission_net_cents 40000, got %d", settlement.CommissionNetCents)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].AmountCents != 40000 {
		t.Fatalf("expected item amount 40000, got %d", items[0].AmountCents)
	}
}

func TestUpdateSettlementStatus(t *testing.T) {
	db, svc := newSettlementTestDB(t)
	ctx := context.Background()

	settlement, err := svc.CreateSettlement(ctx, domain.CreateSettlementInput{
		CoachID:     "coachA",
		AllyID:      "a1",
		PeriodStart: "2026-10-01",
		PeriodEnd:   "2026-10-31",
		PeriodKey:   "2026-10",
		Currency:    "COP",
	}, "coachA")
	if err != nil {
		t.Fatalf("create settlement: %v", err)
	}
	t.Logf("created settlement ID: %s", settlement.ID)

	// Debug: query directly
	var dbID string
	err = db.QueryRowContext(ctx, `SELECT id FROM coach_settlements WHERE id = ?`, settlement.ID).Scan(&dbID)
	t.Logf("direct query: id=%s, err=%v", dbID, err)

	// draft -> calculated
	settlement, err = svc.UpdateSettlementStatus(ctx, settlement.ID, "coachA", domain.StatusCalculated, "")
	if err != nil {
		t.Fatalf("update to calculated: %v", err)
	}
	if settlement.Status != domain.StatusCalculated {
		t.Fatalf("expected status calculated, got %s", settlement.Status)
	}

	// calculated -> under_review
	settlement, err = svc.UpdateSettlementStatus(ctx, settlement.ID, "coachA", domain.StatusUnderReview, "")
	if err != nil {
		t.Fatalf("update to under_review: %v", err)
	}
	if settlement.Status != domain.StatusUnderReview {
		t.Fatalf("expected status under_review, got %s", settlement.Status)
	}

	// under_review -> approved
	settlement, err = svc.UpdateSettlementStatus(ctx, settlement.ID, "coachA", domain.StatusApproved, "")
	if err != nil {
		t.Fatalf("update to approved: %v", err)
	}
	if settlement.Status != domain.StatusApproved || settlement.ApprovedAt == "" {
		t.Fatalf("expected status approved with approved_at, got %+v", settlement)
	}
}

func TestVoidSettlement(t *testing.T) {
	_, svc := newSettlementTestDB(t)
	ctx := context.Background()

	settlement, err := svc.CreateSettlement(ctx, domain.CreateSettlementInput{
		CoachID:     "coachA",
		AllyID:      "a1",
		PeriodStart: "2026-10-01",
		PeriodEnd:   "2026-10-31",
		PeriodKey:   "2026-10",
		Currency:    "COP",
	}, "coachA")
	if err != nil {
		t.Fatalf("create settlement: %v", err)
	}

	// Void draft settlement
	settlement, err = svc.VoidSettlement(ctx, settlement.ID, "coachA", "test void")
	if err != nil {
		t.Fatalf("void settlement: %v", err)
	}
	if settlement.Status != domain.StatusVoid {
		t.Fatalf("expected status void, got %s", settlement.Status)
	}

	// Cannot void an already voided settlement
	if _, err := svc.VoidSettlement(ctx, settlement.ID, "coachA", "again"); err == nil {
		t.Fatal("expected error voiding already voided settlement")
	}
}

func TestSettlementIDOR(t *testing.T) {
	_, svc := newSettlementTestDB(t)
	ctx := context.Background()

	settlement, err := svc.CreateSettlement(ctx, domain.CreateSettlementInput{
		CoachID:     "coachA",
		AllyID:      "a1",
		PeriodStart: "2026-10-01",
		PeriodEnd:   "2026-10-31",
		PeriodKey:   "2026-10",
		Currency:    "COP",
	}, "coachA")
	if err != nil {
		t.Fatalf("create settlement: %v", err)
	}

	// coachB cannot see coachA's settlement
	if _, err := svc.GetSettlement(ctx, settlement.ID, "coachB"); err == nil {
		t.Fatal("expected error for foreign settlement")
	} else if !strings.Contains(err.Error(), "not found") {
		t.Fatalf("expected not found error, got %v", err)
	}

	// coachB cannot list coachA's settlements
	list, err := svc.ListSettlementsByCoach(ctx, "coachB")
	if err != nil {
		t.Fatalf("list coachB: %v", err)
	}
	if len(list) != 0 {
		t.Fatalf("expected 0 settlements for coachB, got %d", len(list))
	}
}

func TestCreateCoachPaymentRecord(t *testing.T) {
	_, svc := newSettlementTestDB(t)
	ctx := context.Background()

	settlement, err := svc.CreateSettlement(ctx, domain.CreateSettlementInput{
		CoachID:     "coachA",
		AllyID:      "a1",
		PeriodStart: "2026-10-01",
		PeriodEnd:   "2026-10-31",
		PeriodKey:   "2026-10",
		Currency:    "COP",
	}, "coachA")
	if err != nil {
		t.Fatalf("create settlement: %v", err)
	}

	record, err := svc.CreateCoachPaymentRecord(ctx, domain.CreateCoachPaymentRecordInput{
		SettlementID: settlement.ID,
		CoachID:      "coachA",
		PayerAllyID:  "a1",
		AmountCents:  40000,
		Currency:     "COP",
		ActorID:      "coachA",
		ActorType:    domain.ActorTypeUser,
		Reference:    "ref-1",
		EvidenceRef:  "/private/evidence/1",
		DeclaredAt:   "2026-10-31 00:00:00",
	}, "coachA")
	if err != nil {
		t.Fatalf("create payment record: %v", err)
	}
	if record.Status != domain.PaymentStatusDeclared || record.AmountCents != 40000 {
		t.Fatalf("unexpected record: %+v", record)
	}

	// Confirm the record
	record, err = svc.ConfirmCoachPaymentRecord(ctx, record.ID, "coachA")
	if err != nil {
		t.Fatalf("confirm record: %v", err)
	}
	if record.Status != domain.PaymentStatusConfirmed {
		t.Fatalf("expected status confirmed, got %s", record.Status)
	}
}
