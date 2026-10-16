package ally_operations

import (
	"context"
)

// Repository defines persistence for the ally operations domain.
// La implementación concreta (infraestructura) usa database/sql; el dominio
// apenas define el contrato con tipos propios.
type Repository interface {
	// ResolveRelationship verifica que la relationship_id existe, pertenece al
	// coach y tiene status 'active' (R7).
	ResolveRelationship(ctx context.Context, relationshipID string, coachID string) error

	// ResolveAllyID devuelve el aliado que el usuario posee o pertenece (como
	// owner o member). Usado para scoping de operaciones.
	ResolveAllyID(ctx context.Context, userID string) (string, error)

	// CreateOperation crea la operación y fija relationship_id (R7).
	CreateOperation(ctx context.Context, in CreateOperationInput, coachID string) (*AllyOperation, error)

	// GetOperation devuelve la operación solo cuando pertenece al athlete
	// asociado; ErrNotFound para violaciones de ownership.
	GetOperation(ctx context.Context, operationID, athleteID string) (*AllyOperation, error)

	// ListOperationsByAthlete devuelve todas las operaciones del atleta,
	// ordenadas por created_at desc.
	ListOperationsByAthlete(ctx context.Context, athleteID string) ([]*AllyOperation, error)

	// ListOperationsByCoach devuelve todas las operaciones de las relaciones
	// del coach, ordenadas por created_at desc.
	ListOperationsByCoach(ctx context.Context, coachID string) ([]*AllyOperation, error)

	// ListOperationsByAlly devuelve todas las operaciones de un aliado,
	// ordenadas por created_at desc.
	ListOperationsByAlly(ctx context.Context, allyID string) ([]*AllyOperation, error)

	// CreateOperationItem inserta un ítem en una operación, validando que la
	// operación existe y pertenece al coach. Devuelve ErrNotFound si no es visible.
	CreateOperationItem(ctx context.Context, in CreateOperationItemInput) (*AllyOperationItem, error)

	// ListOperationItems devuelve todos los ítems de una operación dada.
	ListOperationItems(ctx context.Context, operationID string) ([]*AllyOperationItem, error)

	// CreateRedemption crea un redemption (ticket/QR) para una operación.
	// Garantiza atomicidad: si ya existe un redemption 'issued' para la misma
	// operación, el patrón UPDATE ... WHERE status='issued' será un no-op (0 rows)
	// y se retorna el existente.
	CreateRedemption(ctx context.Context, in CreateRedemptionInput) (*AllyRedemption, error)

	// GetRedemption devuelve un redemption solo cuando pertenece a la operación
	// y su estado lo permite. ErrNotFound en caso contrario.
	GetRedemption(ctx context.Context, redemptionID, operationID string) (*AllyRedemption, error)

	// ListRedemptionsByOperation devuelve todos los redemption de una operación,
	// ordenados por created_at desc.
	ListRedemptionsByOperation(ctx context.Context, operationID string) ([]*AllyRedemption, error)

	// GetRedemptionByTokenHash busca un redemption por su hash de token.
	// Devuelve ErrNotFound si no existe.
	GetRedemptionByTokenHash(ctx context.Context, tokenHash string) (*AllyRedemption, error)

	// MarkRedeemed transiciona un redemption de 'issued' a 'redeemed' de forma
	// atómica. Devuelve ErrNotFound si el redemption no existe o no está en
	// estado 'issued' (anti-replay).
	MarkRedeemed(ctx context.Context, redemptionID, operationID, redeemedBy string) error
}