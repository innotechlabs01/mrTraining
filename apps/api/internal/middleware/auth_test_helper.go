package middleware

import (
	"fmt"
	"os"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// TestAuthConfig defines the identity injected for HTTP tests.
// It mirrors the contract that RequireAuth establishes via c.Locals().
type TestAuthConfig struct {
	UserID  string
	Role    string // "coach" | "athlete" | "admin"
	Email   string
}

// IsTestEnvironment returns true only when running under `go test`.
// It checks both the testing package and an explicit env var for CI safety.
func IsTestEnvironment() bool {
	return testing.Testing() || os.Getenv("MR_TRAINING_TEST_MODE") == "true"
}

// SetTestAuth injects an authenticated identity into the Fiber context.
// It mirrors exactly what RequireAuth sets via c.Locals(), so downstream
// handlers (GetUserID, GetUserRole, etc.) work identically.
//
// SAFETY:
//   - Only effective when testing.Testing() is true or MR_TRAINING_TEST_MODE=true.
//   - Does not modify RequireAuth or any production middleware.
//   - Does not accept headers from requests; identity is set programmatically.
//   - Does not use Clerk credentials or tokens.
//   - Silent no-op outside test environment.
func SetTestAuth(c *fiber.Ctx, cfg TestAuthConfig) {
	if !IsTestEnvironment() {
		return
	}

	if cfg.UserID == "" {
		panic("auth_test_helper: SetTestAuth requires a non-empty UserID")
	}

	c.Locals(string(UserIDKey), cfg.UserID)
	c.Locals(string(AthleteIDKey), cfg.UserID)
	c.Locals(string(UserRoleKey), cfg.Role)
	c.Locals(string(UserEmailKey), cfg.Email)
}

// ClearTestAuth removes any test-auth identity from the Fiber context.
func ClearTestAuth(c *fiber.Ctx) {
	if !IsTestEnvironment() {
		return
	}

	c.Locals(string(UserIDKey), nil)
	c.Locals(string(AthleteIDKey), nil)
	c.Locals(string(UserRoleKey), nil)
	c.Locals(string(UserEmailKey), nil)
}

// MustBeTestEnv panics if not running in a test environment.
// Use this at the start of test helpers to catch accidental production usage.
func MustBeTestEnv() {
	if !testing.Testing() {
		panic("auth_test_helper: MustBeTestEnv called outside of testing context")
	}
}

// String returns a human-readable summary of the test auth config.
func (cfg TestAuthConfig) String() string {
	return fmt.Sprintf("TestAuthConfig{user_id=%q, role=%q, email=%q}",
		cfg.UserID, cfg.Role, cfg.Email)
}
