package database

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestUnitOfWork_SetsPostgresTenantContextIntegration verifies, against a real
// PostgreSQL database, that UnitOfWork.Begin sets the tenant context
// (app.current_user_id, app.current_coach_id, app.user_role) transaction-locally
// and that the context is scoped to the transaction (not leaked to the pool).
//
// This is the mechanism that makes Row-Level Security work: every repository
// query executed on uow.Tx() runs with the session variables set, so RLS
// policies can reference app.current_coach_id / app.current_user_id.
//
// Skip when DATABASE_URL is not configured (matches TestConnect_WithEnv).
func TestUnitOfWork_SetsPostgresTenantContextIntegration(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}

	db, err := Connect(url)
	require.NoError(t, err)
	defer db.Close()

	ctx := context.Background()
	userID := "user-integration-test"
	coachID := "coach-integration-test"
	role := "coach"

	uow := NewUnitOfWork(db.DB)
	require.NoError(t, uow.Begin(ctx, userID, coachID, role))
	defer uow.Rollback(ctx)

	// 1. Inside the transaction, the session variables reflect the tenant context.
	var setting string
	require.NoError(t, uow.Tx().QueryRowContext(ctx,
		"SELECT current_setting('app.current_coach_id', true)").Scan(&setting))
	require.Equal(t, coachID, setting, "app.current_coach_id should equal the coach passed to Begin")

	require.NoError(t, uow.Tx().QueryRowContext(ctx,
		"SELECT current_setting('app.current_user_id', true)").Scan(&setting))
	require.Equal(t, userID, setting, "app.current_user_id should equal the user passed to Begin")

	require.NoError(t, uow.Tx().QueryRowContext(ctx,
		"SELECT current_setting('app.user_role', true)").Scan(&setting))
	require.Equal(t, role, setting, "app.user_role should equal the role passed to Begin")

	// 2. A separate pool connection (no transaction) must NOT see the context:
	// set_config(..., true) is transaction-local and the dedicated conn is
	// released on Rollback.
	require.NoError(t, uow.Rollback(ctx))
	require.False(t, uow.IsActive(), "uow should not be active after Rollback")

	var leaked string
	require.NoError(t, db.DB.QueryRowContext(ctx,
		"SELECT current_setting('app.current_coach_id', true)").Scan(&leaked))
	require.Equal(t, "", leaked, "app.current_coach_id must not leak to the pool after rollback")
}
