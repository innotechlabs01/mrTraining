// Package commission provides the persistence layer for commission agreements.
package commission

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	commissiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission"
	auditdomain "github.com/innotechlabs01/mr-training-api/internal/domain/audit"
	allaudit "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
)

// Repository implements commission.Repository using the libsql/SQLite driver.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new commission repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateAgreementVersion validates ownership, enforces interval ordering
// (H-02), closes the current open agreement and inserts the new version — all in
// one transaction with the audit event. If any step fails the whole thing rolls
// back, so no partially applied version is ever visible.
func (r *Repository) CreateAgreementVersion(ctx context.Context, in commissiondomain.CreateAgreementInput, ev auditdomain.Event) (*commissiondomain.Agreement, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin agreement tx: %w", err)
	}
	defer tx.Rollback()

	// Ownership: the relationship must exist and belong to the acting coach.
	// A mismatch is reported as not-found so foreign relationships are invisible.
	var ownerCoachID string
	err = tx.QueryRowContext(ctx, `
		SELECT coach_id FROM coach_ally_relationships WHERE id = ?
	`, in.RelationshipID).Scan(&ownerCoachID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, commissiondomain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to load relationship: %w", err)
	}
	if ownerCoachID != in.CoachID {
		return nil, commissiondomain.ErrNotFound
	}

	// Highest valid_to ever used by this relationship (closed versions).
	var maxClosedTo sql.NullString
	if err := tx.QueryRowContext(ctx, `
		SELECT MAX(valid_to) FROM commission_agreements
		WHERE relationship_id = ? AND valid_to IS NOT NULL
	`, in.RelationshipID).Scan(&maxClosedTo); err != nil {
		return nil, fmt.Errorf("failed to read closed intervals: %w", err)
	}

	// Start of the currently open version, if any.
	var openFrom sql.NullString
	if err := tx.QueryRowContext(ctx, `
		SELECT MIN(valid_from) FROM commission_agreements
		WHERE relationship_id = ? AND valid_to IS NULL
	`, in.RelationshipID).Scan(&openFrom); err != nil {
		return nil, fmt.Errorf("failed to read open interval: %w", err)
	}

	// The new interval must start strictly after everything already recorded.
	upper := ""
	if maxClosedTo.Valid {
		upper = maxClosedTo.String
	}
	if openFrom.Valid && openFrom.String > upper {
		upper = openFrom.String
	}
	if upper != "" && in.ValidFrom <= upper {
		return nil, commissiondomain.ErrOverlap
	}

	// Close the current open version at the new valid_from (immutable history).
	if _, err := tx.ExecContext(ctx, `
		UPDATE commission_agreements
		SET valid_to = ?, status = 'superseded'
		WHERE relationship_id = ? AND valid_to IS NULL
	`, in.ValidFrom, in.RelationshipID); err != nil {
		return nil, fmt.Errorf("failed to close previous agreement: %w", err)
	}

	var nextVersion int64
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(version), 0) + 1 FROM commission_agreements WHERE relationship_id = ?
	`, in.RelationshipID).Scan(&nextVersion); err != nil {
		return nil, fmt.Errorf("failed to compute next version: %w", err)
	}

	status := "proposed"
	var acceptedBy, acceptedAt any
	if in.AcceptedBy != "" {
		status = "accepted"
		acceptedBy = in.AcceptedBy
		acceptedAt = in.ValidFrom
	}

	id := uuid.New().String()
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO commission_agreements
			(id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, valid_to, status, accepted_by, accepted_at, created_at)
		VALUES
			(?, ?, ?, ?, ?, 'gross_minus_discount_minus_tax', 'half_up', ?, ?, NULL, ?, ?, ?, datetime('now'))
	`, id, in.RelationshipID, nextVersion, in.RateBps, in.FixedAmountCents, in.Currency, in.ValidFrom, status, acceptedBy, acceptedAt); err != nil {
		return nil, fmt.Errorf("failed to insert agreement: %w", err)
	}

	ev.Entity = "commission_agreement"
	ev.EntityID = id
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	agreement, err := getAgreementTx(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit agreement tx: %w", err)
	}
	return agreement, nil
}

// ListByRelationship returns every agreement version, newest first.
func (r *Repository) ListByRelationship(ctx context.Context, relationshipID string) ([]*commissiondomain.Agreement, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, valid_to, status, COALESCE(accepted_by, ''), COALESCE(accepted_at, ''), created_at
		FROM commission_agreements
		WHERE relationship_id = ?
		ORDER BY version DESC
	`, relationshipID)
	if err != nil {
		return nil, fmt.Errorf("failed to list agreements: %w", err)
	}
	defer rows.Close()

	var out []*commissiondomain.Agreement
	for rows.Next() {
		a, err := scanAgreementRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// GetOpenAgreement returns the current open agreement or ErrNotFound.
func (r *Repository) GetOpenAgreement(ctx context.Context, relationshipID string) (*commissiondomain.Agreement, error) {
	return scanAgreement(r.db.QueryRowContext(ctx, `
		SELECT id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, valid_to, status, COALESCE(accepted_by, ''), COALESCE(accepted_at, ''), created_at
		FROM commission_agreements
		WHERE relationship_id = ? AND valid_to IS NULL
		ORDER BY version DESC
		LIMIT 1
	`, relationshipID))
}

func getAgreementTx(ctx context.Context, tx *sql.Tx, id string) (*commissiondomain.Agreement, error) {
	return scanAgreement(tx.QueryRowContext(ctx, `
		SELECT id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, valid_to, status, COALESCE(accepted_by, ''), COALESCE(accepted_at, ''), created_at
		FROM commission_agreements WHERE id = ?
	`, id))
}

// rowScanner abstracts *sql.Row and *sql.Rows for shared scanning.
type rowScanner interface {
	Scan(dest ...any) error
}

func scanAgreement(row rowScanner) (*commissiondomain.Agreement, error) {
	var a commissiondomain.Agreement
	var validTo, acceptedAt sql.NullString
	if err := row.Scan(&a.ID, &a.RelationshipID, &a.Version, &a.RateBps, &a.FixedAmountCents,
		&a.EligibleBaseRule, &a.Rounding, &a.Currency, &a.ValidFrom, &validTo, &a.Status,
		&a.AcceptedBy, &acceptedAt, &a.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, commissiondomain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan agreement: %w", err)
	}
	if validTo.Valid {
		a.ValidTo = &validTo.String
	}
	if acceptedAt.Valid {
		a.AcceptedAt = acceptedAt.String
	}
	return &a, nil
}

// scanAgreementRow adapts *sql.Rows to the rowScanner interface.
func scanAgreementRow(rows *sql.Rows) (*commissiondomain.Agreement, error) {
	return scanAgreement(rows)
}
