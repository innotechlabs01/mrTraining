// Package error_tracking defines the persistence port for error tracking.
// Implementations live in the infrastructure layer (e.g. PostgreSQL).
package error_tracking

import (
	"context"
)

// Repository defines data access operations for Error records.
type Repository interface {
	// Create inserts a new error record. Returns the created record with ID and timestamps.
	Create(ctx context.Context, e *Error) (*Error, error)
	// GetByID returns an error record by ID. Returns ErrNotFound if missing.
	GetByID(ctx context.Context, id string) (*Error, error)
	// List returns error records with optional filters. Status and severity are optional.
	List(ctx context.Context, status, severity, source string, limit, offset int) ([]*Error, int, error)
	// Resolve updates the status of an error record (resolved or ignored).
	// Returns ErrNotFound if the record doesn't exist.
	Resolve(ctx context.Context, id, resolvedBy, note, status string) (*Error, error)
	// CountByStatus returns the count of errors grouped by status.
	CountByStatus(ctx context.Context) (map[string]int, error)
	// CountBySeverity returns the count of errors grouped by severity.
	CountBySeverity(ctx context.Context) (map[string]int, error)
}
