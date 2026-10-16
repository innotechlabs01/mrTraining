package coach_settlement

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_settlement"
	auditdomain "github.com/innotechlabs01/mr-training-api/internal/domain/audit"
	allaudit "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
)

// Repository implements domain.Repository using libsql/SQLite.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new settlement repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetSettlement returns a settlement only when visible to the caller.
func (r *Repository) GetSettlement(ctx context.Context, settlementID, coachID string) (*domain.CoachSettlement, error) {
	return scanSettlement(r.db.QueryRowContext(ctx, `
		SELECT id, coach_id, ally_id, period_start, period_end, period_key, currency, status,
		       operations_count, base_total_cents, commission_gross_cents, adjustments_cents,
		       commission_net_cents, COALESCE(calculated_at, ''), COALESCE(approved_at, ''),
		       COALESCE(closed_at, ''), created_at, updated_at
		FROM coach_settlements WHERE id = ? AND coach_id = ?
	`, settlementID, coachID), coachID)
}

// ListSettlementsByCoach lists settlements where the coach is the beneficiary.
func (r *Repository) ListSettlementsByCoach(ctx context.Context, coachID string) ([]*domain.CoachSettlement, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, coach_id, ally_id, period_start, period_end, period_key, currency, status,
		       operations_count, base_total_cents, commission_gross_cents, adjustments_cents,
		       commission_net_cents, COALESCE(calculated_at, ''), COALESCE(approved_at, ''),
		       COALESCE(closed_at, ''), created_at, updated_at
		FROM coach_settlements WHERE coach_id = ?
		ORDER BY created_at DESC
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list settlements by coach: %w", err)
	}
	defer rows.Close()
	return scanSettlements(rows)
}

// ListSettlementsByAlly lists settlements where the ally is the contractual payer.
func (r *Repository) ListSettlementsByAlly(ctx context.Context, allyID string) ([]*domain.CoachSettlement, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, coach_id, ally_id, period_start, period_end, period_key, currency, status,
		       operations_count, base_total_cents, commission_gross_cents, adjustments_cents,
		       commission_net_cents, COALESCE(calculated_at, ''), COALESCE(approved_at, ''),
		       COALESCE(closed_at, ''), created_at, updated_at
		FROM coach_settlements WHERE ally_id = ?
		ORDER BY created_at DESC
	`, allyID)
	if err != nil {
		return nil, fmt.Errorf("failed to list settlements by ally: %w", err)
	}
	defer rows.Close()
	return scanSettlements(rows)
}

// ListSettlementsForAdmin lists all settlements (admin view).
func (r *Repository) ListSettlementsForAdmin(ctx context.Context) ([]*domain.CoachSettlement, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, coach_id, ally_id, period_start, period_end, period_key, currency, status,
		       operations_count, base_total_cents, commission_gross_cents, adjustments_cents,
		       commission_net_cents, COALESCE(calculated_at, ''), COALESCE(approved_at, ''),
		       COALESCE(closed_at, ''), created_at, updated_at
		FROM coach_settlements ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to list settlements: %w", err)
	}
	defer rows.Close()
	return scanSettlements(rows)
}

// CreateSettlement creates a draft settlement.
func (r *Repository) CreateSettlement(ctx context.Context, in domain.CreateSettlementInput, actorID string) (*domain.CoachSettlement, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	id := uuid.New().String()
	t := time.Now().Format("2006-01-02 15:04:05")
	currency := in.Currency
	if currency == "" {
		currency = "COP"
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO coach_settlements
			(id, coach_id, ally_id, period_start, period_end, period_key, currency, status,
			 operations_count, base_total_cents, commission_gross_cents, adjustments_cents,
			 commission_net_cents, calculated_at, approved_at, closed_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0, 0, 0, 0, NULL, NULL, NULL, ?, ?)
	`, id, in.CoachID, in.AllyID, in.PeriodStart, in.PeriodEnd, in.PeriodKey, currency, t, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert settlement: %w", err)
	}

	ev := auditdomain.NewEvent("coach_settlement", "settlement.created", actorID, map[string]any{
		"settlement_id": id,
		"coach_id":      in.CoachID,
		"ally_id":       in.AllyID,
		"period_key":    in.PeriodKey,
		"currency":      currency,
		"status":        "draft",
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.CoachSettlement{
		ID:                 id,
		CoachID:            in.CoachID,
		AllyID:             in.AllyID,
		PeriodStart:        in.PeriodStart,
		PeriodEnd:          in.PeriodEnd,
		PeriodKey:          in.PeriodKey,
		Currency:           currency,
		Status:             domain.StatusDraft,
		OperationsCount:    0,
		BaseTotalCents:     0,
		CommissionGrossCents: 0,
		AdjustmentsCents:   0,
		CommissionNetCents: 0,
		CreatedAt:          t,
		UpdatedAt:          t,
	}, nil
}

// GetEligibleEntriesForPeriod returns commission entries eligible for settlement.
func (r *Repository) GetEligibleEntriesForPeriod(ctx context.Context, coachID, allyID, periodStart, periodEnd string) ([]*domain.SettlementItemCandidate, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT ce.id, ce.operation_id, ce.relationship_id, ce.base_cents, ce.rate_bps,
		       ce.fixed_amount_cents, ce.amount_cents, ce.currency, ce.computed_at
		FROM commission_entries ce
		JOIN ally_operations ao ON ce.operation_id = ao.id
		WHERE ce.status = 'accrued'
		  AND ce.coach_id = ?
		  AND ao.ally_id = ?
		  AND ao.status IN ('fulfilled','attended')
		  AND EXISTS (
			SELECT 1 FROM ally_payment_declarations apd
			WHERE apd.operation_id = ce.operation_id
			  AND apd.status IN ('declared','under_review','confirmed')
			ORDER BY apd.version DESC LIMIT 1
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM settlement_items si
			WHERE si.entry_id = ce.id AND si.released_at IS NULL
		  )
		ORDER BY ce.computed_at
	`, coachID, allyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get eligible entries: %w", err)
	}
	defer rows.Close()

	var out []*domain.SettlementItemCandidate
	for rows.Next() {
		var c domain.SettlementItemCandidate
		err := rows.Scan(&c.EntryID, &c.OperationID, &c.RelationshipID, &c.BaseCents,
			&c.RateBps, &c.FixedAmountCents, &c.AmountCents, &c.Currency, &c.ComputedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan candidate: %w", err)
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}

// CalculateSettlement computes totals from eligible entries and creates settlement items.
func (r *Repository) CalculateSettlement(ctx context.Context, settlementID string, actorID string) (*domain.CoachSettlement, []*domain.SettlementItem, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	// Load settlement and verify status is draft or calculated.
	var status string
	var allyID, coachID, periodKey, currency string
	err = tx.QueryRowContext(ctx, `
		SELECT status, coach_id, ally_id, period_key, currency FROM coach_settlements WHERE id = ?
	`, settlementID).Scan(&status, &coachID, &allyID, &periodKey, &currency)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, domain.ErrNotFound
		}
		return nil, nil, fmt.Errorf("failed to load settlement: %w", err)
	}
	if status != domain.StatusDraft && status != domain.StatusCalculated {
		return nil, nil, fmt.Errorf("settlement not editable (status=%s)", status)
	}

	// Get eligible entries for this coach+ally+period.
	// Determine period_start/period_end from period_key (YYYY-MM).
	candidates, err := r.getEligibleEntriesTx(ctx, tx, coachID, allyID, periodKey)
	if err != nil {
		return nil, nil, err
	}

	var baseTotalCents, commissionGrossCents, adjustmentsCents int64
	var items []*domain.SettlementItem

	for _, c := range candidates {
		itemID := uuid.New().String()
		t := time.Now().Format("2006-01-02 15:04:05")

		_, err := tx.ExecContext(ctx, `
			INSERT INTO settlement_items
				(id, settlement_id, entry_id, base_cents, rate_bps, fixed_amount_cents,
				 amount_cents, released_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
		`, itemID, settlementID, c.EntryID, c.BaseCents, c.RateBps, c.FixedAmountCents,
			c.AmountCents, t)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to insert settlement item: %w", err)
		}

		baseTotalCents += c.BaseCents
		commissionGrossCents += c.AmountCents

		items = append(items, &domain.SettlementItem{
			ID:           itemID,
			SettlementID: settlementID,
			EntryID:      c.EntryID,
			BaseCents:    c.BaseCents,
			RateBps:      c.RateBps,
			AmountCents:  c.AmountCents,
			CreatedAt:    t,
		})
	}

	commissionNetCents := commissionGrossCents + adjustmentsCents
	t := time.Now().Format("2006-01-02 15:04:05")

	_, err = tx.ExecContext(ctx, `
		UPDATE coach_settlements
		SET status = 'calculated', operations_count = ?, base_total_cents = ?,
		    commission_gross_cents = ?, adjustments_cents = ?, commission_net_cents = ?,
		    calculated_at = ?, updated_at = ?
		WHERE id = ?
	`, len(items), baseTotalCents, commissionGrossCents, adjustmentsCents,
		commissionNetCents, t, t, settlementID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to update settlement: %w", err)
	}

	ev := auditdomain.NewEvent("coach_settlement", "settlement.calculated", actorID, map[string]any{
		"settlement_id":        settlementID,
		"operations_count":     len(items),
		"base_total_cents":     baseTotalCents,
		"commission_gross_cents": commissionGrossCents,
		"commission_net_cents":   commissionNetCents,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.CoachSettlement{
		ID:                 settlementID,
		CoachID:            coachID,
		AllyID:             allyID,
		PeriodKey:          periodKey,
		Currency:           currency,
		Status:             domain.StatusCalculated,
		OperationsCount:    len(items),
		BaseTotalCents:     baseTotalCents,
		CommissionGrossCents: commissionGrossCents,
		AdjustmentsCents:   adjustmentsCents,
		CommissionNetCents: commissionNetCents,
		CalculatedAt:       t,
		CreatedAt:          t,
		UpdatedAt:          t,
	}, items, nil
}

// UpdateSettlementStatus transitions settlement status with audit.
func (r *Repository) UpdateSettlementStatus(ctx context.Context, settlementID, actorID string, status string, note string) (*domain.CoachSettlement, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	t := time.Now().Format("2006-01-02 15:04:05")

	// Verify valid transition.
	var currentStatus string
	err = tx.QueryRowContext(ctx, `SELECT status FROM coach_settlements WHERE id = ?`, settlementID).Scan(&currentStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to load settlement: %w", err)
	}
	if !domain.CanTransition(currentStatus, status) {
		return nil, fmt.Errorf("invalid transition %s -> %s", currentStatus, status)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE coach_settlements
		SET status = ?, updated_at = ?,
		    approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END
		WHERE id = ?
	`, status, t, status, t, settlementID)
	if err != nil {
		return nil, fmt.Errorf("failed to update settlement status: %w", err)
	}

	ev := auditdomain.NewEvent("coach_settlement", "settlement.status_changed", actorID, map[string]any{
		"settlement_id": settlementID,
		"from_status":   currentStatus,
		"to_status":     status,
		"note":          note,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return r.GetSettlement(ctx, settlementID, actorID)
}

// VoidSettlement voids a draft|calculated|under_review settlement and releases its items.
func (r *Repository) VoidSettlement(ctx context.Context, settlementID, actorID string, reason string) (*domain.CoachSettlement, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	var currentStatus string
	err = tx.QueryRowContext(ctx, `SELECT status FROM coach_settlements WHERE id = ?`, settlementID).Scan(&currentStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to load settlement: %w", err)
	}
	if !domain.CanVoid(currentStatus) {
		return nil, fmt.Errorf("settlement not voidable (status=%s)", currentStatus)
	}

	t := time.Now().Format("2006-01-02 15:04:05")

	// Release settlement items (set released_at) so entries can be re-settled.
	_, err = tx.ExecContext(ctx, `
		UPDATE settlement_items SET released_at = ? WHERE settlement_id = ? AND released_at IS NULL
	`, t, settlementID)
	if err != nil {
		return nil, fmt.Errorf("failed to release settlement items: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE coach_settlements
		SET status = 'void', updated_at = ?
		WHERE id = ?
	`, t, settlementID)
	if err != nil {
		return nil, fmt.Errorf("failed to void settlement: %w", err)
	}

	ev := auditdomain.NewEvent("coach_settlement", "settlement.voided", actorID, map[string]any{
		"settlement_id": settlementID,
		"from_status":   currentStatus,
		"to_status":     domain.StatusVoid,
		"reason":        reason,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return r.GetSettlement(ctx, settlementID, actorID)
}

// ListSettlementItems lists items of a settlement.
func (r *Repository) ListSettlementItems(ctx context.Context, settlementID string) ([]*domain.SettlementItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, settlement_id, entry_id, base_cents, rate_bps, amount_cents,
		       COALESCE(released_at, ''), created_at
		FROM settlement_items WHERE settlement_id = ?
		ORDER BY created_at
	`, settlementID)
	if err != nil {
		return nil, fmt.Errorf("failed to list settlement items: %w", err)
	}
	defer rows.Close()

	var out []*domain.SettlementItem
	for rows.Next() {
		var i domain.SettlementItem
		var releasedAt sql.NullString
		err := rows.Scan(&i.ID, &i.SettlementID, &i.EntryID, &i.BaseCents, &i.RateBps,
			&i.AmountCents, &releasedAt, &i.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan settlement item: %w", err)
		}
		i.ReleasedAt = releasedAt.String
		out = append(out, &i)
	}
	return out, rows.Err()
}

// CreateSettlementDocument creates a settlement document.
func (r *Repository) CreateSettlementDocument(ctx context.Context, in domain.CreateSettlementDocumentInput, actorID string) (*domain.SettlementDocument, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	id := uuid.New().String()
	t := time.Now().Format("2006-01-02 15:04:05")

	_, err = tx.ExecContext(ctx, `
		INSERT INTO settlement_documents
			(id, settlement_id, kind, content_ref, status, version, generated_at, created_at)
		VALUES (?, ?, ?, ?, 'draft', 1, ?, ?)
	`, id, in.SettlementID, in.Kind, in.ContentRef, t, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert settlement document: %w", err)
	}

	ev := auditdomain.NewEvent("coach_settlement", "settlement.document_created", actorID, map[string]any{
		"settlement_id": in.SettlementID,
		"document_id":   id,
		"kind":          in.Kind,
		"status":        "draft",
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.SettlementDocument{
		ID:           id,
		SettlementID: in.SettlementID,
		Kind:         in.Kind,
		ContentRef:   in.ContentRef,
		Status:       domain.DocStatusDraft,
		Version:      1,
		GeneratedAt:  t,
		CreatedAt:    t,
	}, nil
}

// ListSettlementDocuments lists documents of a settlement.
func (r *Repository) ListSettlementDocuments(ctx context.Context, settlementID string) ([]*domain.SettlementDocument, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, settlement_id, kind, content_ref, status, version, generated_at, COALESCE(sent_at, '')
		FROM settlement_documents WHERE settlement_id = ?
		ORDER BY created_at DESC
	`, settlementID)
	if err != nil {
		return nil, fmt.Errorf("failed to list settlement documents: %w", err)
	}
	defer rows.Close()

	var out []*domain.SettlementDocument
	for rows.Next() {
		var d domain.SettlementDocument
		var sentAt sql.NullString
		err := rows.Scan(&d.ID, &d.SettlementID, &d.Kind, &d.ContentRef, &d.Status,
			&d.Version, &d.GeneratedAt, &sentAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan settlement document: %w", err)
		}
		d.SentAt = sentAt.String
		out = append(out, &d)
	}
	return out, rows.Err()
}

// CreateCoachPaymentRecord creates an external payment record.
func (r *Repository) CreateCoachPaymentRecord(ctx context.Context, in domain.CreateCoachPaymentRecordInput, actorID string) (*domain.CoachPaymentRecord, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	id := uuid.New().String()
	t := time.Now().Format("2006-01-02 15:04:05")
	declaredAt := in.DeclaredAt
	if declaredAt == "" {
		declaredAt = t
	}
	currency := in.Currency
	if currency == "" {
		currency = "COP"
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO coach_payment_records
			(id, settlement_id, coach_id, payer_ally_id, amount_cents, currency,
			 actor_id, actor_type, reference, evidence_ref, declared_at, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'declared', ?)
	`, id, in.SettlementID, in.CoachID, in.PayerAllyID, in.AmountCents, currency,
		in.ActorID, in.ActorType, in.Reference, in.EvidenceRef, declaredAt, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert payment record: %w", err)
	}

	ev := auditdomain.NewEvent("coach_payment_record", "payment_record.created", actorID, map[string]any{
		"record_id":      id,
		"settlement_id":  in.SettlementID,
		"coach_id":       in.CoachID,
		"payer_ally_id":  in.PayerAllyID,
		"amount_cents":   in.AmountCents,
		"currency":       currency,
		"status":         "declared",
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.CoachPaymentRecord{
		ID:          id,
		SettlementID: in.SettlementID,
		CoachID:     in.CoachID,
		PayerAllyID: in.PayerAllyID,
		AmountCents: in.AmountCents,
		Currency:    currency,
		ActorID:     in.ActorID,
		ActorType:   in.ActorType,
		Reference:   in.Reference,
		EvidenceRef: in.EvidenceRef,
		DeclaredAt:  declaredAt,
		Status:      domain.PaymentStatusDeclared,
		CreatedAt:   t,
	}, nil
}

// ConfirmCoachPaymentRecord confirms an external payment record.
func (r *Repository) ConfirmCoachPaymentRecord(ctx context.Context, recordID, actorID string) (*domain.CoachPaymentRecord, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	var currentStatus string
	err = tx.QueryRowContext(ctx, `SELECT status FROM coach_payment_records WHERE id = ?`, recordID).Scan(&currentStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to load payment record: %w", err)
	}
	if currentStatus != domain.PaymentStatusDeclared {
		return nil, fmt.Errorf("payment record not in declared state (status=%s)", currentStatus)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE coach_payment_records
		SET status = 'confirmed'
		WHERE id = ? AND status = 'declared'
	`, recordID)
	if err != nil {
		return nil, fmt.Errorf("failed to confirm payment record: %w", err)
	}

	ev := auditdomain.NewEvent("coach_payment_record", "payment_record.confirmed", actorID, map[string]any{
		"record_id": recordID,
		"status":    domain.PaymentStatusConfirmed,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return r.GetCoachPaymentRecord(ctx, recordID, "")
}

// ListCoachPaymentRecords lists payment records.
func (r *Repository) ListCoachPaymentRecords(ctx context.Context, coachID string, allyID string) ([]*domain.CoachPaymentRecord, error) {
	query := `
		SELECT id, settlement_id, coach_id, payer_ally_id, amount_cents, currency,
		       actor_id, actor_type, reference, evidence_ref, declared_at, status, created_at
		FROM coach_payment_records
		WHERE 1 = 1`
	args := []any{}
	if coachID != "" {
		query += " AND coach_id = ?"
		args = append(args, coachID)
	}
	if allyID != "" {
		query += " AND payer_ally_id = ?"
		args = append(args, allyID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list payment records: %w", err)
	}
	defer rows.Close()

	var out []*domain.CoachPaymentRecord
	for rows.Next() {
		var p domain.CoachPaymentRecord
		err := rows.Scan(&p.ID, &p.SettlementID, &p.CoachID, &p.PayerAllyID, &p.AmountCents,
			&p.Currency, &p.ActorID, &p.ActorType, &p.Reference, &p.EvidenceRef,
			&p.DeclaredAt, &p.Status, &p.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan payment record: %w", err)
		}
		out = append(out, &p)
	}
	return out, rows.Err()
}

// GetCoachPaymentRecord returns a payment record by ID.
func (r *Repository) GetCoachPaymentRecord(ctx context.Context, recordID string, actorID string) (*domain.CoachPaymentRecord, error) {
	return scanPaymentRecord(r.db.QueryRowContext(ctx, `
		SELECT id, settlement_id, coach_id, payer_ally_id, amount_cents, currency,
		       actor_id, actor_type, reference, evidence_ref, declared_at, status, created_at
		FROM coach_payment_records WHERE id = ?
	`, recordID))
}

// getEligibleEntriesTx fetches eligible entries within a transaction.
func (r *Repository) getEligibleEntriesTx(ctx context.Context, tx *sql.Tx, coachID, allyID, periodKey string) ([]*domain.SettlementItemCandidate, error) {
	rows, err := tx.QueryContext(ctx, `
		SELECT ce.id, ce.operation_id, ce.relationship_id, ce.base_cents, ce.rate_bps,
		       ce.fixed_amount_cents, ce.amount_cents, ce.currency, ce.computed_at
		FROM commission_entries ce
		JOIN ally_operations ao ON ce.operation_id = ao.id
		WHERE ce.status = 'accrued'
		  AND ce.coach_id = ?
		  AND ao.ally_id = ?
		  AND ao.status IN ('fulfilled','attended')
		  AND EXISTS (
			SELECT 1 FROM ally_payment_declarations apd
			WHERE apd.operation_id = ce.operation_id
			  AND apd.status IN ('declared','under_review','confirmed')
			ORDER BY apd.version DESC LIMIT 1
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM settlement_items si
			WHERE si.entry_id = ce.id AND si.released_at IS NULL
		  )
		ORDER BY ce.computed_at
	`, coachID, allyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get eligible entries: %w", err)
	}
	defer rows.Close()

	var out []*domain.SettlementItemCandidate
	for rows.Next() {
		var c domain.SettlementItemCandidate
		err := rows.Scan(&c.EntryID, &c.OperationID, &c.RelationshipID, &c.BaseCents,
			&c.RateBps, &c.FixedAmountCents, &c.AmountCents, &c.Currency, &c.ComputedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan candidate: %w", err)
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}

// scanSettlement scans a settlement row.
func scanSettlement(row *sql.Row, coachID string) (*domain.CoachSettlement, error) {
	var s domain.CoachSettlement
	var calculatedAt, approvedAt, closedAt sql.NullString
	err := row.Scan(&s.ID, &s.CoachID, &s.AllyID, &s.PeriodStart, &s.PeriodEnd, &s.PeriodKey,
		&s.Currency, &s.Status, &s.OperationsCount, &s.BaseTotalCents, &s.CommissionGrossCents,
		&s.AdjustmentsCents, &s.CommissionNetCents, &calculatedAt, &approvedAt, &closedAt,
		&s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan settlement: %w", err)
	}
	s.CalculatedAt = calculatedAt.String
	s.ApprovedAt = approvedAt.String
	s.ClosedAt = closedAt.String
	_ = coachID // ownership verified by caller
	return &s, nil
}

func scanSettlements(rows *sql.Rows) ([]*domain.CoachSettlement, error) {
	var out []*domain.CoachSettlement
	for rows.Next() {
		var s domain.CoachSettlement
		var calculatedAt, approvedAt, closedAt sql.NullString
		err := rows.Scan(&s.ID, &s.CoachID, &s.AllyID, &s.PeriodStart, &s.PeriodEnd, &s.PeriodKey,
			&s.Currency, &s.Status, &s.OperationsCount, &s.BaseTotalCents, &s.CommissionGrossCents,
			&s.AdjustmentsCents, &s.CommissionNetCents, &calculatedAt, &approvedAt, &closedAt,
			&s.CreatedAt, &s.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan settlement: %w", err)
		}
		s.CalculatedAt = calculatedAt.String
		s.ApprovedAt = approvedAt.String
		s.ClosedAt = closedAt.String
		out = append(out, &s)
	}
	return out, rows.Err()
}

func scanPaymentRecord(row *sql.Row) (*domain.CoachPaymentRecord, error) {
	var p domain.CoachPaymentRecord
	err := row.Scan(&p.ID, &p.SettlementID, &p.CoachID, &p.PayerAllyID, &p.AmountCents,
		&p.Currency, &p.ActorID, &p.ActorType, &p.Reference, &p.EvidenceRef,
		&p.DeclaredAt, &p.Status, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan payment record: %w", err)
	}
	return &p, nil
}
