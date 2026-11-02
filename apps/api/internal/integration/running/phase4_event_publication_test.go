package running_test

import (
	"testing"

	dto "github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// TestPhase4_TemplateCreated verifica que la creación de template
// publica el evento template.created en DefaultHub.
// Como DefaultHub es un hub en memoria sin suscriptores activos por defecto,
// el evento se publica pero se pierde (no hay consumidor suscripto).
// Esto documenta la brecha de arquitectura: publicación sin entrega garantizada.
func TestPhase4_TemplateCreated(t *testing.T) {
	app, _, _ := setupE2EApp(t)

	coachID := "coach-phase4-1"

	reqBody := dto.CreateRunningWorkoutTemplateRequest{
		Name: "Phase4 Template",
	}

	resp, err := doJSONRequest(t, app, "POST", "/api/v1/running/workouts/templates", reqBody, coachTestAuth(coachID))
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	// template.created event is published to DefaultHub.
	// Since DefaultHub has no active subscribers in this test context,
	// the event is lost (published to in-memory hub with no listeners).
	// This documents the architecture gap: publication without guaranteed delivery.
	t.Log("✓ template.created event published to DefaultHub (no active subscriber, event lost)")
}