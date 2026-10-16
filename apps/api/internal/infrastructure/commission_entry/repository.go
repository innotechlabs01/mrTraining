package commission_entry

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	auditdomain "github.com/innotechlabs01/mr-training-api/internal/domain/audit"
	allaudit "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
)

// Repository implements domain.Repository using libsql/SQLite.
// Todas las mutaciones financieras se escriben en la misma transacción que el
// evento de auditoría (H-05).
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new commission entry repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateCommissionEntry crea una entrada de comisión con auditoría en la misma tx.
func (r *Repository) CreateCommissionEntry(ctx context.Context, in domain.CreateCommissionEntryInput, actorID string) (*domain.CommissionEntry, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	id := uuid.New().String()
	t := time.Now().Format("2006-01-02 15:04:05")
	computedAt := in.ComputedAt
	if computedAt == "" {
		computedAt = t
	}
	currency := in.Currency
	if currency == "" {
		currency = "COP"
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO commission_entries
			(id, operation_id, relationship_id, coach_id, agreement_id, agreement_version,
			 base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accrued', ?, ?)
	`, id, in.OperationID, in.RelationshipID, in.CoachID, in.AgreementID, in.AgreementVersion,
		in.BaseCents, in.RateBps, in.FixedAmountCents, in.AmountCents, currency, computedAt, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert commission entry: %w", err)
	}

	ev := auditdomain.NewEvent("commission_entry", "commission_entry.accrued", actorID, map[string]any{
		"operation_id":        in.OperationID,
		"relationship_id":     in.RelationshipID,
		"coach_id":            in.CoachID,
		"agreement_id":        in.AgreementID,
		"agreement_version":   in.AgreementVersion,
		"base_cents":          in.BaseCents,
		"rate_bps":            in.RateBps,
		"fixed_amount_cents":  in.FixedAmountCents,
		"amount_cents":        in.AmountCents,
		"currency":            currency,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.CommissionEntry{
		ID:                 id,
		OperationID:        in.OperationID,
		RelationshipID:     in.RelationshipID,
		CoachID:            in.CoachID,
		AgreementID:        in.AgreementID,
		AgreementVersion:   in.AgreementVersion,
		BaseCents:          in.BaseCents,
		RateBps:            in.RateBps,
		FixedAmountCents:   in.FixedAmountCents,
		AmountCents:        in.AmountCents,
		Currency:           currency,
		Status:             "accrued",
		ComputedAt:         computedAt,
		CreatedAt:          t,
	}, nil
}

// GetCommissionEntry devuelve una entrada solo si pertenece al coach.
func (r *Repository) GetCommissionEntry(ctx context.Context, entryID, coachID string) (*domain.CommissionEntry, error) {
	return scanEntry(r.db.QueryRowContext(ctx, `
		SELECT id, operation_id, relationship_id, coach_id, agreement_id, agreement_version,
		       base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at, created_at
		FROM commission_entries WHERE id = ? AND coach_id = ?
	`, entryID, coachID))
}

// ListCommissionEntriesByCoach devuelve todas las entradas de un coach.
func (r *Repository) ListCommissionEntriesByCoach(ctx context.Context, coachID string) ([]*domain.CommissionEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, operation_id, relationship_id, coach_id, agreement_id, agreement_version,
		       base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at, created_at
		FROM commission_entries WHERE coach_id = ?
		ORDER BY created_at DESC
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list commission entries: %w", err)
	}
	defer rows.Close()
	return scanEntries(rows)
}

// ListCommissionEntriesByAlly devuelve todas las entradas de un aliado (vía sus relaciones).
func (r *Repository) ListCommissionEntriesByAlly(ctx context.Context, allyID string) ([]*domain.CommissionEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT ce.id, ce.operation_id, ce.relationship_id, ce.coach_id, ce.agreement_id, ce.agreement_version,
		       ce.base_cents, ce.rate_bps, ce.fixed_amount_cents, ce.amount_cents, ce.currency, ce.status, ce.computed_at, ce.created_at
		FROM commission_entries ce
		JOIN coach_ally_relationships car ON ce.relationship_id = car.id
		WHERE car.ally_id = ?
		ORDER BY ce.created_at DESC
	`, allyID)
	if err != nil {
		return nil, fmt.Errorf("failed to list commission entries by ally: %w", err)
	}
	defer rows.Close()
	return scanEntries(rows)
}

// GetOpenCommissionEntryByOperation devuelve la entrada no reversada de una operación.
func (r *Repository) GetOpenCommissionEntryByOperation(ctx context.Context, operationID string) (*domain.CommissionEntry, error) {
	return scanEntry(r.db.QueryRowContext(ctx, `
		SELECT id, operation_id, relationship_id, coach_id, agreement_id, agreement_version,
		       base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at, created_at
		FROM commission_entries
		WHERE operation_id = ? AND status != 'reversed'
		ORDER BY created_at DESC
		LIMIT 1
	`, operationID))
}

// ReverseCommissionEntry revierte una entrada y crea un ajuste compensatorio.
func (r *Repository) ReverseCommissionEntry(ctx context.Context, entryID, reverserID, reason string) (*domain.CommissionEntry, *domain.FinancialAdjustment, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	current, err := scanEntry(tx.QueryRowContext(ctx, `
		SELECT id, operation_id, relationship_id, coach_id, agreement_id, agreement_version,
		       base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at, created_at
		FROM commission_entries WHERE id = ?
	`, entryID))
	if err != nil {
		return nil, nil, err
	}

	if current.Status == "reversed" {
		return nil, nil, fmt.Errorf("entry already reversed")
	}

	t := time.Now().Format("2006-01-02 15:04:05")

	_, err = tx.ExecContext(ctx, `
		UPDATE commission_entries SET status = 'reversed' WHERE id = ?
	`, entryID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to reverse commission entry: %w", err)
	}

	adjustmentID := uuid.New().String()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO financial_adjustments
			(id, entry_id, kind, amount_cents, reason, created_by, created_at)
		VALUES (?, ?, 'correction', ?, ?, ?, ?)
	`, adjustmentID, entryID, -current.AmountCents, reason, reverserID, t)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert financial adjustment: %w", err)
	}

	ev := auditdomain.NewEvent("commission_entry", "commission_entry.reversed", reverserID, map[string]any{
		"entry_id":     entryID,
		"reason":       reason,
		"reversed_by":  reverserID,
		"amount_cents": -current.AmountCents,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("failed to commit: %w", err)
	}

	updated := *current
	updated.Status = "reversed"
	adjustment := &domain.FinancialAdjustment{
		ID:          adjustmentID,
		EntryID:     entryID,
		Kind:        "correction",
		AmountCents: -current.AmountCents,
		Reason:      reason,
		CreatedBy:   reverserID,
		CreatedAt:   t,
	}
	return &updated, adjustment, nil
}

// CreateFinancialAdjustment crea un asiento compensatorio con auditoría.
func (r *Repository) CreateFinancialAdjustment(ctx context.Context, in domain.CreateFinancialAdjustmentInput, actorID string) (*domain.FinancialAdjustment, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	id := uuid.New().String()
	t := time.Now().Format("2006-01-02 15:04:05")

	_, err = tx.ExecContext(ctx, `
		INSERT INTO financial_adjustments
			(id, entry_id, settlement_id, kind, amount_cents, reason, created_by, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, id, in.EntryID, in.SettlementID, in.Kind, in.AmountCents, in.Reason, in.CreatedBy, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert financial adjustment: %w", err)
	}

	ev := auditdomain.NewEvent("commission_entry", "financial_adjustment.created", actorID, map[string]any{
		"entry_id":     in.EntryID,
		"kind":         in.Kind,
		"amount_cents": in.AmountCents,
		"reason":       in.Reason,
		"created_by":   in.CreatedBy,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.FinancialAdjustment{
		ID:          id,
		EntryID:     in.EntryID,
		SettlementID: in.SettlementID,
		Kind:        in.Kind,
		AmountCents: in.AmountCents,
		Reason:      in.Reason,
		CreatedBy:   in.CreatedBy,
		CreatedAt:   t,
	}, nil
}

// ListFinancialAdjustmentsByEntry devuelve todos los ajustes de una entrada.
func (r *Repository) ListFinancialAdjustmentsByEntry(ctx context.Context, entryID string) ([]*domain.FinancialAdjustment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, entry_id, COALESCE(settlement_id, ''), kind, amount_cents, reason, created_by, created_at
		FROM financial_adjustments WHERE entry_id = ?
		ORDER BY created_at DESC
	`, entryID)
	if err != nil {
		return nil, fmt.Errorf("failed to list financial adjustments: %w", err)
	}
	defer rows.Close()
	return scanAdjustments(rows)
}

// GetOperationForCommission devuelve el estado, monto bruto y relationship_id de una operación.
func (r *Repository) GetOperationForCommission(ctx context.Context, operationID string) (string, int64, string, error) {
	var status string
	var grossCents int64
	var relationshipID string
	err := r.db.QueryRowContext(ctx, `
		SELECT o.status, COALESCE(SUM(oi.unit_price_cents * oi.quantity), 0), o.relationship_id
		FROM ally_operations o
		LEFT JOIN ally_operation_items oi ON oi.operation_id = o.id
		WHERE o.id = ?
		GROUP BY o.id, o.relationship_id
	`, operationID).Scan(&status, &grossCents, &relationshipID)
	if err != nil {
		return "", 0, "", fmt.Errorf("failed to get operation for commission: %w", err)
	}
	return status, grossCents, relationshipID, nil
}

// GetActiveDeclarationStatus devuelve el estado de la declaración activa de una operación.
func (r *Repository) GetActiveDeclarationStatus(ctx context.Context, operationID string) (string, error) {
	var status string
	err := r.db.QueryRowContext(ctx, `
		SELECT status FROM ally_payment_declarations
		WHERE operation_id = ? AND status IN ('declared','under_review','confirmed')
		ORDER BY version DESC
		LIMIT 1
	`, operationID).Scan(&status)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", domain.ErrNotFound
		}
		return "", fmt.Errorf("failed to get active declaration status: %w", err)
	}
	return status, nil
}

// GetActiveAgreement devuelve el acuerdo vigente para una relación.
func (r *Repository) GetActiveAgreement(ctx context.Context, relationshipID string) (string, int64, int64, int, error) {
	var agreementID string
	var rateBps, fixedAmountCents int64
	var version int
	err := r.db.QueryRowContext(ctx, `
		SELECT id, rate_bps, fixed_amount_cents, version FROM commission_agreements
		WHERE relationship_id = ? AND valid_to IS NULL AND status = 'accepted'
		LIMIT 1
	`, relationshipID).Scan(&agreementID, &rateBps, &fixedAmountCents, &version)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", 0, 0, 0, domain.ErrNotFound
		}
		return "", 0, 0, 0, fmt.Errorf("failed to get active agreement: %w", err)
	}
	return agreementID, rateBps, fixedAmountCents, version, nil
}

func scanEntry(row *sql.Row) (*domain.CommissionEntry, error) {
	var e domain.CommissionEntry
	err := row.Scan(&e.ID, &e.OperationID, &e.RelationshipID, &e.CoachID, &e.AgreementID,
		&e.AgreementVersion, &e.BaseCents, &e.RateBps, &e.FixedAmountCents, &e.AmountCents,
		&e.Currency, &e.Status, &e.ComputedAt, &e.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan commission entry: %w", err)
	}
	return &e, nil
}

func scanEntries(rows *sql.Rows) ([]*domain.CommissionEntry, error) {
	var out []*domain.CommissionEntry
	for rows.Next() {
		var e domain.CommissionEntry
		err := rows.Scan(&e.ID, &e.OperationID, &e.RelationshipID, &e.CoachID, &e.AgreementID,
			&e.AgreementVersion, &e.BaseCents, &e.RateBps, &e.FixedAmountCents, &e.AmountCents,
			&e.Currency, &e.Status, &e.ComputedAt, &e.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan commission entry: %w", err)
		}
		out = append(out, &e)
	}
	return out, rows.Err()
}

func scanAdjustments(rows *sql.Rows) ([]*domain.FinancialAdjustment, error) {
	var out []*domain.FinancialAdjustment
	for rows.Next() {
		var a domain.FinancialAdjustment
		var settlementID sql.NullString
		err := rows.Scan(&a.ID, &a.EntryID, &settlementID, &a.Kind, &a.AmountCents, &a.Reason, &a.CreatedBy, &a.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan financial adjustment: %w", err)
		}
		a.SettlementID = settlementID.String
		out = append(out, &a)
	}
	return out, rows.Err()
}