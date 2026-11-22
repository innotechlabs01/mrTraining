package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"

	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

const (
	testSuperAdmin = "test-super-admin"
	testCoachID    = "coach-internal-001"
	testClerkID    = "user_clerk_001"
)

// clerkCapture records calls to UpdatePublicMetadata and can be configured to fail.
type clerkCapture struct {
	lastUserID string
	lastMeta   map[string]interface{}
	fail       bool
}

func (m *clerkCapture) UpdatePublicMetadata(ctx context.Context, userID string, metadata map[string]interface{}) error {
	m.lastUserID = userID
	m.lastMeta = metadata
	if m.fail {
		return &boomError{}
	}
	return nil
}

type boomError struct{}

func (e *boomError) Error() string { return "boom" }

func setupSkipSubscriptionApp(t *testing.T, h *AdminHandler, allowedID string) *fiber.App {
	t.Helper()
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: allowedID, Role: "super_admin"})
		return c.Next()
	})
	app.Use(middleware.RequirePlatformSuperAdmin(allowedID))
	app.Post("/admin/coaches/:id/skip-subscription", h.ToggleSkipSubscription)
	return app
}

func execSQL(t *testing.T, db *sqlDB, query string, args ...interface{}) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), query, args...)
	require.NoError(t, err)
}

// sqlDB wraps *sql.DB to satisfy the small interface used by helpers.
type sqlDB struct{ *sql.DB }

func mustOpenDB(t *testing.T) *sqlDB {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := sql.Open("pgx", url)
	require.NoError(t, err)
	return &sqlDB{db}
}

func TestToggleSkipSubscription_ByCoachesID(t *testing.T) {
	db := mustOpenDB(t)
	defer db.Close()

	execSQL(t, db, `DELETE FROM coaches WHERE id = $1 OR email = $2`, testCoachID, "juan.internal@mrtraining.test")
	execSQL(t, db, `
		INSERT INTO coaches (id, email, name, skip_subscription, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, false, 1, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, testCoachID, "juan.internal@mrtraining.test", "Juan Interno")

	h := NewAdminHandler(db.DB, nil, nil)
	app := setupSkipSubscriptionApp(t, h, testSuperAdmin)

	body := strings.NewReader(`{"skip_subscription": true}`)
	req := httptest.NewRequest(http.MethodPost, "/admin/coaches/"+testCoachID+"/skip-subscription", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var skipped bool
	require.NoError(t, db.QueryRowContext(context.Background(),
		`SELECT skip_subscription FROM coaches WHERE id = $1`, testCoachID).Scan(&skipped))
	require.True(t, skipped)
}

func TestToggleSkipSubscription_ByUsersIDFallback(t *testing.T) {
	db := mustOpenDB(t)
	defer db.Close()

	execSQL(t, db, `DELETE FROM users WHERE id = $1`, testClerkID)
	execSQL(t, db, `DELETE FROM coaches WHERE id = $1 OR lower(email) = lower($2)`, testClerkID, "clerk.coach@mrtraining.test")
	execSQL(t, db, `
		INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, 'coach', true, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, testClerkID, "clerk.coach@mrtraining.test", "Coach Clerk")

	clerk := &clerkCapture{}
	h := NewAdminHandler(db.DB, clerk, nil)
	app := setupSkipSubscriptionApp(t, h, testSuperAdmin)

	body := strings.NewReader(`{"skip_subscription": true}`)
	req := httptest.NewRequest(http.MethodPost, "/admin/coaches/"+testClerkID+"/skip-subscription", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	require.Equal(t, testClerkID, clerk.lastUserID)
	meta, ok := clerk.lastMeta["membership_status"].(map[string]interface{})
	require.True(t, ok)
	require.Equal(t, true, meta["skip_subscription"])

	var exists int
	require.NoError(t, db.QueryRowContext(context.Background(),
		`SELECT count(*) FROM coaches WHERE id = $1`, testClerkID).Scan(&exists))
	require.Equal(t, 1, exists)
}

func TestToggleSkipSubscription_NotFound(t *testing.T) {
	db := mustOpenDB(t)
	defer db.Close()

	h := NewAdminHandler(db.DB, nil, nil)
	app := setupSkipSubscriptionApp(t, h, testSuperAdmin)

	body := strings.NewReader(`{"skip_subscription": true}`)
	req := httptest.NewRequest(http.MethodPost, "/admin/coaches/no-such-coach-id/skip-subscription", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestToggleSkipSubscription_DoesNotLogRawClerkID(t *testing.T) {
	db := mustOpenDB(t)
	defer db.Close()

	execSQL(t, db, `DELETE FROM users WHERE id = $1`, testClerkID)
	execSQL(t, db, `
		INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, 'coach', true, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, testClerkID, "clerk.coach@mrtraining.test", "Coach Clerk")

	clerk := &clerkCapture{fail: true}
	h := NewAdminHandler(db.DB, clerk, nil)
	app := setupSkipSubscriptionApp(t, h, testSuperAdmin)

	orig := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w
	defer func() { os.Stdout = orig }()

	body := strings.NewReader(`{"skip_subscription": true}`)
	req := httptest.NewRequest(http.MethodPost, "/admin/coaches/"+testClerkID+"/skip-subscription", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	w.Close()
	os.Stdout = orig
	out, _ := io.ReadAll(r)

	require.NotContains(t, string(out), testClerkID, "el Clerk ID crudo no debe escribirse en logs")
}

func TestUpdateAdminPlan_InlinesNOW(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM plans WHERE id = \$1`).
		WithArgs("plan-1").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	mock.ExpectExec(`UPDATE plans SET name = \$1, updated_at = NOW\(\) WHERE id = \$2`).
		WithArgs("Pro Plan", "plan-1").
		WillReturnResult(sqlmock.NewResult(0, 1))

	h := NewAdminHandler(db, nil, nil)
	app := fiber.New()
	app.Put("/admin/plans/:id", h.UpdateAdminPlan)

	req := httptest.NewRequest(http.MethodPut, "/admin/plans/plan-1", strings.NewReader(`{"name":"Pro Plan"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCommissionTerms_NilDBReturns503(t *testing.T) {
	h := NewAdminHandler(nil, nil, nil)
	app := fiber.New()
	app.Get("/admin/commission-terms", h.GetCommissionTerms)
	app.Put("/admin/commission-terms", h.PutCommissionTerms)

	getResp, err := app.Test(httptest.NewRequest(http.MethodGet, "/admin/commission-terms", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusServiceUnavailable, getResp.StatusCode)

	putReq := httptest.NewRequest(http.MethodPut, "/admin/commission-terms", strings.NewReader(`{"rate_bps":800}`))
	putReq.Header.Set("Content-Type", "application/json")
	putResp, err := app.Test(putReq)
	require.NoError(t, err)
	require.Equal(t, http.StatusServiceUnavailable, putResp.StatusCode)
}

func TestPutAndGetCommissionTerms(t *testing.T) {
	t.Run("PutCommissionTerms marshals JSONB and inlines NOW", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO platform_settings .* VALUES \('commission\.rate_bps', \$1, NOW\(\)\)`).
			WithArgs([]byte(`850`)).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec(`INSERT INTO platform_settings .* VALUES \('commission\.fixed_amount_cents', \$1, NOW\(\)\)`).
			WithArgs([]byte(`400000`)).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectExec(`INSERT INTO platform_settings .* VALUES \('commission\.currency', \$1, NOW\(\)\)`).
			WithArgs([]byte(`"USD"`)).
			WillReturnResult(sqlmock.NewResult(0, 1))

		h := NewAdminHandler(db, nil, nil)
		app := fiber.New()
		app.Put("/admin/commission-terms", h.PutCommissionTerms)

		body := `{"rate_bps":850,"fixed_amount_cents":400000,"currency":"USD"}`
		req := httptest.NewRequest(http.MethodPut, "/admin/commission-terms", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("GetCommissionTerms reads stored currency and falls back to COP", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT value FROM platform_settings WHERE key = 'commission\.rate_bps'`).
			WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow([]byte(`850`)))
		mock.ExpectQuery(`SELECT value FROM platform_settings WHERE key = 'commission\.fixed_amount_cents'`).
			WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow([]byte(`400000`)))
		mock.ExpectQuery(`SELECT value FROM platform_settings WHERE key = 'commission\.currency'`).
			WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow([]byte(`"USD"`)))

		h := NewAdminHandler(db, nil, nil)
		app := fiber.New()
		app.Get("/admin/commission-terms", h.GetCommissionTerms)

		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/admin/commission-terms", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var out map[string]interface{}
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
		require.Equal(t, float64(850), out["rate_bps"])
		require.Equal(t, float64(400000), out["fixed_amount_cents"])
		require.Equal(t, "USD", out["currency"])
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("GetCommissionTerms defaults currency to COP when missing", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT value FROM platform_settings WHERE key = 'commission\.rate_bps'`).
			WillReturnError(sql.ErrNoRows)
		mock.ExpectQuery(`SELECT value FROM platform_settings WHERE key = 'commission\.fixed_amount_cents'`).
			WillReturnError(sql.ErrNoRows)
		mock.ExpectQuery(`SELECT value FROM platform_settings WHERE key = 'commission\.currency'`).
			WillReturnError(sql.ErrNoRows)

		h := NewAdminHandler(db, nil, nil)
		app := fiber.New()
		app.Get("/admin/commission-terms", h.GetCommissionTerms)

		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/admin/commission-terms", nil))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var out map[string]interface{}
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
		require.Equal(t, "COP", out["currency"])
		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestFormatTimeValue(t *testing.T) {
	ts := time.Date(2026, 5, 10, 14, 30, 0, 0, time.FixedZone("COT", -5*3600))
	wantRFC := "2026-05-10T19:30:00Z"

	require.Equal(t, wantRFC, formatTimeValue(ts))
	require.Equal(t, wantRFC, formatTimeValue(&ts))
	require.Equal(t, "", formatTimeValue((*time.Time)(nil)))
	require.Equal(t, wantRFC, formatTimeValue(sql.NullTime{Time: ts, Valid: true}))
	require.Equal(t, "", formatTimeValue(sql.NullTime{Time: ts, Valid: false}))
	require.Equal(t, "2026-05-10T00:00:00Z", formatTimeValue("2026-05-10T00:00:00Z"))
	require.Equal(t, "2026-05-10", formatTimeValue(sql.NullString{String: "2026-05-10", Valid: true}))
	require.Equal(t, "2026-05-10", formatTimeValue([]byte("2026-05-10")))
	require.Equal(t, "", formatTimeValue(nil))
}

func TestListCoaches_ReadOnlyAndActiveMembershipPrecedence(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// No INSERT INTO coaches expectation: if queryCoaches mutates DB, sqlmock fails.
	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM all_coaches ac WHERE TRUE`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	mock.ExpectQuery(`WHERE \(am\.coach_id = ac\.id OR am\.coach_id = ac\.email\) AND am\.status = 'active'`).
		WithArgs(25, 0).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "coach_id", "name", "email", "is_active", "created_at",
			"athletes_count", "memberships_count", "active_memberships_count",
			"skip_subscription", "plan_name", "plan_price", "plan_max_athletes",
			"plan_status", "plan_expires_at", "revenue_month", "revenue_total", "last_login",
		}).AddRow(
			"c1", "c1", "Coach Uno", "uno@mr.test", 1, createdAt,
			3, 2, 1, false, "Pro", 100.0, 20, "active", "2026-12-01", 200.0, 500.0, "2026-06-02",
		))

	h := NewAdminHandler(db, nil, nil)
	app := fiber.New()
	app.Get("/admin/coaches", h.ListCoaches)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/admin/coaches", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var body AdminCoachesResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Equal(t, int64(1), body.Total)
	require.Len(t, body.Data, 1)
	require.Equal(t, "2026-06-01T12:00:00Z", body.Data[0].CreatedAt)
	require.NoError(t, mock.ExpectationsWereMet())
}
