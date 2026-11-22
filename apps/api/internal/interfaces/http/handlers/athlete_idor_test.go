package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	athleteapp "github.com/innotechlabs01/mr-training-api/internal/application/athlete"
	athledomain "github.com/innotechlabs01/mr-training-api/internal/domain/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type idorAthleteRepo struct {
	execLog *[]database.Executor
	exec    database.Executor
}

func (r *idorAthleteRepo) WithExecutor(exec database.Executor) athledomain.Repository {
	clone := *r
	clone.exec = exec
	return &clone
}

func (r *idorAthleteRepo) recordExec() {
	if r.execLog != nil {
		*r.execLog = append(*r.execLog, r.exec)
	}
}

func (r *idorAthleteRepo) GetByID(_ context.Context, id string) (*athledomain.Athlete, error) {
	r.recordExec()
	return nil, nil
}

func (r *idorAthleteRepo) GetWorkouts(_ context.Context, _ string) ([]*athledomain.WorkoutSummary, error) {
	r.recordExec()
	return []*athledomain.WorkoutSummary{}, nil
}

func (r *idorAthleteRepo) GetMetrics(_ context.Context, _ string) ([]*athledomain.MetricPoint, error) {
	r.recordExec()
	return []*athledomain.MetricPoint{}, nil
}

func (r *idorAthleteRepo) GetMessages(_ context.Context, _ string) ([]*athledomain.MessageThread, error) {
	r.recordExec()
	return []*athledomain.MessageThread{}, nil
}

type idorTenantResolver struct {
	allow bool
	err   error
	calls [][2]string
}

func (r *idorTenantResolver) GetActiveCoachID(_ context.Context, _ string) (string, error) {
	return "", nil
}

func (r *idorTenantResolver) AthleteHasActiveCoach(_ context.Context, athleteID, coachID string) (bool, error) {
	r.calls = append(r.calls, [2]string{athleteID, coachID})
	return r.allow, r.err
}

func TestAthleteHandler_IDORAndAccessControls(t *testing.T) {
	routes := []string{
		"/api/v1/athletes/athlete-1/workouts",
		"/api/v1/athletes/athlete-1/metrics",
		"/api/v1/athletes/athlete-1/messages",
	}

	cases := []struct {
		name     string
		userID   string
		role     string
		resolver middleware.TenantResolver
		wantCode int
	}{
		{
			name:     "unauthenticated returns 401",
			userID:   "",
			role:     "",
			resolver: &idorTenantResolver{allow: true},
			wantCode: http.StatusUnauthorized,
		},
		{
			name:     "athlete self allowed 200",
			userID:   "athlete-1",
			role:     "athlete",
			resolver: &idorTenantResolver{allow: false},
			wantCode: http.StatusOK,
		},
		{
			name:     "other athlete forbidden 403",
			userID:   "athlete-2",
			role:     "athlete",
			resolver: &idorTenantResolver{allow: true},
			wantCode: http.StatusForbidden,
		},
		{
			name:     "linked coach allowed 200",
			userID:   "coach-1",
			role:     "coach",
			resolver: &idorTenantResolver{allow: true},
			wantCode: http.StatusOK,
		},
		{
			name:     "unlinked coach forbidden 403",
			userID:   "coach-2",
			role:     "coach",
			resolver: &idorTenantResolver{allow: false},
			wantCode: http.StatusForbidden,
		},
		{
			name:     "coach with nil tenant resolver forbidden 403",
			userID:   "coach-1",
			role:     "coach",
			resolver: nil,
			wantCode: http.StatusForbidden,
		},
		{
			name:     "coach when tenant resolver errors forbidden 403",
			userID:   "coach-1",
			role:     "coach",
			resolver: &idorTenantResolver{allow: true, err: errors.New("db down")},
			wantCode: http.StatusForbidden,
		},
		{
			name:     "admin without super_admin forbidden 403",
			userID:   "admin-1",
			role:     "admin",
			resolver: &idorTenantResolver{allow: true},
			wantCode: http.StatusForbidden,
		},
		{
			name:     "super_admin allowed 200",
			userID:   "super-1",
			role:     "super_admin",
			resolver: &idorTenantResolver{allow: false},
			wantCode: http.StatusOK,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc := athleteapp.NewService(&idorAthleteRepo{})
			h := NewAthleteHandler(svc, nil, tc.resolver)

			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				if tc.userID != "" {
					middleware.SetTestAuth(c, middleware.TestAuthConfig{
						UserID: tc.userID,
						Role:   tc.role,
					})
				}
				return c.Next()
			})
			app.Get("/api/v1/athletes/:id/workouts", h.GetWorkouts)
			app.Get("/api/v1/athletes/:id/metrics", h.GetMetrics)
			app.Get("/api/v1/athletes/:id/messages", h.GetMessages)

			for _, path := range routes {
				resp, err := app.Test(httptest.NewRequest(http.MethodGet, path, nil))
				require.NoError(t, err)
				require.Equal(t, tc.wantCode, resp.StatusCode, "path=%s", path)
			}

			if tr, ok := tc.resolver.(*idorTenantResolver); ok && tc.role == "coach" {
				require.Len(t, tr.calls, len(routes))
				for _, call := range tr.calls {
					require.Equal(t, [2]string{"athlete-1", tc.userID}, call)
				}
			}
		})
	}
}

func TestAthleteHandler_WrapsReadsInUnitOfWorkRLS(t *testing.T) {
	endpoints := []string{
		"/api/v1/athletes/athlete-1/workouts",
		"/api/v1/athletes/athlete-1/metrics",
		"/api/v1/athletes/athlete-1/messages",
	}

	for _, endpoint := range endpoints {
		t.Run(endpoint, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			mock.ExpectBegin()
			mock.ExpectExec("SELECT set_config").
				WithArgs("coach-1").
				WillReturnResult(sqlmock.NewResult(0, 1))
			mock.ExpectExec("SELECT set_config").
				WithArgs("coach-tenant-1").
				WillReturnResult(sqlmock.NewResult(0, 1))
			mock.ExpectExec("SELECT set_config").
				WithArgs("coach").
				WillReturnResult(sqlmock.NewResult(0, 1))
			mock.ExpectCommit()

			var execs []database.Executor
			repo := &idorAthleteRepo{execLog: &execs}
			svc := athleteapp.NewService(repo)
			h := NewAthleteHandler(svc, db, &idorTenantResolver{allow: true})

			app := fiber.New()
			app.Use(func(c *fiber.Ctx) error {
				middleware.SetTestAuth(c, middleware.TestAuthConfig{
					UserID: "coach-1",
					Role:   "coach",
				})
				c.Locals(middleware.CoachIDKey, "coach-tenant-1")
				return c.Next()
			})
			app.Get("/api/v1/athletes/:id/workouts", h.GetWorkouts)
			app.Get("/api/v1/athletes/:id/metrics", h.GetMetrics)
			app.Get("/api/v1/athletes/:id/messages", h.GetMessages)

			resp, err := app.Test(httptest.NewRequest(http.MethodGet, endpoint, nil))
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, resp.StatusCode)
			require.Len(t, execs, 1)
			require.NotNil(t, execs[0], "repository call must run inside UnitOfWork tx executor")
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
