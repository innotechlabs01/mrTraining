package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	trmapp "github.com/innotechlabs01/mr-training-api/internal/application/trm"
)

// fakeTRMService simula el servicio TRM para probar el handler.
type fakeTRMService struct {
	rate *trmapp.Rate
	err  error
}

func (f *fakeTRMService) GetCurrent(ctx context.Context) (*trmapp.Rate, error) {
	return f.rate, f.err
}
func (f *fakeTRMService) GetStored(ctx context.Context) (*trmapp.Rate, error) {
	return f.rate, f.err
}

func TestGetTRMSetting_ReturnsMargin(t *testing.T) {
	fake := &fakeTRMService{
		rate: &trmapp.Rate{
			Value:     4320.0,
			VigenciaD: "2026-01-01",
			FetchedAt: time.Now().UTC(),
			MarginPct: 8,
			Source:    "datos.gov.co",
		},
	}
	h := &AdminHandler{trmService: fake}

	app := fiber.New()
	app.Get("/admin/settings/trm", h.GetTRMSetting)

	req := httptest.NewRequest(http.MethodGet, "/admin/settings/trm", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var body struct {
		Value         float64 `json:"value"`
		VigenciaDesde string  `json:"vigencia_desde"`
		FetchedAt     string  `json:"fetched_at"`
		MarginPct     int     `json:"margin_pct"`
		Source        string  `json:"source"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Equal(t, 4320.0, body.Value)
	require.Equal(t, 8, body.MarginPct)
	require.Equal(t, "datos.gov.co", body.Source)
	require.Equal(t, "2026-01-01", body.VigenciaDesde)
	require.NotEmpty(t, body.FetchedAt)
}

func TestGetTRMSetting_NoService_ReturnsUnavailable(t *testing.T) {
	h := &AdminHandler{} // sin trmService

	app := fiber.New()
	app.Get("/admin/settings/trm", h.GetTRMSetting)

	req := httptest.NewRequest(http.MethodGet, "/admin/settings/trm", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)
}

func TestGetTRMSetting_ServiceError_ReturnsUnavailable(t *testing.T) {
	fake := &fakeTRMService{
		err: errTRMUnavailable,
	}
	h := &AdminHandler{trmService: fake}

	app := fiber.New()
	app.Get("/admin/settings/trm", h.GetTRMSetting)

	req := httptest.NewRequest(http.MethodGet, "/admin/settings/trm", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusServiceUnavailable, resp.StatusCode)
}

var errTRMUnavailable = errTRM("source unavailable")

type errTRM string

func (e errTRM) Error() string { return string(e) }
