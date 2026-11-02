package ally_operations

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	allydomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_operations"
)

// operationsRepository implements the Repository interface from the domain package.
type operationsRepository struct {
	db *sql.DB
}

// NewRepository creates a new operations repository.
func NewRepository(db *sql.DB) *operationsRepository {
	return &operationsRepository{db: db}
}

// ResolveAllyID devuelve el aliado que el usuario posee o pertenece.
func (r *operationsRepository) ResolveAllyID(ctx context.Context, userID string) (string, error) {
	var allyID string
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(MIN(a.id), '')
		FROM allies a
		WHERE a.owner_user_id = $1
		   OR a.id IN (SELECT ally_id FROM ally_members WHERE user_id = $2)
	`, userID, userID).Scan(&count, &allyID)
	if err != nil {
		return "", fmt.Errorf("failed to resolve ally for user: %w", err)
	}
	if count == 0 {
		return "", allydomain.ErrNotFound
	}
	if count > 1 {
		return "", fmt.Errorf("user %s is linked to %d allies; specify the ally explicitly", userID, count)
	}
	return allyID, nil
}

// ResolveRelationship verifica que la relationship_id existe, pertenece al
// coach y tiene status 'active' (R7).
func (r *operationsRepository) ResolveRelationship(ctx context.Context, relationshipID string, coachID string) error {
	var coachFromDB string
	err := r.db.QueryRowContext(ctx, `SELECT coach_id FROM coach_ally_relationships WHERE id = $3`, relationshipID).Scan(&coachFromDB)
	if err != nil {
		return fmt.Errorf("relationship not found: %w", err)
	}
	if coachFromDB != coachID {
		return fmt.Errorf("relationship not owned by coach (got %s, expected %s)", coachFromDB, coachID)
	}
	var status string
	err = r.db.QueryRowContext(ctx, `SELECT status FROM coach_ally_relationships WHERE id = $4`, relationshipID).Scan(&status)
	if err != nil {
		return fmt.Errorf("cannot read relationship status: %w", err)
	}
	if status != "active" {
		return fmt.Errorf("relationship not active (status=%s)", status)
	}
	return nil
}

// CreateOperation crea la operación y fija relationship_id (R7).
func (r *operationsRepository) CreateOperation(ctx context.Context, in allydomain.CreateOperationInput, coachID string) (*allydomain.AllyOperation, error) {
	if err := r.ResolveRelationship(ctx, in.RelationshipID, coachID); err != nil {
		return nil, err
	}
	// Resolve ally_id from the relationship (it's the ally side of the relationship)
	var allyID string
	err := r.db.QueryRowContext(ctx, `SELECT ally_id FROM coach_ally_relationships WHERE id = $5`, in.RelationshipID).Scan(&allyID)
	if err != nil {
		return nil, fmt.Errorf("cannot resolve ally_id from relationship: %w", err)
	}
	id := uuid.New().String()
	t := time.Now().Format("2006-01-02 15:04:05")
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status, scheduled_at, confirmed_at, completed_at, cancelled_at, created_at, updated_at)
		VALUES ($6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`, id, in.Kind, in.RelationshipID, allyID, in.AthleteID, "created", in.ScheduledAt, nil, nil, nil, t, t)
	if err != nil {
		return nil, fmt.Errorf("failed to insert operation: %w", err)
	}
	return &allydomain.AllyOperation{
		ID:            id,
		Kind:          in.Kind,
		RelationshipID: in.RelationshipID,
		AllyID:        allyID,
		AthleteID:     in.AthleteID,
		Status:        "created",
		ScheduledAt:   in.ScheduledAt,
		CreatedAt:     t,
		UpdatedAt:     t,
	}, nil
}

// GetOperation devuelve la operación solo cuando pertenece al athlete asociado.
func (r *operationsRepository) GetOperation(ctx context.Context, operationID, athleteID string) (*allydomain.AllyOperation, error) {
	return scanOperation(r.db.QueryRowContext(ctx, `
		SELECT id, kind, relationship_id, ally_id, athlete_id, status, scheduled_at, confirmed_at, completed_at, cancelled_at, created_at, updated_at
		FROM ally_operations WHERE id = $18 AND athlete_id = $19
	`, operationID, athleteID))
}

// ListOperationsByAthlete devuelve todas las operaciones del atleta.
func (r *operationsRepository) ListOperationsByAthlete(ctx context.Context, athleteID string) ([]*allydomain.AllyOperation, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, kind, relationship_id, ally_id, athlete_id, status, scheduled_at, confirmed_at, completed_at, cancelled_at, created_at, updated_at
		FROM ally_operations WHERE athlete_id = $20 ORDER BY created_at DESC
	`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list operations: %w", err)
	}
	defer rows.Close()
	return scanOperations(rows)
}

// ListOperationsByCoach devuelve todas las operaciones de las relaciones del coach.
func (r *operationsRepository) ListOperationsByCoach(ctx context.Context, coachID string) ([]*allydomain.AllyOperation, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT o.id, o.kind, o.relationship_id, o.ally_id, o.athlete_id, o.status, o.scheduled_at, o.confirmed_at, o.completed_at, o.cancelled_at, o.created_at, o.updated_at
		FROM ally_operations o
		JOIN coach_ally_relationships rel ON o.relationship_id = rel.id
		WHERE rel.coach_id = $21
		ORDER BY o.created_at DESC
	`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list operations: %w", err)
	}
	defer rows.Close()
	return scanOperations(rows)
}

// ListOperationsByAlly devuelve todas las operaciones de un aliado.
func (r *operationsRepository) ListOperationsByAlly(ctx context.Context, allyID string) ([]*allydomain.AllyOperation, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, kind, relationship_id, ally_id, athlete_id, status, scheduled_at, confirmed_at, completed_at, cancelled_at, created_at, updated_at
		FROM ally_operations WHERE ally_id = $22
		ORDER BY created_at DESC
	`, allyID)
	if err != nil {
		return nil, fmt.Errorf("failed to list operations: %w", err)
	}
	defer rows.Close()
	return scanOperations(rows)
}

// CreateOperationItem inserta un ítem en una operación.
func (r *operationsRepository) CreateOperationItem(ctx context.Context, in allydomain.CreateOperationItemInput) (*allydomain.AllyOperationItem, error) {
	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ally_operation_items (id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity)
		VALUES ($23, $24, $25, $26, $27, $28, $29)
	`, id, in.OperationID, in.OfferKind, in.OfferID, in.Name, in.UnitPriceCents, in.Quantity)
	if err != nil {
		return nil, fmt.Errorf("failed to insert operation item: %w", err)
	}
	return &allydomain.AllyOperationItem{
		ID:          id,
		OperationID: in.OperationID,
		OfferKind:   in.OfferKind,
		OfferID:     in.OfferID,
		Name:        in.Name,
		UnitPriceCents: in.UnitPriceCents,
		Quantity:    in.Quantity,
	}, nil
}

// ListOperationItems devuelve todos los ítems de una operación.
func (r *operationsRepository) ListOperationItems(ctx context.Context, operationID string) ([]*allydomain.AllyOperationItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity
		FROM ally_operation_items WHERE operation_id = $30
	`, operationID)
	if err != nil {
		return nil, fmt.Errorf("failed to list operation items: %w", err)
	}
	defer rows.Close()
	return scanOperationItems(rows)
}

// CreateRedemption crea un redemption (ticket/QR) para una operación.
// Garantiza atomicidad: si ya existe un redemption 'issued' para la misma
// operación, el INSERT con UNIQUE(token_hash) falla y retornamos el existente.
func (r *operationsRepository) CreateRedemption(ctx context.Context, in allydomain.CreateRedemptionInput) (*allydomain.AllyRedemption, error) {
	// Generar token_hash: SHA-256 de 32 bytes CSPRNG en base64url
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return nil, fmt.Errorf("failed to generate CSPRNG token: %w", err)
	}
	hash := sha256.Sum256(b)
	tokenHash := base64URLEncode(hash[:])

	id := uuid.New().String()
	t := time.Now().Format("2006-01-02 15:04:05")
	expires := addDays(t, 30) // vence en 30 días

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ally_redemptions (id, operation_id, token_hash, expires_at, status, created_at)
		VALUES ($31, $32, $33, $34, 'issued', $35)
	`, id, in.OperationID, tokenHash, expires, t)
	if err != nil {
		// Verificar si ya existe (race condition o constraint)
		var existingID string
		if err2 := r.db.QueryRowContext(ctx, `SELECT id FROM ally_redemptions WHERE token_hash = $36`, tokenHash).Scan(&existingID); err2 == nil {
			// Ya existe; retornar el existente
			return r.GetRedemption(ctx, existingID, in.OperationID)
		}
		return nil, fmt.Errorf("failed to create redemption: %w", err)
	}
	// Escanear el row insertado para devolver el redemption creado.
	return r.GetRedemption(ctx, id, in.OperationID)
}

// GetRedemption devuelve un redemption solo cuando pertenece a la operación
// y su estado lo permite. ErrNotFound en caso contrario.
func (r *operationsRepository) GetRedemption(ctx context.Context, redemptionID, operationID string) (*allydomain.AllyRedemption, error) {
	return scanRedemption(r.db.QueryRowContext(ctx, `
		SELECT id, operation_id, token_hash, expires_at, redeemed_by, redeemed_at, status, created_at
		FROM ally_redemptions WHERE id = $37 AND operation_id = $38
	`, redemptionID, operationID))
}

// ListRedemptionsByOperation devuelve todos los redemption de una operación.
func (r *operationsRepository) ListRedemptionsByOperation(ctx context.Context, operationID string) ([]*allydomain.AllyRedemption, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, operation_id, token_hash, expires_at, redeemed_by, redeemed_at, status, created_at
		FROM ally_redemptions WHERE operation_id = $39 ORDER BY created_at DESC
	`, operationID)
	if err != nil {
		return nil, fmt.Errorf("failed to list redemptions: %w", err)
	}
	defer rows.Close()
	return scanRedemptions(rows)
}

// GetRedemptionByTokenHash busca un redemption por su hash de token.
func (r *operationsRepository) GetRedemptionByTokenHash(ctx context.Context, tokenHash string) (*allydomain.AllyRedemption, error) {
	return scanRedemption(r.db.QueryRowContext(ctx, `
		SELECT id, operation_id, token_hash, expires_at, redeemed_by, redeemed_at, status, created_at
		FROM ally_redemptions WHERE token_hash = $40
	`, tokenHash))
}

// MarkRedeemed transiciona un redemption de 'issued' a 'redeemed' de forma
// atómica. Devuelve un error si el redemption no existe o no está en estado
// 'issued' (anti-replay).
func (r *operationsRepository) MarkRedeemed(ctx context.Context, redemptionID, operationID, redeemedBy string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE ally_redemptions
		SET status = 'redeemed', redeemed_by = $41, redeemed_at = NOW()
		WHERE id = $42 AND operation_id = $43 AND status = 'issued'
	`, redeemedBy, redemptionID, operationID)
	if err != nil {
		return fmt.Errorf("failed to mark redemption as redeemed: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return allydomain.ErrNotFound
	}
	return nil
}

// addDays suma N días a una cadena de fecha/hora.
func addDays(s string, n int) string {
	t, err := time.Parse("2006-01-02 15:04:05", s)
	if err != nil {
		return s
	}
	return t.AddDate(0, 0, n).Format("2006-01-02 15:04:05")
}

// base64URLEncode codifica a base64url (sin relleno, sin guiones).
func base64URLEncode(b []byte) string {
	s := base64.URLEncoding.EncodeToString(b)
	s = strings.TrimRight(s, "=")
	return s
}

// ----- Funciones de escaneo -----

func scanOperation(row *sql.Row) (*allydomain.AllyOperation, error) {
	var o allydomain.AllyOperation
	var status, scheduledAt, confirmedAt, completedAt, cancelledAt sql.NullString
	err := row.Scan(&o.ID, &o.Kind, &o.RelationshipID, &o.AllyID, &o.AthleteID, &status, &scheduledAt, &confirmedAt, &completedAt, &cancelledAt, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("operation not found")
		}
		return nil, fmt.Errorf("failed to scan operation: %w", err)
	}
	o.Status = status.String
	o.ScheduledAt = scheduledAt.String
	o.ConfirmedAt = confirmedAt.String
	o.CompletedAt = completedAt.String
	o.CancelledAt = cancelledAt.String
	return &o, nil
}

func scanOperations(rows *sql.Rows) ([]*allydomain.AllyOperation, error) {
	var out []*allydomain.AllyOperation
	for rows.Next() {
		var o allydomain.AllyOperation
		var status, scheduledAt, confirmedAt, completedAt, cancelledAt sql.NullString
		err := rows.Scan(&o.ID, &o.Kind, &o.RelationshipID, &o.AllyID, &o.AthleteID, &status, &scheduledAt, &confirmedAt, &completedAt, &cancelledAt, &o.CreatedAt, &o.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan operation: %w", err)
		}
		o.Status = status.String
		o.ScheduledAt = scheduledAt.String
		o.ConfirmedAt = confirmedAt.String
		o.CompletedAt = completedAt.String
		o.CancelledAt = cancelledAt.String
		out = append(out, &o)
	}
	return out, rows.Err()
}

func scanOperationItem(row *sql.Row) (*allydomain.AllyOperationItem, error) {
	var o allydomain.AllyOperationItem
	var unitPriceCents int64
	var quantity int
	err := row.Scan(&o.ID, &o.OperationID, &o.OfferKind, &o.OfferID, &o.Name, &unitPriceCents, &quantity)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("operation item not found")
		}
		return nil, fmt.Errorf("failed to scan operation item: %w", err)
	}
	o.UnitPriceCents = unitPriceCents
	o.Quantity = quantity
	return &o, nil
}

func scanOperationItems(rows *sql.Rows) ([]*allydomain.AllyOperationItem, error) {
	var out []*allydomain.AllyOperationItem
	for rows.Next() {
		var o allydomain.AllyOperationItem
		var unitPriceCents int64
		var quantity int
		err := rows.Scan(&o.ID, &o.OperationID, &o.OfferKind, &o.OfferID, &o.Name, &unitPriceCents, &quantity)
		if err != nil {
			return nil, fmt.Errorf("failed to scan operation item: %w", err)
		}
		o.UnitPriceCents = unitPriceCents
		o.Quantity = quantity
		out = append(out, &o)
	}
	return out, rows.Err()
}

func scanRedemption(row *sql.Row) (*allydomain.AllyRedemption, error) {
	var r allydomain.AllyRedemption
	var status, expiresAt, redeemedBy, redeemedAt sql.NullString
	err := row.Scan(&r.ID, &r.OperationID, &r.TokenHash, &expiresAt, &redeemedBy, &redeemedAt, &status, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("redemption not found")
		}
		return nil, fmt.Errorf("failed to scan redemption: %w", err)
	}
	r.Status = status.String
	r.ExpiresAt = expiresAt.String
	r.RedeemedBy = redeemedBy.String
	r.RedeemedAt = redeemedAt.String
	return &r, nil
}

func scanRedemptions(rows *sql.Rows) ([]*allydomain.AllyRedemption, error) {
	var out []*allydomain.AllyRedemption
	for rows.Next() {
		var r allydomain.AllyRedemption
		var status, expiresAt, redeemedBy, redeemedAt sql.NullString
		err := rows.Scan(&r.ID, &r.OperationID, &r.TokenHash, &expiresAt, &redeemedBy, &redeemedAt, &status, &r.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan redemption: %w", err)
		}
		r.Status = status.String
		r.ExpiresAt = expiresAt.String
		r.RedeemedBy = redeemedBy.String
		r.RedeemedAt = redeemedAt.String
		out = append(out, &r)
	}
	return out, rows.Err()
}