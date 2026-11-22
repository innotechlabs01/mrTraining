package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	errorapp "github.com/innotechlabs01/mr-training-api/internal/application/error_tracking"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/error_tracking"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type stubErrorRepo struct{}

func (r *stubErrorRepo) Create(_ context.Context, e *domain.Error) (*domain.Error, error) {
	return e, nil
}

func (r *stubErrorRepo) GetByID(_ context.Context, id string) (*domain.Error, error) {
	if id == "stats" {
		return nil, domain.ErrNotFound
	}
	return &domain.Error{ID: id, Title: "test"}, nil
}

func (r *stubErrorRepo) List(_ context.Context, _, _, _ string, _, _ int) ([]*domain.Error, int, error) {
	return []*domain.Error{}, 0, nil
}

func (r *stubErrorRepo) Resolve(_ context.Context, id, _, _, status string) (*domain.Error, error) {
	return &domain.Error{ID: id, Status: status}, nil
}

func (r *stubErrorRepo) CountByStatus(_ context.Context) (map[string]int, error) {
	return map[string]int{"open": 3}, nil
}

func (r *stubErrorRepo) CountBySeverity(_ context.Context) (map[string]int, error) {
	return map[string]int{"high": 2}, nil
}

func TestErrorHandler_SuperAdminGuardAndStatsRoute(t *testing.T) {
	superAdminID := "super-admin-1"
	svc := errorapp.NewService(&stubErrorRepo{}, nil, superAdminID)
	h := NewErrorHandler(svc)

	cases := []struct {
		name   string
		auth   *middleware.TestAuthConfig
		path   string
		want   int
	}{
		{
			name: "anonymous rejected with 401",
			auth: nil,
			path: "/api/v1/errors/stats",
			want: http.StatusUnauthorized,
		},
		{
			name: "non-superadmin coach rejected with 403",
			auth: &middleware.TestAuthConfig{UserID: "coach-1", Role: "coach"},
			path: "/api/v1/errors/stats",
			want: http.StatusForbidden,
		},
		{
			name: "non-superadmin athlete rejected with 403 on list",
			auth: &middleware.TestAuthConfig{UserID: "athlete-1", Role: "athlete"},
			path: "/api/v1/errors",
			want: http.StatusForbidden,
		},
		{
			name: "superadmin reaches stats route (not shadowed by /:id)",
			auth: &middleware.TestAuthConfig{UserID: superAdminID, Role: "admin"},
			path: "/api/v1/errors/stats",
			want: http.StatusOK,
		},
		{
			name: "superadmin reaches get by id",
			auth: &middleware.TestAuthConfig{UserID: superAdminID, Role: "admin"},
			path: "/api/v1/errors/err-123",
			want: http.StatusOK,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			api := app.Group("/api/v1")
			api.Use(func(c *fiber.Ctx) error {
				if tc.auth != nil {
					middleware.SetTestAuth(c, *tc.auth)
				}
				return c.Next()
			})
			h.RegisterErrorRoutes(api, []string{superAdminID})

			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Equal(t, tc.want, resp.StatusCode)

			if tc.path == "/api/v1/errors/stats" && tc.want == http.StatusOK {
				var body map[string]interface{}
				require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
				require.Contains(t, body, "by_status")
				require.Contains(t, body, "by_severity")
			}
		})
	}
}
