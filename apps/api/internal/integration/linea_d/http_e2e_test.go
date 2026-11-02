package linea_d_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"github.com/gofiber/fiber/v2"

	planapp "github.com/innotechlabs01/mr-training-api/internal/application/plan"
	planinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/plan"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/routes"
		"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// setupLineaDApp crea una app Fiber con las rutas públicas de Línea D
// registradas y conectada a PostgreSQL real.
func setupLineaDApp(t *testing.T) (*fiber.App, *planapp.Service, *planinfra.Repository) {
	t.Helper()

	db := newLineaDTestDB(t)
	repo := planinfra.NewRepository(db.DB)
	svc := planapp.NewService(repo)
	planHandler := handlers.NewPlanHandler(svc, nil, nil)

	app := fiber.New()
	pub := app.Group("/public")
	routes.RegisterPublicPlanRoutes(pub, planHandler)
	pub.Get("/landing", handlers.HandlerGetLanding(db.DB))

	return app, svc, repo
}

// newLineaDTestDB conecta a PostgreSQL para pruebas de integración.
func newLineaDTestDB(t *testing.T) *database.DB {
	t.Helper()
	url := "postgresql://postgres@127.0.0.1:5435/mr_training_migration?sslmode=disable"
	db, err := database.Connect(url)
	if err != nil {
		t.Skipf("skipping: cannot connect to PostgreSQL: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

// doGetRequest hace una petición GET sin autenticación (endpoints públicos).
func doGetRequest(t *testing.T, app *fiber.App, path string) (*http.Response, error) {
	t.Helper()
	req := httptest.NewRequest("GET", path, nil)
	return app.Test(req)
}

// parseResponse parsea el cuerpo JSON de la respuesta.
func parseResponse(t *testing.T, resp *http.Response) map[string]interface{} {
	t.Helper()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("failed to parse JSON response: %v, body: %s", err, string(body))
	}
	return result
}

// ============================================================================
// Test 1: GET /public/landing — contenido general de landing
// ============================================================================

func TestLineaD_GetPublicLanding(t *testing.T) {
	app, _, _ := setupLineaDApp(t)

	resp, err := doGetRequest(t, app, "/public/landing")
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	// La landing pública debe estar accesible sin autenticación
	if resp.StatusCode != 200 {
		t.Fatalf("expected status 200 for public landing, got %d", resp.StatusCode)
	}

	result := parseResponse(t, resp)
	// Debe tener campos de landing (brand, navLinks, etc.)
	if result == nil {
		t.Fatal("expected non-empty landing response")
	}
}

// ============================================================================
// Test 2: GET /public/coaches/:coachId/plans — planes de coach existente y activo
// ============================================================================

func TestLineaD_GetPublicPlans_ActiveCoach(t *testing.T) {
	app, _, repo := setupLineaDApp(t)

	coachID := "coach-001" // Juan Pérez, activo, 2 planes

	resp, err := doGetRequest(t, app, "/public/coaches/"+coachID+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200 for active coach plans, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	result := parseResponse(t, resp)
	data, ok := result["data"].([]interface{})
	if !ok {
		t.Fatalf("expected 'data' array in response, got: %v", result["data"])
	}

	if len(data) != 2 {
		t.Errorf("expected 2 active plans for coach-001, got %d", len(data))
	}

	// Verificar que solo planes activos aparecen
	for _, p := range data {
		plan, ok := p.(map[string]interface{})
		if !ok {
			t.Fatalf("expected plan object, got: %v", p)
		}
		if plan["is_active"] != true {
			t.Errorf("expected plan to be active, got is_active=%v", plan["is_active"])
		}
		if plan["coach_id"] != coachID {
			t.Errorf("expected coach_id=%s, got %v", coachID, plan["coach_id"])
		}
	}

	// Verificar persistencia en PostgreSQL
	plans, err := repo.ListByCoach(t.Context(), coachID, true)
	if err != nil {
		t.Fatalf("failed to list plans from repo: %v", err)
	}
	if len(plans) != 2 {
		t.Errorf("expected 2 active plans in DB, got %d", len(plans))
	}
}

// ============================================================================
// Test 3: GET /public/coaches/:coachId/plans — coach con planes activos
// ============================================================================

func TestLineaD_GetPublicPlans_CoachWithOnePlan(t *testing.T) {
	app, _, repo := setupLineaDApp(t)

	coachID := "coach-002" // María Gómez, activo, 1 plan

	resp, err := doGetRequest(t, app, "/public/coaches/"+coachID+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	result := parseResponse(t, resp)
	data, ok := result["data"].([]interface{})
	if !ok {
		t.Fatalf("expected 'data' array in response")
	}

	if len(data) != 1 {
		t.Errorf("expected 1 active plan for coach-002, got %d", len(data))
	}

	// Verificar en BD
	plans, err := repo.ListByCoach(t.Context(), coachID, true)
	if err != nil {
		t.Fatalf("failed to list plans from repo: %v", err)
	}
	if len(plans) != 1 {
		t.Errorf("expected 1 active plan in DB, got %d", len(plans))
	}
}

// ============================================================================
// Test 4: GET /public/coaches/:coachId/plans — coach inactivo
// ============================================================================

func TestLineaD_GetPublicPlans_InactiveCoach(t *testing.T) {
	app, _, _ := setupLineaDApp(t)

	coachID := "coach-003" // Entrenador Inactivo, is_active=0

	resp, err := doGetRequest(t, app, "/public/coaches/"+coachID+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	// El endpoint ListPublicPlans usa ListPlans(coachID, true) que filtra por
	// is_active del plan, no del coach. Un coach inactivo con plan inactivo
	// debería devolver lista vacía (no planes activos).
	if resp.StatusCode != 200 {
		t.Fatalf("expected status 200 (empty list) for inactive coach, got %d", resp.StatusCode)
	}

	result := parseResponse(t, resp)
	data, ok := result["data"].([]interface{})
	if !ok {
		t.Fatalf("expected 'data' array in response")
	}

	if len(data) != 0 {
		t.Errorf("expected 0 active plans for inactive coach, got %d", len(data))
	}
}

// ============================================================================
// Test 5: GET /public/coaches/:coachId/plans — coach inexistente
// ============================================================================

func TestLineaD_GetPublicPlans_NonexistentCoach(t *testing.T) {
	app, _, _ := setupLineaDApp(t)

	coachID := "coach-99999" // no existe

	resp, err := doGetRequest(t, app, "/public/coaches/"+coachID+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Fatalf("expected status 200 (empty list) for nonexistent coach, got %d", resp.StatusCode)
	}

	result := parseResponse(t, resp)
	data, ok := result["data"].([]interface{})
	if !ok {
		t.Fatalf("expected 'data' array in response")
	}

	if len(data) != 0 {
		t.Errorf("expected 0 plans for nonexistent coach, got %d", len(data))
	}
}

// ============================================================================
// Test 6: Aislamiento entre coaches
// ============================================================================

func TestLineaD_CoachIsolation(t *testing.T) {
	app, _, _ := setupLineaDApp(t)

	coachA := "coach-001" // Juan Pérez: Plan Básico $4990, Plan Premium $9990
	coachB := "coach-002" // María Gómez: Plan Básico $3990

	respA, err := doGetRequest(t, app, "/public/coaches/"+coachA+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request for coach A: %v", err)
	}
	respB, err := doGetRequest(t, app, "/public/coaches/"+coachB+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request for coach B: %v", err)
	}

	resultA := parseResponse(t, respA)
	resultB := parseResponse(t, respB)

	dataA, _ := resultA["data"].([]interface{})
	dataB, _ := resultB["data"].([]interface{})

	if len(dataA) != 2 {
		t.Errorf("expected 2 plans for coach A, got %d", len(dataA))
	}
	if len(dataB) != 1 {
		t.Errorf("expected 1 plan for coach B, got %d", len(dataB))
	}

	// Los planes de A no deben contener precios de B
	for _, p := range dataA {
		plan, _ := p.(map[string]interface{})
		if plan["price"] == 3990 {
			t.Error("Coach A's plans should not include Coach B's $3990 plan")
		}
	}

	for _, p := range dataB {
		plan, _ := p.(map[string]interface{})
		if plan["price"] == 4990 || plan["price"] == 9990 {
			t.Error("Coach B's plans should not include Coach A's plans")
		}
	}
}

// ============================================================================
// Test 7: Plan inactivo no aparece en catálogo público
// ============================================================================

func TestLineaD_InactivePlanNotExposed(t *testing.T) {
	app, _, repo := setupLineaDApp(t)

	coachID := "coach-003" // tiene plan-004 (inactivo, $1000)

	resp, err := doGetRequest(t, app, "/public/coaches/"+coachID+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	result := parseResponse(t, resp)
	data, ok := result["data"].([]interface{})
	if !ok {
		t.Fatalf("expected 'data' array in response")
	}

	if len(data) != 0 {
		t.Errorf("expected 0 active plans (plan-004 is inactive), got %d", len(data))
	}

	// Verificar en BD que plan-004 existe pero está inactivo
	allPlans, err := repo.ListByCoach(t.Context(), coachID, false) // activeOnly=false
	if err != nil {
		t.Fatalf("failed to list all plans: %v", err)
	}
	if len(allPlans) != 1 {
		t.Errorf("expected 1 total plan (including inactive), got %d", len(allPlans))
	}
	if allPlans[0].IsActive {
		t.Error("expected plan-004 to be inactive")
	}

	_ = time.Now
}


// ============================================================================
// Test Debug: Llamar directo al servicio ListPlans
// ============================================================================

func TestDebug_ListPlansDirect(t *testing.T) {
	app, svc, repo := setupLineaDApp(t)

	coachID := "coach-001"

	// Llamar directamente al servicio
	plans, err := svc.ListPlans(t.Context(), coachID, true)
	if err != nil {
		t.Fatalf("service ListPlans failed: %v", err)
	}
	t.Logf("service returned %d plans", len(plans))
	for _, p := range plans {
		t.Logf("  plan: id=%s name=%s coach_id=%s is_active=%v price=%v", p.ID, p.Name, p.CoachID, p.IsActive, p.Price)
	}

	// Llamar directamente al repositorio
	plans2, err := repo.ListByCoach(t.Context(), coachID, true)
	if err != nil {
		t.Fatalf("repo ListByCoach failed: %v", err)
	}
	t.Logf("repo returned %d plans", len(plans2))

	// Ahora hacer la petición HTTP
	resp, err := doGetRequest(t, app, "/public/coaches/"+coachID+"/plans")
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	bodyBytes, _ := io.ReadAll(resp.Body)
	t.Logf("HTTP status: %d, body: %s", resp.StatusCode, string(bodyBytes))
}
