package handlers

import (
	"context"
	"database/sql"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

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
