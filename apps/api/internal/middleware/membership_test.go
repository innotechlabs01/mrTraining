package middleware_test

import (
	"context"
	"fmt"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/stretchr/testify/require"
)

func setAthleteID(t *testing.T, athleteID string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Locals("athlete_id", athleteID)
		return c.Next()
	}
}

// fakeMembershipReader implements middleware.MembershipStatusReader for testing.
type fakeMembershipReader struct {
	status     string
	hasActive  bool
	err        error
}

func (f *fakeMembershipReader) GetMembershipStatus(ctx context.Context, athleteID string) (string, bool, error) {
	return f.status, f.hasActive, f.err
}

func TestRequireActiveMembership_ActiveStatus_AllowsAccess(t *testing.T) {
	reader := &fakeMembershipReader{status: "active", hasActive: true, err: nil}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestRequireActiveMembership_TrialStatus_AllowsAccess(t *testing.T) {
	reader := &fakeMembershipReader{status: "trial", hasActive: true, err: nil}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestRequireActiveMembership_PastDueStatus_AllowsAccess(t *testing.T) {
	reader := &fakeMembershipReader{status: "past_due", hasActive: true, err: nil}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestRequireActiveMembership_ExpiredStatus_Returns403(t *testing.T) {
	reader := &fakeMembershipReader{status: "expired", hasActive: false, err: nil}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)

	// Verify the error body contains MEMBERSHIP_REQUIRED code
	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	dec := json.NewDecoder(resp.Body)
	require.NoError(t, dec.Decode(&errResp))
	require.Equal(t, "MEMBERSHIP_REQUIRED", errResp.Error.Code)
}

func TestRequireActiveMembership_CancelledStatus_Returns403(t *testing.T) {
	reader := &fakeMembershipReader{status: "cancelled", hasActive: false, err: nil}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	dec := json.NewDecoder(resp.Body)
	require.NoError(t, dec.Decode(&errResp))
	require.Equal(t, "MEMBERSHIP_REQUIRED", errResp.Error.Code)
}

func TestRequireActiveMembership_NoMembership_Returns403(t *testing.T) {
	// Reader reports no membership via AppError - middleware should 403, not pass through
	reader := &fakeMembershipReader{status: "", hasActive: false, err: &errors.AppError{"membership not found", "membership not found", fiber.StatusForbidden}}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	dec := json.NewDecoder(resp.Body)
	require.NoError(t, dec.Decode(&errResp))
	require.Equal(t, "MEMBERSHIP_REQUIRED", errResp.Error.Code)
}

func TestRequireActiveMembership_ReaderInfraError_Returns500(t *testing.T) {
	// Use a plain error for infra failure
	reader := &fakeMembershipReader{status: "", hasActive: false, err: fmt.Errorf("database connection failed")}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusInternalServerError, resp.StatusCode)

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	dec := json.NewDecoder(resp.Body)
	require.NoError(t, dec.Decode(&errResp))
	require.Equal(t, "INTERNAL_ERROR", errResp.Error.Code)
}

func TestRequireActiveMembership_UnknownStatus_Returns403(t *testing.T) {
	reader := &fakeMembershipReader{status: "unknown", hasActive: false, err: nil}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	dec := json.NewDecoder(resp.Body)
	require.NoError(t, dec.Decode(&errResp))
	require.Equal(t, "MEMBERSHIP_REQUIRED", errResp.Error.Code)
}

func TestRequireActiveMembership_EmptyStatus_Returns403(t *testing.T) {
	reader := &fakeMembershipReader{status: "", hasActive: false, err: nil}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	dec := json.NewDecoder(resp.Body)
	require.NoError(t, dec.Decode(&errResp))
	require.Equal(t, "MEMBERSHIP_REQUIRED", errResp.Error.Code)
}

// TestRequireActiveMembership_ReaderNotFoundError_Returns403 reproduces the
// defect where a "membership not found" error from the reader (e.g. no
// membership exists) was mapped to 500 INTERNAL_ERROR instead of failing
// closed to 403 MEMBERSHIP_REQUIRED.
func TestRequireActiveMembership_ReaderNotFoundError_Returns403(t *testing.T) {
	reader := &fakeMembershipReader{status: "", hasActive: false, err: errors.NotFound("Membership", "athlete-1")}
	mw := middleware.RequireActiveMembership(reader)

	app := fiber.New()
	app.Use(setAthleteID(t, "athlete-1"))
	app.Use(mw)

	req := httptest.NewRequest("GET", "/athletes/membership/status", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	require.Equal(t, fiber.StatusForbidden, resp.StatusCode)

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	dec := json.NewDecoder(resp.Body)
	require.NoError(t, dec.Decode(&errResp))
	require.Equal(t, "MEMBERSHIP_REQUIRED", errResp.Error.Code)
}