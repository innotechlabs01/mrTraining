package support

import (
	"context"
	"database/sql"
	"strings"
	"testing"

	supportdomain "github.com/innotechlabs01/mr-training-api/internal/domain/support"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/stretchr/testify/require"
)

type captureExecutor struct {
	lastQuery string
	lastArgs  []interface{}
}

func (c *captureExecutor) ExecContext(_ context.Context, query string, args ...interface{}) (sql.Result, error) {
	c.lastQuery = query
	c.lastArgs = args
	return nil, nil
}

func (c *captureExecutor) QueryContext(_ context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	c.lastQuery = query
	c.lastArgs = args
	return nil, sql.ErrNoRows
}

func (c *captureExecutor) QueryRowContext(_ context.Context, query string, args ...interface{}) *sql.Row {
	c.lastQuery = query
	c.lastArgs = args
	return &sql.Row{}
}

var _ database.Executor = (*captureExecutor)(nil)

func TestRepository_ListByAthlete_StatusFilterPlaceholder(t *testing.T) {
	exec := &captureExecutor{}
	repo := NewRepository(nil).WithExecutor(exec)

	status := supportdomain.TicketStatusOpen
	_, _ = repo.ListByAthlete(context.Background(), "athlete-123", &status)

	require.Contains(t, exec.lastQuery, "WHERE athlete_id = $1")
	require.Contains(t, exec.lastQuery, "AND status = $2")
	require.False(t, strings.Contains(exec.lastQuery, "$4"), "query must not reference $4 when only 2 args exist: %s", exec.lastQuery)
	require.Equal(t, []interface{}{"athlete-123", supportdomain.TicketStatusOpen}, exec.lastArgs)
}

func TestRepository_ListByAthlete_NoStatusFilter(t *testing.T) {
	exec := &captureExecutor{}
	repo := NewRepository(nil).WithExecutor(exec)

	_, _ = repo.ListByAthlete(context.Background(), "athlete-123", nil)

	require.Contains(t, exec.lastQuery, "WHERE athlete_id = $1")
	require.NotContains(t, exec.lastQuery, "AND status =")
	require.Equal(t, []interface{}{"athlete-123"}, exec.lastArgs)
}

func TestRepository_ListAll_StatusFilter(t *testing.T) {
	exec := &captureExecutor{}
	repo := NewRepository(nil).WithExecutor(exec)

	status := supportdomain.TicketStatusResolved
	_, _ = repo.ListAll(context.Background(), &status)

	require.Contains(t, exec.lastQuery, "WHERE status = $1")
	require.Equal(t, []interface{}{supportdomain.TicketStatusResolved}, exec.lastArgs)
}
