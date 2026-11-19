package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRequireCoachID_MissingCoachContext(t *testing.T) {
	app := fiber.New()
	app.Get(
		"/protected",
		withTestAuth(
			func(c *fiber.Ctx) error {
				if GetCoachID(c) == "" {
					return RequireCoachID()(c)
				}
				return c.SendStatus(http.StatusOK)
			},
			TestAuthConfig{UserID: "user-1", Role: "coach"},
		),
	)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}
