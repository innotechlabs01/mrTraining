// Package database provides database connection infrastructure.
// This file implements the UnitOfWork pattern for transaction management with RLS context.
package database

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
)

// Executor is the common SQL execution interface compatible with both *sql.DB
// and *sql.Tx. Repositories use it for all queries so they can run either
// against the pool (standalone mode) or inside a UnitOfWork transaction
// (transactional mode).
type Executor interface {
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

// Compile-time checks that *sql.DB and *sql.Tx satisfy Executor.
var (
	_ Executor = (*sql.DB)(nil)
	_ Executor = (*sql.Tx)(nil)
)

// UnitOfWork manages a database transaction with tenant context propagation.
// It ensures that all queries within a unit of work share the same transaction
// and tenant context (user_id, coach_id, user_role).
//
// Tenant model (decision 2026-11-02): the COACH is the tenant. There are no
// organizations. See docs/audits/MULTI_TENANT_DEPENDENCY_AUDIT.md §9.
//
// Usage:
//
//	uow := database.NewUnitOfWork(db)
//	if err := uow.Begin(ctx, userID, coachID, role); err != nil {
//	    return err
//	}
//	defer uow.Rollback(ctx)
//
//	// Pass uow.Tx() to repositories
//	results, err := repo.List(ctx, uow.Tx(), ...)
//
//	if err != nil {
//	    return err
//	}
//
//	return uow.Commit(ctx)
type UnitOfWork struct {
	db      *sql.DB
	tx      *sql.Tx
	conn    *sql.Conn
	claimID string
	userID  string
	coachID string
	role    string
	closed  bool
	mu      sync.Mutex
}

// NewUnitOfWork creates a new UnitOfWork instance.
// It does not start a transaction; call Begin() to do so.
func NewUnitOfWork(db *sql.DB) *UnitOfWork {
	return &UnitOfWork{
		db: db,
	}
}

// Begin starts a transaction and establishes the tenant context.
// It obtains a dedicated connection from the pool to prevent context contamination.
// The tenant context (user_id, coach_id, role) is set within the transaction
// using PostgreSQL's set_config function with the 'true' parameter for transaction-local scope.
//
// All values must be non-empty strings; otherwise, Begin returns an error.
func (uow *UnitOfWork) Begin(ctx context.Context, userID, coachID, role string) error {
	uow.mu.Lock()
	defer uow.mu.Unlock()

	if uow.closed {
		return fmt.Errorf("uow: cannot begin on closed unit of work")
	}

	// Validate inputs
	if userID == "" {
		return fmt.Errorf("uow: user_id is required")
	}
	if coachID == "" {
		return fmt.Errorf("uow: coach_id is required")
	}
	if role == "" {
		return fmt.Errorf("uow: user_role is required")
	}

	uow.userID = userID
	uow.coachID = coachID
	uow.role = role

	// Get dedicated connection from pool
	conn, err := uow.db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("uow: failed to get connection: %w", err)
	}
	uow.conn = conn

	// Begin transaction on the dedicated connection
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		conn.Close()
		uow.conn = nil
		return fmt.Errorf("uow: failed to begin transaction: %w", err)
	}
	uow.tx = tx

	// Set tenant context within the transaction
	// Use separate Exec calls for clarity; each set_config is idempotent
	// The 'true' parameter makes the setting local to this transaction
	// Note: 'true' is a SQL literal, not a parameter
	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.current_user_id', $1, true)", userID); err != nil {
		tx.Rollback()
		conn.Close()
		uow.tx = nil
		uow.conn = nil
		return fmt.Errorf("uow: failed to set user_id context: %w", err)
	}
	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.current_coach_id', $1, true)", coachID); err != nil {
		tx.Rollback()
		conn.Close()
		uow.tx = nil
		uow.conn = nil
		return fmt.Errorf("uow: failed to set coach context: %w", err)
	}
	if _, err := tx.ExecContext(ctx, "SELECT set_config('app.user_role', $1, true)", role); err != nil {
		tx.Rollback()
		conn.Close()
		uow.tx = nil
		uow.conn = nil
		return fmt.Errorf("uow: failed to set role context: %w", err)
	}

	return nil
}

// Tx returns the underlying sql.Tx for use with repositories.
// It should only be called after Begin() succeeds.
// Returns nil if transaction has not been started or has been committed/rolled back.
func (uow *UnitOfWork) Tx() *sql.Tx {
	uow.mu.Lock()
	defer uow.mu.Unlock()
	return uow.tx
}

// Conn returns the underlying sql.Conn for direct operations if needed.
// Primarily for setting RLS context before beginning the transaction.
func (uow *UnitOfWork) Conn() *sql.Conn {
	uow.mu.Lock()
	defer uow.mu.Unlock()
	return uow.conn
}

// UserID returns the configured user identifier for RLS context.
func (uow *UnitOfWork) UserID() string {
	uow.mu.Lock()
	defer uow.mu.Unlock()
	return uow.userID
}

// CoachID returns the configured coach identifier (tenant) for the transaction context.
func (uow *UnitOfWork) CoachID() string {
	uow.mu.Lock()
	defer uow.mu.Unlock()
	return uow.coachID
}

// Role returns the configured role for RLS context.
func (uow *UnitOfWork) Role() string {
	uow.mu.Lock()
	defer uow.mu.Unlock()
	return uow.role
}

// IsActive returns true if the unit of work has an active transaction.
func (uow *UnitOfWork) IsActive() bool {
	uow.mu.Lock()
	defer uow.mu.Unlock()
	return uow.tx != nil && !uow.closed
}

// Commit commits the transaction and releases the connection back to the pool.
// It must only be called once; subsequent calls will return an error.
// If Commit fails, the transaction is rolled back and connection is released.
func (uow *UnitOfWork) Commit(ctx context.Context) error {
	uow.mu.Lock()
	defer uow.mu.Unlock()

	if uow.closed {
		return fmt.Errorf("uow: cannot commit closed unit of work")
	}
	if uow.tx == nil {
		return fmt.Errorf("uow: no transaction to commit")
	}

	err := uow.tx.Commit()
	if err != nil && err != sql.ErrTxDone {
		// Transaction already committed or rolled back
		_ = uow.tx.Rollback()
	}

	uow.closeResources()

	return err
}

// Rollback rolls back the transaction and releases the connection back to the pool.
// It must only be called once; subsequent calls will return an error.
// Rollback is idempotent - calling it multiple times is safe.
func (uow *UnitOfWork) Rollback(ctx context.Context) error {
	uow.mu.Lock()
	defer uow.mu.Unlock()

	if uow.closed {
		return nil // Already closed, consider it a success
	}
	if uow.tx == nil {
		return nil // No transaction, nothing to rollback
	}

	err := uow.tx.Rollback()
	if err != nil && err != sql.ErrTxDone {
		// Transaction already committed or rolled back, ignore error
	}

	uow.closeResources()

	return err
}

// closeResources safely closes the transaction and connection.
// This method must be called with uow.mu already locked.
func (uow *UnitOfWork) closeResources() {
	if uow.conn != nil {
		uow.conn.Close()
		uow.conn = nil
	}
	uow.tx = nil
	uow.closed = true
	uow.claimID = ""
}

// ValidateTenant validates that the user can access the specified organization.
// This should be called after obtaining context from middleware.
type TenantValidator interface {
	ValidateUserOrganization(ctx context.Context, userID, orgID string) error
}

// TenantContext holds the tenant context for transactional propagation.
// Tenant = coach (decision 2026-11-02). See MULTI_TENANT_DEPENDENCY_AUDIT.md §9.
type TenantContext struct {
	UserID  string
	CoachID string
	Role    string
}