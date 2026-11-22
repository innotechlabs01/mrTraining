package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	miniredis "github.com/alicebob/miniredis/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	trainingapp "github.com/innotechlabs01/mr-training-api/internal/application/training"
	trainingdomain "github.com/innotechlabs01/mr-training-api/internal/domain/training"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type deleteTemplateFakeRepo struct {
	*secWorkoutRepo
	templates map[string]*trainingdomain.WorkoutTemplate
	usedExecs *[]database.Executor
	exec      database.Executor
}

func (r *deleteTemplateFakeRepo) WithExecutor(exec database.Executor) trainingdomain.WorkoutRepository {
	clone := *r
	clone.exec = exec
	return &clone
}

func (r *deleteTemplateFakeRepo) GetTemplate(_ context.Context, id string) (*trainingdomain.WorkoutTemplate, error) {
	if r.usedExecs != nil {
		*r.usedExecs = append(*r.usedExecs, r.exec)
	}
	tpl, ok := r.templates[id]
	if !ok {
		return nil, apperrors.NotFound("WorkoutTemplate", id)
	}
	return tpl, nil
}

func (r *deleteTemplateFakeRepo) DeleteTemplate(_ context.Context, id string) error {
	if r.usedExecs != nil {
		*r.usedExecs = append(*r.usedExecs, r.exec)
	}
	if _, ok := r.templates[id]; !ok {
		return apperrors.NotFound("WorkoutTemplate", id)
	}
	delete(r.templates, id)
	return nil
}

func TestDeleteWorkoutTemplate_SuccessCacheInvalidationAndGuards(t *testing.T) {
	t.Run("owner coach deletes template inside UnitOfWork RLS and invalidates cache", func(t *testing.T) {
		mr := miniredis.RunT(t)
		rc, err := cache.NewRedis(mr.Addr())
		require.NoError(t, err)
		t.Cleanup(func() { rc.Close() })
		middleware.SetCache(rc)
		defer middleware.SetCache(nil)

		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectBegin()
		mock.ExpectExec("SELECT set_config").WithArgs("coach-a").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").WithArgs("coach-a").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec("SELECT set_config").WithArgs("coach").WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()

		var execs []database.Executor
		repo := &deleteTemplateFakeRepo{
			secWorkoutRepo: &secWorkoutRepo{},
			templates: map[string]*trainingdomain.WorkoutTemplate{
				"tpl-1": {ID: "tpl-1", CoachID: "coach-a", Name: "Push Day"},
			},
			usedExecs: &execs,
		}
		svc := trainingapp.NewService(nil, repo, nil, nil)
		h := NewTrainingHandler(svc, db)

		listCalls := 0
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-a", Role: "coach"})
			c.Locals(middleware.CoachIDKey, "coach-a")
			return c.Next()
		})
		app.Get("/api/v1/workout-templates", middleware.Cache(time.Minute, "workout-templates"), func(c *fiber.Ctx) error {
			listCalls++
			return c.JSON(fiber.Map{"count": len(repo.templates)})
		})
		app.Delete("/api/v1/workout-templates/:id", h.DeleteWorkoutTemplate)

		// Prime and verify cache hit before DELETE.
		r1, err := app.Test(httptest.NewRequest(http.MethodGet, "/api/v1/workout-templates", nil))
		require.NoError(t, err)
		require.Equal(t, "MISS", r1.Header.Get("X-Cache"))

		r2, err := app.Test(httptest.NewRequest(http.MethodGet, "/api/v1/workout-templates", nil))
		require.NoError(t, err)
		require.Equal(t, "HIT", r2.Header.Get("X-Cache"))
		require.Equal(t, 1, listCalls)

		delResp, err := app.Test(httptest.NewRequest(http.MethodDelete, "/api/v1/workout-templates/tpl-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, delResp.StatusCode)

		var out map[string]interface{}
		require.NoError(t, json.NewDecoder(delResp.Body).Decode(&out))
		require.Equal(t, true, out["ok"])
		require.Empty(t, repo.templates)
		require.Len(t, execs, 2)
		require.NotNil(t, execs[0])
		require.NotNil(t, execs[1])
		require.NoError(t, mock.ExpectationsWereMet())

		// Cache under "workout-templates" must be invalidated so next GET re-runs handler.
		r3, err := app.Test(httptest.NewRequest(http.MethodGet, "/api/v1/workout-templates", nil))
		require.NoError(t, err)
		require.Equal(t, "MISS", r3.Header.Get("X-Cache"))
		require.Equal(t, 2, listCalls)
	})

	t.Run("foreign coach receives 403 and template remains intact", func(t *testing.T) {
		repo := &deleteTemplateFakeRepo{
			secWorkoutRepo: &secWorkoutRepo{},
			templates: map[string]*trainingdomain.WorkoutTemplate{
				"tpl-1": {ID: "tpl-1", CoachID: "coach-a", Name: "Push Day"},
			},
		}
		h := NewTrainingHandler(trainingapp.NewService(nil, repo, nil, nil))
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-b", Role: "coach"})
			return c.Next()
		})
		app.Delete("/api/v1/workout-templates/:id", h.DeleteWorkoutTemplate)

		resp, err := app.Test(httptest.NewRequest(http.MethodDelete, "/api/v1/workout-templates/tpl-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
		require.Contains(t, repo.templates, "tpl-1")
	})

	t.Run("missing template receives 404", func(t *testing.T) {
		repo := &deleteTemplateFakeRepo{
			secWorkoutRepo: &secWorkoutRepo{},
			templates:      map[string]*trainingdomain.WorkoutTemplate{},
		}
		h := NewTrainingHandler(trainingapp.NewService(nil, repo, nil, nil))
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-a", Role: "coach"})
			return c.Next()
		})
		app.Delete("/api/v1/workout-templates/:id", h.DeleteWorkoutTemplate)

		resp, err := app.Test(httptest.NewRequest(http.MethodDelete, "/api/v1/workout-templates/missing", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("unauthenticated request receives 401", func(t *testing.T) {
		h := NewTrainingHandler(trainingapp.NewService(nil, &deleteTemplateFakeRepo{
			secWorkoutRepo: &secWorkoutRepo{},
			templates:      map[string]*trainingdomain.WorkoutTemplate{},
		}, nil, nil))
		app := fiber.New()
		app.Delete("/api/v1/workout-templates/:id", h.DeleteWorkoutTemplate)

		resp, err := app.Test(httptest.NewRequest(http.MethodDelete, "/api/v1/workout-templates/tpl-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}
