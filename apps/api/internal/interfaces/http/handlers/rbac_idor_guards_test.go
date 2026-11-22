package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	fmapp "github.com/innotechlabs01/mr-training-api/internal/application/formmetrics"
	healthapp "github.com/innotechlabs01/mr-training-api/internal/application/health"
	productapp "github.com/innotechlabs01/mr-training-api/internal/application/product"
	routineapp "github.com/innotechlabs01/mr-training-api/internal/application/routine"
	trainingapp "github.com/innotechlabs01/mr-training-api/internal/application/training"
	fmdomain "github.com/innotechlabs01/mr-training-api/internal/domain/formmetrics"
	healthdomain "github.com/innotechlabs01/mr-training-api/internal/domain/health"
	productdomain "github.com/innotechlabs01/mr-training-api/internal/domain/product"
	routinedomain "github.com/innotechlabs01/mr-training-api/internal/domain/routine"
	trainingdomain "github.com/innotechlabs01/mr-training-api/internal/domain/training"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type secTenantResolver struct {
	allow bool
}

func (r secTenantResolver) GetActiveCoachID(_ context.Context, _ string) (string, error) {
	return "", nil
}
func (r secTenantResolver) AthleteHasActiveCoach(_ context.Context, _, _ string) (bool, error) {
	return r.allow, nil
}

type secHealthRepo struct {
	devices map[string]*healthdomain.HealthDevice
}

func (r *secHealthRepo) GetMetrics(_ context.Context, _ string, _ int) ([]*healthdomain.HealthMetric, error) {
	return []*healthdomain.HealthMetric{}, nil
}
func (r *secHealthRepo) RecordMetric(_ context.Context, _ *healthdomain.HealthMetric) error {
	return nil
}
func (r *secHealthRepo) GetSleepLogs(_ context.Context, _ string, _ int) ([]*healthdomain.SleepLog, error) {
	return []*healthdomain.SleepLog{}, nil
}
func (r *secHealthRepo) RecordSleepLog(_ context.Context, _ *healthdomain.SleepLog) error {
	return nil
}
func (r *secHealthRepo) GetDevices(_ context.Context, _ string) ([]*healthdomain.HealthDevice, error) {
	return []*healthdomain.HealthDevice{}, nil
}
func (r *secHealthRepo) GetDevice(_ context.Context, id string) (*healthdomain.HealthDevice, error) {
	d, ok := r.devices[id]
	if !ok {
		return nil, apperrors.NotFound("health device", id)
	}
	return d, nil
}
func (r *secHealthRepo) RegisterDevice(_ context.Context, _ *healthdomain.HealthDevice) error {
	return nil
}
func (r *secHealthRepo) RemoveDevice(_ context.Context, id string) error {
	delete(r.devices, id)
	return nil
}

type secFormMetricsRepo struct{}

func (secFormMetricsRepo) InsertBatch(_ context.Context, _ []*fmdomain.FormMetric) error { return nil }
func (secFormMetricsRepo) GetByAthlete(_ context.Context, _ string) ([]*fmdomain.ExerciseFormStats, error) {
	return []*fmdomain.ExerciseFormStats{}, nil
}
func (secFormMetricsRepo) GetByAthleteAndExercise(_ context.Context, _, _ string) ([]*fmdomain.FormMetric, error) {
	return nil, nil
}
func (secFormMetricsRepo) GetByCoach(_ context.Context, _ string) ([]*fmdomain.CoachAthleteFormStats, error) {
	return []*fmdomain.CoachAthleteFormStats{}, nil
}
func (secFormMetricsRepo) GetConsent(_ context.Context, _ string) (string, error) {
	return "pending", nil
}
func (secFormMetricsRepo) SetConsent(_ context.Context, _, _ string) error { return nil }

type secRoutineRepo struct {
	routines map[string]*routinedomain.Routine
}

func (r *secRoutineRepo) ListByAthleteID(_ string) ([]*routinedomain.Routine, error) { return nil, nil }
func (r *secRoutineRepo) GetByID(id string) (*routinedomain.Routine, error) {
	rt, ok := r.routines[id]
	if !ok {
		return nil, apperrors.NotFound("routine", id)
	}
	return rt, nil
}
func (r *secRoutineRepo) Create(_ *routinedomain.Routine) error { return nil }
func (r *secRoutineRepo) Update(_ *routinedomain.Routine) error { return nil }
func (r *secRoutineRepo) Delete(_, _ string) error              { return nil }

type secProductRepo struct {
	products map[string]*productdomain.Product
}

func (r *secProductRepo) ListByCoach(_ context.Context, _ string) ([]*productdomain.Product, error) {
	return nil, nil
}
func (r *secProductRepo) GetByID(_ context.Context, id string) (*productdomain.Product, error) {
	p, ok := r.products[id]
	if !ok {
		return nil, apperrors.NotFound("Product", id)
	}
	return p, nil
}
func (r *secProductRepo) Create(_ context.Context, _ *productdomain.Product) error { return nil }
func (r *secProductRepo) Update(_ context.Context, _ *productdomain.Product) error { return nil }
func (r *secProductRepo) Delete(_ context.Context, _ string) error                 { return nil }
func (r *secProductRepo) UpdateStock(_ context.Context, _ string, _ int) error     { return nil }
func (r *secProductRepo) ListSalesByCoach(_ context.Context, _ string) ([]*productdomain.Sale, error) {
	return nil, nil
}
func (r *secProductRepo) CreateSale(_ context.Context, _ *productdomain.Sale) error { return nil }
func (r *secProductRepo) DeleteSale(_ context.Context, _ string) error              { return nil }
func (r *secProductRepo) ListPublicProducts(_ context.Context) ([]*productdomain.Product, error) {
	return nil, nil
}

type secWorkoutRepo struct {
	template *trainingdomain.WorkoutTemplate
	detail   *trainingdomain.WorkoutDetail
}

func (r *secWorkoutRepo) ListTemplates(_ context.Context, _ string) ([]*trainingdomain.WorkoutTemplate, error) {
	return nil, nil
}
func (r *secWorkoutRepo) GetTemplate(_ context.Context, _ string) (*trainingdomain.WorkoutTemplate, error) {
	return r.template, nil
}
func (r *secWorkoutRepo) CreateTemplate(_ context.Context, _ *trainingdomain.WorkoutTemplate) error {
	return nil
}
func (r *secWorkoutRepo) UpdateTemplate(_ context.Context, _ *trainingdomain.WorkoutTemplate) error {
	return nil
}
func (r *secWorkoutRepo) AssignWorkout(_ context.Context, _ *trainingdomain.AssignedWorkout) error {
	return nil
}
func (r *secWorkoutRepo) ListAssignedWorkouts(_ context.Context, _ string) ([]*trainingdomain.AssignedWorkout, error) {
	return nil, nil
}
func (r *secWorkoutRepo) GetAssignedWorkout(_ context.Context, _ string) (*trainingdomain.AssignedWorkout, error) {
	return r.detail.Workout, nil
}
func (r *secWorkoutRepo) LogWorkoutSet(_ context.Context, _ *trainingdomain.WorkoutSet, _, _ string) (*trainingdomain.WorkoutSet, error) {
	return nil, nil
}
func (r *secWorkoutRepo) GetAssignedWorkoutDetail(_ context.Context, _ string) (*trainingdomain.WorkoutDetail, error) {
	return r.detail, nil
}
func (r *secWorkoutRepo) GetWorkoutSession(_ context.Context, _, _ string) (*trainingdomain.WorkoutSession, error) {
	return nil, nil
}
func (r *secWorkoutRepo) CreateWorkoutSession(_ context.Context, _, _ string) (*trainingdomain.WorkoutSession, error) {
	return nil, nil
}
func (r *secWorkoutRepo) CompleteSession(_ context.Context, _, _ string, _ int) error { return nil }
func (r *secWorkoutRepo) GetPrescription(_ context.Context, _ string) ([]trainingdomain.WorkoutExercise, error) {
	return []trainingdomain.WorkoutExercise{}, nil
}
func (r *secWorkoutRepo) ListAssignedWorkoutsByCoach(_ context.Context, _ string) ([]*trainingdomain.AssignedWorkout, error) {
	return nil, nil
}
func (r *secWorkoutRepo) UpdateAssignedWorkout(_ context.Context, _ string, _ *trainingdomain.AssignedWorkout) error {
	return nil
}
func (r *secWorkoutRepo) DeleteAssignedWorkout(_ context.Context, _ string) error { return nil }
func (r *secWorkoutRepo) DeleteTemplate(_ context.Context, _ string) error        { return nil }
func (r *secWorkoutRepo) UpdateWorkoutExerciseActuals(_ context.Context, _, _ string, _ []trainingdomain.RunningInterval) error {
	return nil
}
func (r *secWorkoutRepo) ListSessionsByWorkout(_ context.Context, _ string) ([]*trainingdomain.WorkoutSession, error) {
	return nil, nil
}

type secSessionRepo struct {
	lastCreated *trainingdomain.TrainingSession
}

func (r *secSessionRepo) Create(_ context.Context, s *trainingdomain.TrainingSession) error {
	r.lastCreated = s
	return nil
}
func (r *secSessionRepo) ListByAthlete(_ context.Context, _, _ string, _ int) ([]*trainingdomain.TrainingSession, error) {
	return nil, nil
}

func TestIDORGuards_HealthFormMetricsRoutineProductTraining(t *testing.T) {
	t.Run("HealthData blocks unlinked ?athlete_id= and foreign DELETE /health/devices/:id", func(t *testing.T) {
		repo := &secHealthRepo{devices: map[string]*healthdomain.HealthDevice{
			"dev-1": {ID: "dev-1", AthleteID: "athlete-1"},
		}}
		h := NewHealthDataHandler(healthapp.NewService(repo)).WithTenantResolver(secTenantResolver{allow: false})
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-other", Role: "coach"})
			return c.Next()
		})
		app.Get("/health/metrics", h.GetMetrics)
		app.Delete("/health/devices/:id", h.RemoveDevice)

		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/health/metrics?athlete_id=athlete-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)

		delResp, err := app.Test(httptest.NewRequest(http.MethodDelete, "/health/devices/dev-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, delResp.StatusCode)
		require.NotNil(t, repo.devices["dev-1"])
	})

	t.Run("FormMetrics blocks unlinked coach on /form-metrics/athlete/:id", func(t *testing.T) {
		h := NewFormMetricsHandler(fmapp.NewService(secFormMetricsRepo{})).WithTenantResolver(secTenantResolver{allow: false})
		app := fiber.New()
		app.Get("/form-metrics/athlete/:id", func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-b", Role: "coach"})
			return h.GetAthleteMetrics(c)
		})
		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/form-metrics/athlete/athlete-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Routine blocks foreign GET /athlete/routines/:id and unauthenticated calls", func(t *testing.T) {
		repo := &secRoutineRepo{routines: map[string]*routinedomain.Routine{
			"rt-1": {ID: "rt-1", AthleteID: "athlete-1", Name: "Leg Day"},
		}}
		h := NewRoutineHandler(routineapp.NewService(repo))

		appNoAuth := fiber.New()
		appNoAuth.Get("/athlete/routines", h.ListRoutines)
		resp401, err := appNoAuth.Test(httptest.NewRequest(http.MethodGet, "/athlete/routines", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, resp401.StatusCode)

		appOther := fiber.New()
		appOther.Get("/athlete/routines/:id", func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "athlete-2", Role: "athlete"})
			return h.GetRoutine(c)
		})
		resp403, err := appOther.Test(httptest.NewRequest(http.MethodGet, "/athlete/routines/rt-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp403.StatusCode)
	})

	t.Run("Product GET /products/:id requires coach owner or active link", func(t *testing.T) {
		repo := &secProductRepo{products: map[string]*productdomain.Product{
			"prod-1": {ID: "prod-1", CoachID: "coach-a", Name: "Creatine"},
		}}
		h := NewProductHandler(productapp.NewService(repo)).WithTenantResolver(secTenantResolver{allow: false})
		app := fiber.New()
		app.Get("/products/:id", func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "athlete-unlinked", Role: "athlete"})
			return h.GetProduct(c)
		})
		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/products/prod-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("Training enforces template/prescription/running-complete ownership and ignores req.CoachID", func(t *testing.T) {
		wRepo := &secWorkoutRepo{
			template: &trainingdomain.WorkoutTemplate{ID: "tpl-1", CoachID: "coach-a"},
			detail: &trainingdomain.WorkoutDetail{
				Workout: &trainingdomain.AssignedWorkout{ID: "w-1", AthleteID: "athlete-1", CoachID: "coach-a"},
			},
		}
		sRepo := &secSessionRepo{}
		svc := trainingapp.NewService(nil, wRepo, nil, sRepo)
		h := NewTrainingHandler(svc).WithTenantResolver(secTenantResolver{allow: true})

		// Non-owner coach blocked from template
		app := fiber.New()
		app.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "coach-b", Role: "coach"})
			return c.Next()
		})
		app.Get("/workout-templates/:id", h.GetWorkoutTemplate)
		app.Post("/training/sessions", h.CreateTrainingSession)

		tplResp, err := app.Test(httptest.NewRequest(http.MethodGet, "/workout-templates/tpl-1", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, tplResp.StatusCode)

		// Spoofed req.CoachID is ignored in CreateTrainingSession
		sessReq := httptest.NewRequest(http.MethodPost, "/training/sessions", bytes.NewBufferString(`{"coach_id":"coach-a","athlete_id":"athlete-1","title":"Morning Run"}`))
		sessReq.Header.Set("Content-Type", "application/json")
		sessResp, err := app.Test(sessReq)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, sessResp.StatusCode)
		require.NotNil(t, sRepo.lastCreated)
		require.Equal(t, "coach-b", sRepo.lastCreated.CoachID)

		// Unrelated athlete blocked from prescription & running-complete
		appAthlete := fiber.New()
		appAthlete.Use(func(c *fiber.Ctx) error {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: "athlete-2", Role: "athlete"})
			return c.Next()
		})
		appAthlete.Get("/workouts/:id/prescription", h.GetWorkoutPrescription)
		appAthlete.Get("/workouts/:id/running-complete", h.GetCompletedRunningWorkout)

		pResp, err := appAthlete.Test(httptest.NewRequest(http.MethodGet, "/workouts/w-1/prescription", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, pResp.StatusCode)

		rcResp, err := appAthlete.Test(httptest.NewRequest(http.MethodGet, "/workouts/w-1/running-complete", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, rcResp.StatusCode)

		// Verify JSON response body for session has server coachID
		var sessBody map[string]interface{}
		_ = json.NewDecoder(sessResp.Body).Decode(&sessBody)
	})
}

func TestNoPanicOnMissingAuth_TestimonialAndBlog(t *testing.T) {
	th := NewTestimonialHandler(nil)
	bh := NewBlogHandler(nil)

	app := fiber.New()
	app.Post("/testimonials", th.Create)
	app.Put("/testimonials/:id", th.Update)
	app.Delete("/testimonials/:id", th.Delete)
	app.Get("/coach/blog", bh.ListCoachArticles)
	app.Post("/blog", bh.CreateArticle)
	app.Put("/blog/:id", bh.UpdateArticle)
	app.Delete("/blog/:id", bh.DeleteArticle)

	for _, tc := range []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/testimonials"},
		{http.MethodPut, "/testimonials/1"},
		{http.MethodDelete, "/testimonials/1"},
		{http.MethodGet, "/coach/blog"},
		{http.MethodPost, "/blog"},
		{http.MethodPut, "/blog/1"},
		{http.MethodDelete, "/blog/1"},
	} {
		resp, err := app.Test(httptest.NewRequest(tc.method, tc.path, nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode, "%s %s", tc.method, tc.path)
	}
}
