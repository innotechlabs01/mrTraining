package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
)

func TestAdminPutSettings_RejectsSecretKeysWithoutDBWrites(t *testing.T) {
	forbiddenPayloads := []struct {
		name string
		body string
	}{
		{name: "wompiPrivateKey flat", body: `{"wompiPrivateKey":"prv_prod_123"}`},
		{name: "clerkSecretKey flat", body: `{"clerkSecretKey":"sk_live_123"}`},
		{name: "wompiEventsSecret flat", body: `{"wompiEventsSecret":"evt_123"}`},
		{name: "wompiIntegritySecret flat", body: `{"wompiIntegritySecret":"int_123"}`},
		{name: "clerkWebhookSecret flat", body: `{"clerkWebhookSecret":"whsec_123"}`},
		{name: "snake_case wompi_private_key", body: `{"wompi_private_key":"prv_123"}`},
		{name: "snake_case clerk_secret_key", body: `{"clerk_secret_key":"sk_123"}`},
		{name: "case-insensitive WOMPIEVENTSSECRET", body: `{"WOMPIEVENTSSECRET":"evt_123"}`},
		{name: "single key/value payload", body: `{"key":"clerkWebhookSecret","value":"whsec_123"}`},
		{name: "mixed safe and secret rejects atomically", body: `{"platformName":"MR","clerkSecretKey":"sk_123"}`},
	}

	for _, tc := range forbiddenPayloads {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			// No SQL expectations set: any DB query/exec will fail mock.ExpectationsWereMet.
			h := NewAdminHandler(db, nil, nil)
			app := fiber.New()
			app.Put("/admin/settings", h.PutSettings)

			req := httptest.NewRequest(http.MethodPut, "/admin/settings", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Equal(t, http.StatusBadRequest, resp.StatusCode)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestAdminPutSettings_AllowsSafeKeys(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mock.ExpectExec(`INSERT INTO platform_settings \(key, value, updated_at\)`).
		WithArgs("platformName", []byte(`"MR Training"`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	h := NewAdminHandler(db, nil, nil)
	app := fiber.New()
	app.Put("/admin/settings", h.PutSettings)

	req := httptest.NewRequest(http.MethodPut, "/admin/settings", strings.NewReader(`{"platformName":"MR Training"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var out AdminSettingsResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
	require.Equal(t, "MR Training", out.Settings["platformName"])
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAdminGetSettings_OmitsSecretKeys(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	rows := sqlmock.NewRows([]string{"key", "value"}).
		AddRow("platformName", []byte(`"MR Training"`)).
		AddRow("wompiPrivateKey", []byte(`"prv_secret"`)).
		AddRow("clerkSecretKey", []byte(`"sk_secret"`)).
		AddRow("wompiEventsSecret", []byte(`"evt_secret"`)).
		AddRow("wompiIntegritySecret", []byte(`"int_secret"`)).
		AddRow("clerkWebhookSecret", []byte(`"whsec_secret"`)).
		AddRow("wompi_private_key", []byte(`"prv_snake"`))

	mock.ExpectQuery(`SELECT key, value FROM platform_settings`).WillReturnRows(rows)

	h := NewAdminHandler(db, nil, nil)
	app := fiber.New()
	app.Get("/admin/settings", h.GetSettings)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/admin/settings", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var out AdminSettingsResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
	require.Equal(t, "MR Training", out.Settings["platformName"])
	require.Contains(t, out.Settings, "coachPlanCommissionPct")

	for _, secretKey := range []string{
		"wompiPrivateKey",
		"clerkSecretKey",
		"wompiEventsSecret",
		"wompiIntegritySecret",
		"clerkWebhookSecret",
		"wompi_private_key",
	} {
		_, present := out.Settings[secretKey]
		require.False(t, present, "secret key %q must be omitted from GetSettings", secretKey)
	}
	require.NoError(t, mock.ExpectationsWereMet())
}
