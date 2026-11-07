package athlete

import (
	"database/sql"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/nats-io/nats.go"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func newTestConsumer(t *testing.T) (*Consumer, sqlmock.Sqlmock, *sql.DB) {
	t.Helper()
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return NewConsumer(db, nil, zap.NewNop(), nil), mock, db
}

func msg(payload string) *nats.Msg {
	return &nats.Msg{Subject: "athlete.session.set.logged", Data: []byte(payload)}
}

// ---- parse unit tests ------------------------------------------------------

func TestParseSetLogged_Valid(t *testing.T) {
	consumer, _, _ := newTestConsumer(t)
	payload := `{"athleteClerkId":"clerk_123","sessionId":"s1","exerciseId":"ex_1","setNumber":3,"reps":10,"weight":5.5,"rpe":8,"loggedAt":"2026-01-01T10:00:00Z"}`
	evt, ok := consumer.parseSetLogged(msg(payload))
	require.True(t, ok)
	require.Equal(t, "clerk_123", evt.AthleteClerkID)
	require.Equal(t, "s1", evt.SessionID)
	require.Equal(t, "ex_1", evt.ExerciseID)
	require.Equal(t, 3, evt.SetNumber)
	require.NotNil(t, evt.Reps)
	require.Equal(t, 10, *evt.Reps)
	require.NotNil(t, evt.Weight)
	require.Equal(t, 5.5, *evt.Weight)
	require.Equal(t, "2026-01-01T10:00:00Z", evt.LoggedAt)
}

func TestParseSetLogged_InvalidJSON(t *testing.T) {
	consumer, _, _ := newTestConsumer(t)
	_, ok := consumer.parseSetLogged(&nats.Msg{Data: []byte("not-json")})
	require.False(t, ok)
}

func TestParseSetLogged_MissingFields(t *testing.T) {
	consumer, _, _ := newTestConsumer(t)
	_, ok := consumer.parseSetLogged(msg(`{"athleteClerkId":"clerk_123","sessionId":"s1"}`))
	require.False(t, ok)

	_, ok = consumer.parseSetLogged(msg(`{"athleteClerkId":"clerk_123","sessionId":"s1","exerciseId":"ex_1","reps":10}`))
	require.False(t, ok)

	_, ok = consumer.parseSetLogged(msg(`{"athleteClerkId":"clerk_123","sessionId":"s1","exerciseId":"ex_1","weight":5}`))
	require.False(t, ok)
}

func TestParseCompleted_Valid(t *testing.T) {
	consumer, _, _ := newTestConsumer(t)
	evt, ok := consumer.parseCompleted(&nats.Msg{Data: []byte(`{"athleteClerkId":"clerk_123","sessionId":"s1","completedAt":"2026-01-01T10:00:00Z"}`)})
	require.True(t, ok)
	require.Equal(t, "clerk_123", evt.AthleteClerkID)
	require.Equal(t, "s1", evt.SessionID)
	require.Equal(t, "2026-01-01T10:00:00Z", evt.CompletedAt)
}

func TestParseCompleted_InvalidJSON(t *testing.T) {
	consumer, _, _ := newTestConsumer(t)
	_, ok := consumer.parseCompleted(&nats.Msg{Data: []byte("bad")})
	require.False(t, ok)
}

func TestParseProgress_Valid(t *testing.T) {
	consumer, _, _ := newTestConsumer(t)
	evt, ok := consumer.parseProgress(&nats.Msg{Data: []byte(`{"athleteClerkId":"clerk_123","sessionId":"s1","totalVolume":120.5,"durationSeconds":3600,"updatedAt":"2026-01-01T10:00:00Z"}`)})
	require.True(t, ok)
	require.Equal(t, "clerk_123", evt.AthleteClerkID)
	require.Equal(t, "s1", evt.SessionID)
	require.NotNil(t, evt.TotalVolume)
	require.Equal(t, 120.5, *evt.TotalVolume)
	require.NotNil(t, evt.DurationSeconds)
	require.Equal(t, 3600, *evt.DurationSeconds)
}

func TestParseProgress_InvalidJSON(t *testing.T) {
	consumer, _, _ := newTestConsumer(t)
	_, ok := consumer.parseProgress(&nats.Msg{Data: []byte("bad")})
	require.False(t, ok)
}

// ---- DB write path tests (sqlmock) ----------------------------------------

func TestHandleSetLogged_UpsertsPR(t *testing.T) {
	consumer, mock, _ := newTestConsumer(t)
	clerkID := "clerk_123"
	orgID := "org-1"
	loggedAt := "2026-01-01T10:00:00Z"

	// 1. resolve organisation from the users table
	mock.ExpectQuery(regexp.QuoteMeta("SELECT organization_id FROM users")).
		WithArgs(clerkID).
		WillReturnRows(sqlmock.NewRows([]string{"organization_id"}).AddRow(orgID))
	// 2. set the tenant context for RLS
	mock.ExpectQuery(regexp.QuoteMeta("SELECT set_config")).
		WithArgs(orgID).
		WillReturnRows(sqlmock.NewRows([]string{"set_config"}).AddRow(orgID))
	// 3. upsert the personal best
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO athlete_prs")).
		WithArgs(
			sqlmock.AnyArg(),
			clerkID,
			"ex_1",
			10,
			5.0,
			50.0, // volume = reps * weight
			loggedAt,
			orgID,
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))

	payload := `{"athleteClerkId":"clerk_123","sessionId":"s1","exerciseId":"ex_1","setNumber":3,"reps":10,"weight":5,"loggedAt":"` + loggedAt + `"}`
	consumer.handleSetLogged(&nats.Msg{Data: []byte(payload)})

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestHandleSetLogged_OrgResolutionFailureAcks(t *testing.T) {
	consumer, mock, _ := newTestConsumer(t)
	clerkID := "clerk_unknown"

	// Organisation lookup fails (athlete not onboarded): no write, just ack.
	mock.ExpectQuery(regexp.QuoteMeta("SELECT organization_id FROM users")).
		WithArgs(clerkID).
		WillReturnError(sql.ErrNoRows)

	consumer.handleSetLogged(&nats.Msg{Data: []byte(`{"athleteClerkId":"clerk_unknown","sessionId":"s1","exerciseId":"ex_1","reps":10,"weight":5,"loggedAt":"2026-01-01T00:00:00Z"}`)})

	require.NoError(t, mock.ExpectationsWereMet())
}
