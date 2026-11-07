package paymentledger

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/payment_ledger"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

type Repository struct {
	db   *sql.DB
	exec database.Executor
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

func (r *Repository) WithExecutor(exec database.Executor) domain.Repository {
	return &Repository{db: r.db, exec: exec}
}

func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func scanNullStr(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

func (r *Repository) CreateTerm(ctx context.Context, term *domain.CommissionTerm) (*domain.CommissionTerm, error) {
	if term.ID == "" {
		term.ID = uuid.New().String()
	}
	if term.Version <= 0 {
		// allocate next version
		var max sql.NullInt64
		q := `SELECT MAX(version) FROM platform_commission_terms WHERE COALESCE(coach_id,'') = COALESCE($1,'')`
		if err := r.exec.QueryRowContext(ctx, q, nullStr(term.CoachID)).Scan(&max); err != nil {
			return nil, fmt.Errorf("allocate version: %w", err)
		}
		if max.Valid {
			term.Version = int(max.Int64) + 1
		} else {
			term.Version = 1
		}
	}
	if term.Currency == "" {
		term.Currency = "COP"
	}
	if term.Status == "" {
		term.Status = "proposed"
	}
	if term.ValidFrom == "" {
		term.ValidFrom = time.Now().UTC().Format("2006-01-02")
	}
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	if term.CreatedAt == "" {
		term.CreatedAt = now
	}
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO platform_commission_terms
		(id, coach_id, version, rate_bps, fixed_fee_cents, processing_bps, currency, status, valid_from, valid_to, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		term.ID, nullStr(term.CoachID), term.Version, term.RateBps, term.FixedFeeCents, term.ProcessingBps,
		term.Currency, term.Status, term.ValidFrom, nullStrPtr(term.ValidTo), term.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert commission term: %w", err)
	}
	return term, nil
}

func nullStrPtr(p *string) interface{} {
	if p == nil || *p == "" {
		return nil
	}
	return *p
}

func (r *Repository) GetActiveTerm(ctx context.Context, coachID string, at string) (*domain.CommissionTerm, error) {
	if at == "" {
		at = time.Now().UTC().Format("2006-01-02")
	}
	// coach-specific first
	t, err := r.queryActiveTerm(ctx, coachID, at)
	if err == nil {
		return t, nil
	}
	if err != sql.ErrNoRows {
		// maybe no rows; try global
	}
	if coachID != "" {
		t2, err2 := r.queryActiveTerm(ctx, "", at)
		if err2 == nil {
			return t2, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (r *Repository) queryActiveTerm(ctx context.Context, coachID string, at string) (*domain.CommissionTerm, error) {
	var q string
	if coachID == "" {
		q = `SELECT id, coach_id, version, rate_bps, fixed_fee_cents, processing_bps, currency, status, valid_from, valid_to, created_at
		FROM platform_commission_terms
		WHERE (coach_id IS NULL OR coach_id = '') AND status = 'active'
		  AND valid_from <= $1 AND (valid_to IS NULL OR valid_to >= $1)
		ORDER BY valid_from DESC, version DESC LIMIT 1`
	} else {
		q = `SELECT id, coach_id, version, rate_bps, fixed_fee_cents, processing_bps, currency, status, valid_from, valid_to, created_at
		FROM platform_commission_terms
		WHERE coach_id = $2 AND status = 'active'
		  AND valid_from <= $1 AND (valid_to IS NULL OR valid_to >= $1)
		ORDER BY valid_from DESC, version DESC LIMIT 1`
	}
	row := r.exec.QueryRowContext(ctx, q, at, coachID)
	return scanTerm(row)
}

func scanTerm(s interface{ Scan(...interface{}) error }) (*domain.CommissionTerm, error) {
	var t domain.CommissionTerm
	var coachID sql.NullString
	var validTo sql.NullString
	var createdAt, validFrom string
	err := s.Scan(&t.ID, &coachID, &t.Version, &t.RateBps, &t.FixedFeeCents, &t.ProcessingBps,
		&t.Currency, &t.Status, &validFrom, &validTo, &createdAt)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	t.CoachID = scanNullStr(coachID)
	t.ValidFrom = validFrom
	if validTo.Valid {
		v := validTo.String
		t.ValidTo = &v
	}
	t.CreatedAt = createdAt
	return &t, nil
}

func (r *Repository) CreateEntry(ctx context.Context, entry *domain.LedgerEntry) (*domain.LedgerEntry, error) {
	// idempotency by Wompi transaction id
	if entry.WompiTransactionID != "" {
		if existing, err := r.GetEntryByWompiID(ctx, entry.WompiTransactionID); err == nil && existing != nil {
			return existing, nil
		}
	}
	if entry.IdempotencyKey != "" {
		var existingID string
		err := r.exec.QueryRowContext(ctx, `SELECT id FROM wompi_payment_ledger WHERE idempotency_key = $1 LIMIT 1`, entry.IdempotencyKey).Scan(&existingID)
		if err == nil && existingID != "" {
			if e, err2 := r.GetEntry(ctx, existingID, entry.CoachID); err2 == nil {
				return e, nil
			}
		}
	}
	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}
	if entry.Currency == "" {
		entry.Currency = "COP"
	}
	if entry.SourceType == "" {
		entry.SourceType = domain.SourceTypeMembership
	}
	if entry.Status == "" {
		entry.Status = domain.StatusPending
	}
	if entry.PaymentPeriod == "" && entry.PeriodStart != "" {
		entry.PaymentPeriod = entry.PeriodStart[:len(entry.PeriodStart)]
		if len(entry.PaymentPeriod) >= 7 {
			entry.PaymentPeriod = entry.PeriodStart[:7]
		}
	}
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	if entry.CreatedAt == "" {
		entry.CreatedAt = now
	}
	entry.UpdatedAt = now

	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO wompi_payment_ledger
		(id, wompi_transaction_id, source_type, membership_payment_id, order_id, subscription_id,
		 athlete_id, coach_id, gross_amount_cents, processing_fee_cents, platform_commission_cents,
		 coach_net_payable_cents, adjustments_cents, currency, period_start, period_end, payment_period,
		 status, commission_term_id, commission_term_version, reversed_entry_id, settlement_reference,
		 settled_at, idempotency_key, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
		entry.ID, entry.WompiTransactionID, entry.SourceType, nullStr(entry.MembershipPaymentID),
		nullStr(entry.OrderID), nullStr(entry.SubscriptionID), entry.AthleteID, entry.CoachID,
		entry.GrossAmountCents, entry.ProcessingFeeCents, entry.PlatformCommissionCents,
		entry.CoachNetPayableCents, entry.AdjustmentsCents, entry.Currency,
		entry.PeriodStart, entry.PeriodEnd, entry.PaymentPeriod, entry.Status,
		nullStr(entry.CommissionTermID), entry.CommissionTermVersion, nullStr(entry.ReversedEntryID),
		nullStr(entry.SettlementReference), nullStr(entry.SettledAt), nullStr(entry.IdempotencyKey),
		entry.CreatedAt, entry.UpdatedAt)
	if err != nil {
		// duplicate fallback
		if existing, gerr := r.GetEntryByWompiID(ctx, entry.WompiTransactionID); gerr == nil && existing != nil {
			return existing, nil
		}
		return nil, fmt.Errorf("insert ledger entry: %w", err)
	}
	return entry, nil
}

func (r *Repository) GetEntryByWompiID(ctx context.Context, wompiTxID string) (*domain.LedgerEntry, error) {
	row := r.exec.QueryRowContext(ctx, `
		SELECT id, wompi_transaction_id, source_type, membership_payment_id, order_id, subscription_id,
		       athlete_id, coach_id, gross_amount_cents, processing_fee_cents, platform_commission_cents,
		       coach_net_payable_cents, adjustments_cents, currency, period_start, period_end, payment_period,
		       status, commission_term_id, commission_term_version, reversed_entry_id, settlement_reference,
		       settled_at, idempotency_key, created_at, updated_at
		FROM wompi_payment_ledger WHERE wompi_transaction_id = $1 LIMIT 1`, wompiTxID)
	return scanEntry(row)
}

func (r *Repository) GetEntry(ctx context.Context, id, coachID string) (*domain.LedgerEntry, error) {
	q := `SELECT id, wompi_transaction_id, source_type, membership_payment_id, order_id, subscription_id,
		       athlete_id, coach_id, gross_amount_cents, processing_fee_cents, platform_commission_cents,
		       coach_net_payable_cents, adjustments_cents, currency, period_start, period_end, payment_period,
		       status, commission_term_id, commission_term_version, reversed_entry_id, settlement_reference,
		       settled_at, idempotency_key, created_at, updated_at
		FROM wompi_payment_ledger WHERE id = $1`
	args := []interface{}{id}
	if coachID != "" {
		q += ` AND coach_id = $2`
		args = append(args, coachID)
	}
	q += ` LIMIT 1`
	row := r.exec.QueryRowContext(ctx, q, args...)
	e, err := scanEntry(row)
	if err == sql.ErrNoRows {
		return nil, domain.ErrNotFound
	}
	return e, err
}

func (r *Repository) ListEntriesByCoach(ctx context.Context, coachID string) ([]*domain.LedgerEntry, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, wompi_transaction_id, source_type, membership_payment_id, order_id, subscription_id,
		       athlete_id, coach_id, gross_amount_cents, processing_fee_cents, platform_commission_cents,
		       coach_net_payable_cents, adjustments_cents, currency, period_start, period_end, payment_period,
		       status, commission_term_id, commission_term_version, reversed_entry_id, settlement_reference,
		       settled_at, idempotency_key, created_at, updated_at
		FROM wompi_payment_ledger WHERE coach_id = $1 ORDER BY created_at DESC`, coachID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*domain.LedgerEntry{}
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *Repository) UpdateEntryStatus(ctx context.Context, id, coachID, status string) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	res, err := r.exec.ExecContext(ctx, `UPDATE wompi_payment_ledger SET status=$1, updated_at=$4 WHERE id=$2 AND coach_id=$3`, status, id, coachID, now)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) UpdateEntryAmounts(ctx context.Context, entry *domain.LedgerEntry) error {
	_, err := r.exec.ExecContext(ctx, `
		UPDATE wompi_payment_ledger
		SET gross_amount_cents=$1, processing_fee_cents=$2, platform_commission_cents=$3,
		    coach_net_payable_cents=$4, adjustments_cents=$5, status=$6, updated_at=$9
		WHERE id=$7 AND coach_id=$8`,
		entry.GrossAmountCents, entry.ProcessingFeeCents, entry.PlatformCommissionCents,
		entry.CoachNetPayableCents, entry.AdjustmentsCents, entry.Status, entry.ID, entry.CoachID,
		time.Now().UTC().Format("2006-01-02 15:04:05"))
	return err
}

func (r *Repository) SettleEntry(ctx context.Context, id, coachID, settlementReference, settledAt string) error {
	res, err := r.exec.ExecContext(ctx, `UPDATE wompi_payment_ledger SET status=$1, settlement_reference=$2, settled_at=$3, updated_at=$4 WHERE id=$5 AND coach_id=$6`,
		domain.StatusSettled, settlementReference, settledAt, time.Now().UTC().Format("2006-01-02 15:04:05"), id, coachID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) RecordAdjustment(ctx context.Context, adj *domain.FinancialAdjustment) (*domain.FinancialAdjustment, error) {
	if adj.ID == "" {
		adj.ID = uuid.New().String()
	}
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	if adj.CreatedAt == "" {
		adj.CreatedAt = now
	}
	_, err := r.exec.ExecContext(ctx, `
		INSERT INTO wompi_ledger_adjustments
		(id, entry_id, kind, amount_cents, reason, created_by, external_reference, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		adj.ID, adj.EntryID, adj.Kind, adj.AmountCents, adj.Reason, adj.CreatedBy,
		nullStr(adj.ExternalReference), adj.CreatedAt)
	if err != nil {
		return nil, err
	}
	return adj, nil
}

func (r *Repository) ListAdjustments(ctx context.Context, entryID string) ([]*domain.FinancialAdjustment, error) {
	rows, err := r.exec.QueryContext(ctx, `
		SELECT id, entry_id, kind, amount_cents, reason, created_by, external_reference, created_at
		FROM wompi_ledger_adjustments WHERE entry_id=$1 ORDER BY created_at`, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*domain.FinancialAdjustment{}
	for rows.Next() {
		var a domain.FinancialAdjustment
		var ext sql.NullString
		if err := rows.Scan(&a.ID, &a.EntryID, &a.Kind, &a.AmountCents, &a.Reason, &a.CreatedBy, &ext, &a.CreatedAt); err != nil {
			return nil, err
		}
		a.ExternalReference = scanNullStr(ext)
		out = append(out, &a)
	}
	return out, rows.Err()
}

func scanEntry(s interface{ Scan(...interface{}) error }) (*domain.LedgerEntry, error) {
	var e domain.LedgerEntry
	var membershipPaymentID, orderID, subscriptionID, commissionTermID, reversedEntryID, settlementRef, settledAt, idempotencyKey sql.NullString
	var periodStart, periodEnd, paymentPeriod, status, createdAt, updatedAt string
	err := s.Scan(
		&e.ID, &e.WompiTransactionID, &e.SourceType, &membershipPaymentID, &orderID, &subscriptionID,
		&e.AthleteID, &e.CoachID, &e.GrossAmountCents, &e.ProcessingFeeCents, &e.PlatformCommissionCents,
		&e.CoachNetPayableCents, &e.AdjustmentsCents, &e.Currency, &periodStart, &periodEnd, &paymentPeriod,
		&status, &commissionTermID, &e.CommissionTermVersion, &reversedEntryID, &settlementRef,
		&settledAt, &idempotencyKey, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	e.MembershipPaymentID = scanNullStr(membershipPaymentID)
	e.OrderID = scanNullStr(orderID)
	e.SubscriptionID = scanNullStr(subscriptionID)
	e.PeriodStart = periodStart
	e.PeriodEnd = periodEnd
	e.PaymentPeriod = paymentPeriod
	e.Status = status
	e.CommissionTermID = scanNullStr(commissionTermID)
	e.ReversedEntryID = scanNullStr(reversedEntryID)
	e.SettlementReference = scanNullStr(settlementRef)
	e.SettledAt = scanNullStr(settledAt)
	e.IdempotencyKey = scanNullStr(idempotencyKey)
	e.CreatedAt = createdAt
	e.UpdatedAt = updatedAt
	return &e, nil
}
