// Package ally provides the persistence layer for the ally domain.
package ally

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	allaudit "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"

	auditdomain "github.com/innotechlabs01/mr-training-api/internal/domain/audit"
	allydomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally"
)

// Repository implements ally.Repository using the libsql/SQLite driver.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new ally repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateAllyWithRelationship creates the ally, its owner membership (when
// known), and the coach-ally relationship. The mutation and its audit event are
// written in one transaction: a failed audit write rolls back the ally (H-05).
func (r *Repository) CreateAllyWithRelationship(ctx context.Context, in allydomain.CreateInput, ev auditdomain.Event) (*allydomain.Ally, *allydomain.Relationship, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to begin create-ally tx: %w", err)
	}
	defer tx.Rollback()

	allyID := uuid.New().String()
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, contact_email, contact_phone, tax_id, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
	`, allyID, nullable(in.OwnerUserID), in.LegalName, in.CommercialName, in.Category, in.ContactEmail, in.ContactPhone, in.TaxID); err != nil {
		return nil, nil, fmt.Errorf("failed to insert ally: %w", err)
	}

	if in.OwnerUserID != "" {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO ally_members (id, ally_id, user_id, role, created_at)
			VALUES (?, ?, ?, 'owner', datetime('now'))
		`, uuid.New().String(), allyID, in.OwnerUserID); err != nil {
			return nil, nil, fmt.Errorf("failed to insert ally owner membership: %w", err)
		}
	}

	relationshipID := uuid.New().String()
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status, attributed_by, invited_at, created_at, updated_at)
		VALUES (?, ?, ?, 'invited', ?, datetime('now'), datetime('now'), datetime('now'))
	`, relationshipID, in.CoachID, allyID, in.CoachID); err != nil {
		return nil, nil, fmt.Errorf("failed to insert coach-ally relationship: %w", err)
	}

	ev.Entity = "coach_ally_relationship"
	ev.EntityID = relationshipID
	if err := allaudit.InsertTx(ctx, tx, ev); err != nil {
		return nil, nil, err
	}

	createdAlly, err := getAllyTx(ctx, tx, allyID)
	if err != nil {
		return nil, nil, err
	}
	relationship, err := getRelationshipTx(ctx, tx, relationshipID)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("failed to commit create-ally tx: %w", err)
	}
	return createdAlly, relationship, nil
}

// ListByCoach returns every ally related to the given coach.
func (r *Repository) ListByCoach(ctx context.Context, coachID string) ([]*allydomain.Summary, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT r.id, r.coach_id, a.id, a.legal_name, a.commercial_name, a.category, r.status
		FROM coach_ally_relationships r
		JOIN allies a ON a.id = r.ally_id
		WHERE r.coach_id = ?
		ORDER BY a.commercial_name COLLATE NOCASE
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list allies: %w", err)
	}
	defer rows.Close()
	return scanSummaries(rows)
}

// ListByAllyUser returns every ally the given user owns or belongs to.
func (r *Repository) ListByAllyUser(ctx context.Context, userID string) ([]*allydomain.Summary, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT r.id, r.coach_id, a.id, a.legal_name, a.commercial_name, a.category, r.status
		FROM coach_ally_relationships r
		JOIN allies a ON a.id = r.ally_id
		WHERE a.owner_user_id = ?
		   OR a.id IN (SELECT ally_id FROM ally_members WHERE user_id = ?)
		ORDER BY a.commercial_name COLLATE NOCASE
	`, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list allies for user: %w", err)
	}
	defer rows.Close()
	return scanSummaries(rows)
}

// GetByIDForCoach returns the detail for a relationship only when it belongs to
// coachID. A relationship owned by another coach is reported as not-found.
func (r *Repository) GetByIDForCoach(ctx context.Context, relationshipID, coachID string) (*allydomain.Detail, error) {
	var allyID string
	err := r.db.QueryRowContext(ctx, `
		SELECT ally_id FROM coach_ally_relationships
		WHERE id = ? AND coach_id = ?
	`, relationshipID, coachID).Scan(&allyID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, allydomain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to load relationship: %w", err)
	}

	relationship, err := getRelationship(ctx, r.db, relationshipID)
	if err != nil {
		return nil, err
	}
	ally, err := getAlly(ctx, r.db, allyID)
	if err != nil {
		return nil, err
	}
	members, err := listMembers(ctx, r.db, allyID)
	if err != nil {
		return nil, err
	}
	return &allydomain.Detail{Ally: ally, Relationship: relationship, Members: members}, nil
}

// scanSummaries scans summary rows shared by the list queries.
func scanSummaries(rows *sql.Rows) ([]*allydomain.Summary, error) {
	var out []*allydomain.Summary
	for rows.Next() {
		var s allydomain.Summary
		if err := rows.Scan(&s.RelationshipID, &s.CoachID, &s.AllyID, &s.LegalName, &s.CommercialName, &s.Category, &s.Status); err != nil {
			return nil, fmt.Errorf("failed to scan ally summary: %w", err)
		}
		out = append(out, &s)
	}
	return out, rows.Err()
}

// querier abstracts *sql.DB and *sql.Tx for the shared read helpers.
type querier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func getAlly(ctx context.Context, q querier, allyID string) (*allydomain.Ally, error) {
	return scanAlly(q.QueryRowContext(ctx, `
		SELECT id, COALESCE(owner_user_id, ''), legal_name, commercial_name, category,
		       COALESCE(contact_email, ''), COALESCE(contact_phone, ''), COALESCE(tax_id, ''),
		       status, created_at, updated_at
		FROM allies WHERE id = ?
	`, allyID))
}

func getAllyTx(ctx context.Context, tx *sql.Tx, allyID string) (*allydomain.Ally, error) {
	return getAlly(ctx, tx, allyID)
}

func scanAlly(row *sql.Row) (*allydomain.Ally, error) {
	var a allydomain.Ally
	if err := row.Scan(&a.ID, &a.OwnerUserID, &a.LegalName, &a.CommercialName, &a.Category,
		&a.ContactEmail, &a.ContactPhone, &a.TaxID, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, allydomain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan ally: %w", err)
	}
	return &a, nil
}

func getRelationship(ctx context.Context, q querier, id string) (*allydomain.Relationship, error) {
	return scanRelationship(q.QueryRowContext(ctx, `
		SELECT id, coach_id, ally_id, status,
		       COALESCE(attributed_by, ''), COALESCE(invited_at, ''), COALESCE(activated_at, ''), COALESCE(ended_at, ''),
		       created_at, updated_at
		FROM coach_ally_relationships WHERE id = ?
	`, id))
}

func getRelationshipTx(ctx context.Context, tx *sql.Tx, id string) (*allydomain.Relationship, error) {
	return getRelationship(ctx, tx, id)
}

func scanRelationship(row *sql.Row) (*allydomain.Relationship, error) {
	var r allydomain.Relationship
	if err := row.Scan(&r.ID, &r.CoachID, &r.AllyID, &r.Status, &r.AttributedBy,
		&r.InvitedAt, &r.ActivatedAt, &r.EndedAt, &r.CreatedAt, &r.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, allydomain.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan relationship: %w", err)
	}
	return &r, nil
}

func listMembers(ctx context.Context, q interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}, allyID string) ([]*allydomain.AllyMember, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT id, ally_id, user_id, role, created_at
		FROM ally_members WHERE ally_id = ?
		ORDER BY created_at
	`, allyID)
	if err != nil {
		return nil, fmt.Errorf("failed to list ally members: %w", err)
	}
	defer rows.Close()
	var out []*allydomain.AllyMember
	for rows.Next() {
		var m allydomain.AllyMember
		if err := rows.Scan(&m.ID, &m.AllyID, &m.UserID, &m.Role, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan ally member: %w", err)
		}
		out = append(out, &m)
	}
	return out, rows.Err()
}

// nullable converts an empty string to a SQL NULL.
func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
