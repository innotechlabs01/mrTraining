package ally_payment_declaration

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_payment_declaration"
	auditdomain "github.com/innotechlabs01/mr-training-api/internal/domain/audit"
	allaudit "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
)

// Repository implements domain.Repository using libsql/SQLite.
// Todas las mutaciones financieras se escriben en la misma transacción que el
// evento de auditoría (H-05).
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new payment declaration repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreatePaymentDeclaration crea una declaración para una operación válida.
func (r *Repository) CreatePaymentDeclaration(ctx context.Context, in domain.CreatePaymentDeclarationInput, actorID string) (*domain.AllyPaymentDeclaration, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	var allyID string
	err = tx.QueryRowContext(ctx, `SELECT ally_id FROM ally_operations WHERE id = $1`, in.OperationID).Scan(&allyID)
	if err != nil {
		return nil, fmt.Errorf("operation not found: %w", err)
	}

	var maxVersion int
	_ = tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(version), 0) FROM ally_payment_declarations WHERE operation_id = $2
	`, in.OperationID).Scan(&maxVersion)
	nextVersion := maxVersion + 1

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
		INSERT INTO ally_payment_declarations
			(id, operation_id, version, amount_cents, currency, method, declared_at, reference, evidence_ref, status, created_at)
		VALUES ($3, $4, $5, $6, $7, $8, $9, $10, $11, 'declared', $12)
	`, id, in.OperationID, nextVersion, in.AmountCents, currency, in.Method, declaredAt, in.Reference, in.EvidenceRef, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert payment declaration: %w", err)
	}

	ev := auditdomain.NewEvent("ally_payment_declaration", "payment_declaration.declared", actorID, map[string]any{
		"operation_id":  in.OperationID,
		"version":       nextVersion,
		"amount_cents":  in.AmountCents,
		"currency":      currency,
		"status":        "declared",
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.AllyPaymentDeclaration{
		ID:           id,
		OperationID:  in.OperationID,
		Version:      nextVersion,
		AmountCents:  in.AmountCents,
		Currency:     currency,
		Method:       in.Method,
		DeclaredAt:   declaredAt,
		Reference:    in.Reference,
		EvidenceRef:  in.EvidenceRef,
		Status:       "declared",
		CreatedAt:    t,
	}, nil
}

// GetPaymentDeclaration devuelve una declaración por ID y verifica ownership del aliado.
func (r *Repository) GetPaymentDeclaration(ctx context.Context, declarationID, allyID string) (*domain.AllyPaymentDeclaration, error) {
	return scanDeclaration(r.db.QueryRowContext(ctx, `
		SELECT d.id, d.operation_id, d.version, COALESCE(d.supersedes_id, ''), d.amount_cents, d.currency,
		       COALESCE(d.method, ''), d.declared_at, COALESCE(d.reference, ''), COALESCE(d.evidence_ref, ''),
		       d.status, COALESCE(d.reviewed_by, ''), COALESCE(d.reviewed_at, ''), COALESCE(d.review_note, ''), d.created_at
		FROM ally_payment_declarations d
		JOIN ally_operations o ON d.operation_id = o.id
		WHERE d.id = $13 AND o.ally_id = $14
	`, declarationID, allyID))
}

// ResolveAllyID devuelve el aliado que el usuario posee o pertenece.
func (r *Repository) ResolveAllyID(ctx context.Context, userID string) (string, error) {
	var allyID string
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(MIN(a.id), '')
		FROM allies a
		WHERE a.owner_user_id = $15
		   OR a.id IN (SELECT ally_id FROM ally_members WHERE user_id = $16)
	`, userID, userID).Scan(&count, &allyID)
	if err != nil {
		return "", fmt.Errorf("failed to resolve ally for user: %w", err)
	}
	if count == 0 {
		return "", domain.ErrNotFound
	}
	if count > 1 {
		return "", fmt.Errorf("user %s is linked to %d allies; specify the ally explicitly", userID, count)
	}
	return allyID, nil
}

// ListPaymentDeclarationsByAlly devuelve todas las declaraciones de un aliado.
func (r *Repository) ListPaymentDeclarationsByAlly(ctx context.Context, allyID string) ([]*domain.AllyPaymentDeclaration, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT d.id, d.operation_id, d.version, COALESCE(d.supersedes_id, ''), d.amount_cents, d.currency,
		       COALESCE(d.method, ''), d.declared_at, COALESCE(d.reference, ''), COALESCE(d.evidence_ref, ''),
		       d.status, COALESCE(d.reviewed_by, ''), COALESCE(d.reviewed_at, ''), COALESCE(d.review_note, ''), d.created_at
		FROM ally_payment_declarations d
		JOIN ally_operations o ON d.operation_id = o.id
		WHERE o.ally_id = $17
		ORDER BY d.created_at DESC
	`, allyID)
	if err != nil {
		return nil, fmt.Errorf("failed to list payment declarations: %w", err)
	}
	defer rows.Close()
	return scanDeclarations(rows)
}

// ListPaymentDeclarationsByOperation devuelve todas las versiones de una operación.
func (r *Repository) ListPaymentDeclarationsByOperation(ctx context.Context, operationID string) ([]*domain.AllyPaymentDeclaration, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, operation_id, version, COALESCE(supersedes_id, ''), amount_cents, currency,
		       COALESCE(method, ''), declared_at, COALESCE(reference, ''), COALESCE(evidence_ref, ''),
		       status, COALESCE(reviewed_by, ''), COALESCE(reviewed_at, ''), COALESCE(review_note, ''), created_at
		FROM ally_payment_declarations WHERE operation_id = $18
		ORDER BY version DESC
	`, operationID)
	if err != nil {
		return nil, fmt.Errorf("failed to list payment declarations by operation: %w", err)
	}
	defer rows.Close()
	return scanDeclarations(rows)
}

// GetActiveDeclarationByOperation devuelve la declaración activa de una operación.
func (r *Repository) GetActiveDeclarationByOperation(ctx context.Context, operationID string) (*domain.AllyPaymentDeclaration, error) {
	return scanDeclaration(r.db.QueryRowContext(ctx, `
		SELECT id, operation_id, version, COALESCE(supersedes_id, ''), amount_cents, currency,
		       COALESCE(method, ''), declared_at, COALESCE(reference, ''), COALESCE(evidence_ref, ''),
		       status, COALESCE(reviewed_by, ''), COALESCE(reviewed_at, ''), COALESCE(review_note, ''), created_at
		FROM ally_payment_declarations
		WHERE operation_id = $19 AND status IN ('declared','under_review','confirmed')
		ORDER BY version DESC
		LIMIT 1
	`, operationID))
}

// ReviewPaymentDeclaration transiciona el estado (confirmed|rejected).
func (r *Repository) ReviewPaymentDeclaration(ctx context.Context, declarationID, reviewerID string, in domain.ReviewPaymentDeclarationInput) (*domain.AllyPaymentDeclaration, error) {
	if in.Status != "confirmed" && in.Status != "rejected" {
		return nil, fmt.Errorf("invalid status: %s", in.Status)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	t := time.Now().Format("2006-01-02 15:04:05")
	result, err := tx.ExecContext(ctx, `
		UPDATE ally_payment_declarations
		SET status = $20, reviewed_by = $21, reviewed_at = $22, review_note = $23
		WHERE id = $24 AND status IN ('declared','under_review')
	`, in.Status, reviewerID, t, in.ReviewNote, declarationID)
	if err != nil {
		return nil, fmt.Errorf("failed to review payment declaration: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return nil, domain.ErrNotFound
	}

	ev := auditdomain.NewEvent("ally_payment_declaration", "payment_declaration."+in.Status, reviewerID, map[string]any{
		"declaration_id": declarationID,
		"status":         in.Status,
		"reviewed_by":    reviewerID,
		"review_note":    in.ReviewNote,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return scanDeclaration(r.db.QueryRowContext(ctx, `
		SELECT id, operation_id, version, COALESCE(supersedes_id, ''), amount_cents, currency,
		       COALESCE(method, ''), declared_at, COALESCE(reference, ''), COALESCE(evidence_ref, ''),
		       status, COALESCE(reviewed_by, ''), COALESCE(reviewed_at, ''), COALESCE(review_note, ''), created_at
		FROM ally_payment_declarations WHERE id = $25
	`, declarationID))
}

// ReversePaymentDeclaration revierte la declaración (crea nueva versión).
func (r *Repository) ReversePaymentDeclaration(ctx context.Context, declarationID, reverserAllyID string) (*domain.AllyPaymentDeclaration, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	current, err := scanDeclaration(tx.QueryRowContext(ctx, `
		SELECT d.id, d.operation_id, d.version, COALESCE(d.supersedes_id, ''), d.amount_cents, d.currency,
		       COALESCE(d.method, ''), d.declared_at, COALESCE(d.reference, ''), COALESCE(d.evidence_ref, ''),
		       d.status, COALESCE(d.reviewed_by, ''), COALESCE(d.reviewed_at, ''), COALESCE(d.review_note, ''), d.created_at
		FROM ally_payment_declarations d
		JOIN ally_operations o ON d.operation_id = o.id
		WHERE d.id = $26 AND o.ally_id = $27
	`, declarationID, reverserAllyID))
	if err != nil {
		return nil, err
	}

	if current.Status == "reversed" {
		return nil, fmt.Errorf("declaration already reversed")
	}

	t := time.Now().Format("2006-01-02 15:04:05")

	_, err = tx.ExecContext(ctx, `
		UPDATE ally_payment_declarations
		SET status = 'reversed', reviewed_by = $28, reviewed_at = $29
		WHERE id = $30 AND status IN ('declared','under_review','confirmed')
	`, reverserAllyID, t, declarationID)
	if err != nil {
		return nil, fmt.Errorf("failed to reverse payment declaration: %w", err)
	}

	nextVersion := current.Version + 1
	id := uuid.New().String()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO ally_payment_declarations
			(id, operation_id, version, supersedes_id, amount_cents, currency, method, declared_at, reference, evidence_ref, status, created_at)
		VALUES ($31, $32, $33, $34, $35, $36, $37, $38, $39, $40, 'declared', $41)
	`, id, current.OperationID, nextVersion, declarationID, current.AmountCents, current.Currency,
		current.Method, current.DeclaredAt, current.Reference, current.EvidenceRef, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert reversed payment declaration: %w", err)
	}

	ev := auditdomain.NewEvent("ally_payment_declaration", "payment_declaration.reversed", reverserAllyID, map[string]any{
		"declaration_id": declarationID,
		"new_version_id": id,
		"new_version":    nextVersion,
	})
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &domain.AllyPaymentDeclaration{
		ID:           id,
		OperationID:  current.OperationID,
		Version:      nextVersion,
		SupersedesID: declarationID,
		AmountCents:  current.AmountCents,
		Currency:     current.Currency,
		Method:       current.Method,
		DeclaredAt:   current.DeclaredAt,
		Reference:    current.Reference,
		EvidenceRef:  current.EvidenceRef,
		Status:       "declared",
		CreatedAt:    t,
	}, nil
}

func scanDeclaration(row *sql.Row) (*domain.AllyPaymentDeclaration, error) {
	var d domain.AllyPaymentDeclaration
	var supersedes, method, declaredAt, reference, evidenceRef, status, reviewedBy, reviewedAt, reviewNote sql.NullString
	err := row.Scan(&d.ID, &d.OperationID, &d.Version, &supersedes, &d.AmountCents, &d.Currency,
		&method, &declaredAt, &reference, &evidenceRef, &status, &reviewedBy, &reviewedAt, &reviewNote, &d.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan payment declaration: %w", err)
	}
	d.SupersedesID = supersedes.String
	d.Method = method.String
	d.DeclaredAt = declaredAt.String
	d.Reference = reference.String
	d.EvidenceRef = evidenceRef.String
	d.Status = status.String
	d.ReviewedBy = reviewedBy.String
	d.ReviewedAt = reviewedAt.String
	d.ReviewNote = reviewNote.String
	return &d, nil
}

func scanDeclarations(rows *sql.Rows) ([]*domain.AllyPaymentDeclaration, error) {
	var out []*domain.AllyPaymentDeclaration
	for rows.Next() {
		var d domain.AllyPaymentDeclaration
		var supersedes, method, declaredAt, reference, evidenceRef, status, reviewedBy, reviewedAt, reviewNote sql.NullString
		err := rows.Scan(&d.ID, &d.OperationID, &d.Version, &supersedes, &d.AmountCents, &d.Currency,
			&method, &declaredAt, &reference, &evidenceRef, &status, &reviewedBy, &reviewedAt, &reviewNote, &d.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan payment declaration: %w", err)
		}
		d.SupersedesID = supersedes.String
		d.Method = method.String
		d.DeclaredAt = declaredAt.String
		d.Reference = reference.String
		d.EvidenceRef = evidenceRef.String
		d.Status = status.String
		d.ReviewedBy = reviewedBy.String
		d.ReviewedAt = reviewedAt.String
		d.ReviewNote = reviewNote.String
		out = append(out, &d)
	}
	return out, rows.Err()
}