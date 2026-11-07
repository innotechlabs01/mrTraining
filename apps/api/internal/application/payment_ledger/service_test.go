package paymentledger

import (
	"context"
	"os"
	"testing"

	paymentledgerdomain "github.com/innotechlabs01/mr-training-api/internal/domain/payment_ledger"
	paymentledgerinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/payment_ledger"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func newLedgerTestDB(t *testing.T) *database.DB {
	t.Helper()
	url := os.Getenv("SUPER_DATABASE_URL")
	if url == "" {
		url = os.Getenv("POSTGRES_DATABASE_URL")
	}
	if url == "" {
		url = "postgresql://postgres:1e6819bd685e31fa529ed353f65bc6b6eb4d47f9f3e76c43@127.0.0.1:5435/mr_training_migration?sslmode=disable"
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Skipf("skipping: database not reachable: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	ddl := `
DROP TABLE IF EXISTS wompi_ledger_adjustments CASCADE;
DROP TABLE IF EXISTS wompi_payment_ledger CASCADE;
DROP TABLE IF EXISTS platform_commission_terms CASCADE;
CREATE TABLE platform_commission_terms (
  id TEXT PRIMARY KEY, coach_id TEXT, version INTEGER NOT NULL DEFAULT 1,
  rate_bps INTEGER NOT NULL DEFAULT 0, fixed_fee_cents INTEGER NOT NULL DEFAULT 0,
  processing_bps INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'proposed', valid_from TEXT NOT NULL, valid_to TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE wompi_payment_ledger (
  id TEXT PRIMARY KEY, wompi_transaction_id TEXT NOT NULL UNIQUE, source_type TEXT NOT NULL DEFAULT 'membership_payment',
  membership_payment_id TEXT, order_id TEXT, subscription_id TEXT,
  athlete_id TEXT NOT NULL, coach_id TEXT NOT NULL,
  gross_amount_cents BIGINT NOT NULL, processing_fee_cents BIGINT NOT NULL DEFAULT 0,
  platform_commission_cents BIGINT NOT NULL DEFAULT 0, coach_net_payable_cents BIGINT NOT NULL DEFAULT 0,
  adjustments_cents BIGINT NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'COP',
  period_start TEXT NOT NULL, period_end TEXT NOT NULL, payment_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', commission_term_id TEXT, commission_term_version INTEGER NOT NULL DEFAULT 0,
  reversed_entry_id TEXT, settlement_reference TEXT, settled_at TEXT, idempotency_key TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP), updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE wompi_ledger_adjustments (
  id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, kind TEXT NOT NULL, amount_cents BIGINT NOT NULL,
  reason TEXT NOT NULL, created_by TEXT NOT NULL, external_reference TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
`
	if _, err := db.Exec(ddl); err != nil {
		t.Fatalf("ddl: %v", err)
	}
	return db
}

func TestRecordPaymentCreatesLedgerAndComputesNet(t *testing.T) {
	db := newLedgerTestDB(t)
	repo := paymentledgerinfra.NewRepository(db.DB)
	svc := NewService(repo)

	term, err := svc.CreateCommissionTerm(context.Background(), "coach1", 500, 100, 250, "COP", "2020-01-01")
	if err != nil {
		t.Fatal(err)
	}
	// activate
	_, err = db.Exec(`UPDATE platform_commission_terms SET status='active' WHERE id=$1`, term.ID)
	if err != nil {
		t.Fatal(err)
	}

	entry, err := svc.RecordPayment(context.Background(), paymentledgerdomain.CreateLedgerEntryInput{
		WompiTransactionID: "txn_1",
		SourceType:         paymentledgerdomain.SourceTypeMembership,
		AthleteID:          "ath1",
		CoachID:            "coach1",
		GrossAmountCents:   100000,
		Currency:           "COP",
		PeriodStart:        "2026-11-01",
		PeriodEnd:          "2026-11-30",
		Status:             paymentledgerdomain.StatusApproved,
	}, "actor")
	if err != nil {
		t.Fatal(err)
	}
	if entry.ProcessingFeeCents == 0 || entry.PlatformCommissionCents == 0 {
		t.Fatalf("fees not computed: %+v", entry)
	}
	if entry.CoachNetPayableCents != entry.GrossAmountCents-entry.ProcessingFeeCents-entry.PlatformCommissionCents {
		t.Fatalf("net mismatch: %+v", entry)
	}
	if entry.Status != paymentledgerdomain.StatusApproved {
		t.Fatalf("status: %s", entry.Status)
	}
}

func TestRecordPaymentDuplicateWompiTxIdempotent(t *testing.T) {
	db := newLedgerTestDB(t)
	repo := paymentledgerinfra.NewRepository(db.DB)
	svc := NewService(repo)
	svc.CreateCommissionTerm(context.Background(), "coach1", 500, 100, 250, "COP", "2020-01-01")
	db.Exec(`UPDATE platform_commission_terms SET status='active'`)

	in := paymentledgerdomain.CreateLedgerEntryInput{
		WompiTransactionID: "txn_dup",
		AthleteID:          "ath1",
		CoachID:            "coach1",
		GrossAmountCents:   50000,
		PeriodStart:        "2026-11-01",
		PeriodEnd:          "2026-11-30",
		Status:             paymentledgerdomain.StatusPending,
	}
	e1, err := svc.RecordPayment(context.Background(), in, "actor")
	if err != nil {
		t.Fatal(err)
	}
	e2, err := svc.RecordPayment(context.Background(), in, "actor")
	if err != nil {
		t.Fatal(err)
	}
	if e1.ID != e2.ID {
		t.Fatalf("not idempotent: %s vs %s", e1.ID, e2.ID)
	}
}

func TestCrossCoachIsolationLedger(t *testing.T) {
	db := newLedgerTestDB(t)
	repo := paymentledgerinfra.NewRepository(db.DB)
	svc := NewService(repo)
	for _, c := range []string{"coachA", "coachB"} {
		svc.CreateCommissionTerm(context.Background(), c, 100, 0, 100, "COP", "2020-01-01")
		db.Exec(`UPDATE platform_commission_terms SET status='active' WHERE coach_id=$1`, c)
	}
	svc.RecordPayment(context.Background(), paymentledgerdomain.CreateLedgerEntryInput{
		WompiTransactionID: "txA", AthleteID: "a1", CoachID: "coachA", GrossAmountCents: 1000,
		PeriodStart: "2026-11-01", PeriodEnd: "2026-11-30"}, "actor")
	svc.RecordPayment(context.Background(), paymentledgerdomain.CreateLedgerEntryInput{
		WompiTransactionID: "txB", AthleteID: "b1", CoachID: "coachB", GrossAmountCents: 2000,
		PeriodStart: "2026-11-01", PeriodEnd: "2026-11-30"}, "actor")

	listA, _ := svc.ListEntriesByCoach(context.Background(), "coachA")
	listB, _ := svc.ListEntriesByCoach(context.Background(), "coachB")
	if len(listA) != 1 || len(listB) != 1 {
		t.Fatalf("lists wrong: %d %d", len(listA), len(listB))
	}
	// cross-coach get should fail
	entries, _ := svc.ListEntriesByCoach(context.Background(), "coachA")
	id := entries[0].ID
	if _, err := svc.GetEntry(context.Background(), id, "coachB"); err == nil {
		t.Fatal("cross-coach access should fail")
	}
}

func TestSettledRequiresConfirmationLedger(t *testing.T) {
	db := newLedgerTestDB(t)
	repo := paymentledgerinfra.NewRepository(db.DB)
	svc := NewService(repo)
	svc.CreateCommissionTerm(context.Background(), "coach1", 100, 0, 100, "COP", "2020-01-01")
	db.Exec(`UPDATE platform_commission_terms SET status='active'`)
	e, _ := svc.RecordPayment(context.Background(), paymentledgerdomain.CreateLedgerEntryInput{
		WompiTransactionID: "txS", AthleteID: "a1", CoachID: "coach1", GrossAmountCents: 1000,
		PeriodStart: "2026-11-01", PeriodEnd: "2026-11-30", Status: paymentledgerdomain.StatusApproved}, "actor")

	if err := svc.UpdateStatus(context.Background(), e.ID, "coach1", paymentledgerdomain.StatusSettled); err == nil {
		t.Fatal("settled without confirmation should fail")
	}
	if err := svc.MarkSettled(context.Background(), e.ID, "coach1", "ext_conf_123"); err != nil {
		t.Fatal(err)
	}
	got, _ := svc.GetEntry(context.Background(), e.ID, "coach1")
	if got.Status != paymentledgerdomain.StatusSettled || got.SettlementReference != "ext_conf_123" {
		t.Fatalf("not settled: %+v", got)
	}
}

func TestAdjustmentUpdatesEntryLedger(t *testing.T) {
	db := newLedgerTestDB(t)
	repo := paymentledgerinfra.NewRepository(db.DB)
	svc := NewService(repo)
	svc.CreateCommissionTerm(context.Background(), "coach1", 100, 0, 100, "COP", "2020-01-01")
	db.Exec(`UPDATE platform_commission_terms SET status='active'`)
	e, _ := svc.RecordPayment(context.Background(), paymentledgerdomain.CreateLedgerEntryInput{
		WompiTransactionID: "txA2", AthleteID: "a1", CoachID: "coach1", GrossAmountCents: 10000,
		PeriodStart: "2026-11-01", PeriodEnd: "2026-11-30", Status: paymentledgerdomain.StatusApproved}, "actor")
	_, err := svc.RecordAdjustment(context.Background(), paymentledgerdomain.AdjustmentInput{
		EntryID:     e.ID,
		Kind:        paymentledgerdomain.AdjustmentRefund,
		AmountCents: -1000,
		Reason:      "refund",
		CreatedBy:   "actor",
	})
	if err != nil {
		t.Fatal(err)
	}
	got, _ := svc.GetEntry(context.Background(), e.ID, "coach1")
	if got.AdjustmentsCents != -1000 {
		t.Fatalf("adjustment not recorded: %d", got.AdjustmentsCents)
	}
	if got.Status != paymentledgerdomain.StatusReversed {
		t.Fatalf("status should reverse: %s", got.Status)
	}
}
