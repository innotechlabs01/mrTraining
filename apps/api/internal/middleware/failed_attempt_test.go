package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// setupFailedAttemptTestApp creates a Fiber app with FailedAttemptLockout.
// The test handler returns 400 when the X-Test-Fail header is set, 200
// otherwise. X-Forwarded-For is trusted so c.IP() reflects the forwarded IP.
func setupFailedAttemptTestApp() *fiber.App {
	app := fiber.New(fiber.Config{
		EnableTrustedProxyCheck: true,
		ProxyHeader:             fiber.HeaderXForwardedFor,
		TrustedProxies: []string{
			"127.0.0.1/32",
			"0.0.0.0/0",
		},
	})
	app.Use(middleware.FailedAttemptLockout())

	app.Post("/test", func(c *fiber.Ctx) error {
		if c.Get("X-Test-Fail") == "1" {
			return c.Status(fiber.StatusBadRequest).SendString("failed")
		}
		return c.SendStatus(fiber.StatusOK)
	})

	return app
}

func reqWithIP(app *fiber.App, method, path, ip string, fail bool) (*http.Response, error) {
	req := httptest.NewRequest(method, path, nil)
	if ip != "" {
		req.Header.Set("X-Forwarded-For", ip)
	}
	if fail {
		req.Header.Set("X-Test-Fail", "1")
	}
	return app.Test(req)
}

// TestFailedAttemptLockout_LockoutAfterMaxFailures verifies that after
// maxFailures consecutive failed attempts from the same IP, the IP is locked
// out and further requests are rejected with 429 + Retry-After.
func TestFailedAttemptLockout_LockoutAfterMaxFailures(t *testing.T) {
	app := setupFailedAttemptTestApp()
	const ip = "10.0.0.1"

	// 5 consecutive failures → lockout on the 5th.
	for i := 0; i < 5; i++ {
		resp, err := reqWithIP(app, "POST", "/test", ip, true)
		if err != nil {
			t.Fatalf("request %d: failed to execute: %v", i+1, err)
		}
		if resp.StatusCode != fiber.StatusBadRequest {
			t.Fatalf("request %d: expected 400, got %d", i+1, resp.StatusCode)
		}
	}

	// The 6th request should be locked out.
	resp, err := reqWithIP(app, "POST", "/test", ip, false)
	if err != nil {
		t.Fatalf("locked-out request: failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusTooManyRequests {
		t.Fatalf("expected 429 after lockout, got %d", resp.StatusCode)
	}
	if retryAfter := resp.Header.Get("Retry-After"); retryAfter == "" {
		t.Error("expected Retry-After header on lockout")
	}
}

// TestFailedAttemptLockout_SuccessClearsFailures verifies that a successful
// response clears the failure counter, so the IP is not locked out
// prematurely.
func TestFailedAttemptLockout_SuccessClearsFailures(t *testing.T) {
	app := setupFailedAttemptTestApp()
	const ip = "10.0.0.2"

	// 3 failures, then a success → counter resets to 0.
	for i := 0; i < 3; i++ {
		resp, err := reqWithIP(app, "POST", "/test", ip, true)
		if err != nil {
			t.Fatalf("failure request %d: failed to execute: %v", i+1, err)
		}
		if resp.StatusCode != fiber.StatusBadRequest {
			t.Fatalf("failure request %d: expected 400, got %d", i+1, resp.StatusCode)
		}
	}
	resp, err := reqWithIP(app, "POST", "/test", ip, false)
	if err != nil {
		t.Fatalf("success request: failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("success request: expected 200, got %d", resp.StatusCode)
	}

	// After the reset, 5 more failures must NOT lock out on the failure
	// responses themselves (the lockout is recorded after the response, so
	// the 5th failure still returns 400). The lockout applies to the next
	// request.
	for i := 0; i < 5; i++ {
		resp, err := reqWithIP(app, "POST", "/test", ip, true)
		if err != nil {
			t.Fatalf("post-reset failure %d: failed to execute: %v", i+1, err)
		}
		if resp.StatusCode != fiber.StatusBadRequest {
			t.Fatalf("post-reset failure %d: expected 400, got %d", i+1, resp.StatusCode)
		}
	}

	// The request after the 5th post-reset failure is locked out.
	resp, err = reqWithIP(app, "POST", "/test", ip, false)
	if err != nil {
		t.Fatalf("post-reset locked-out: failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusTooManyRequests {
		t.Fatalf("expected 429 after 5 post-reset failures, got %d", resp.StatusCode)
	}
	if retryAfter := resp.Header.Get("Retry-After"); retryAfter == "" {
		t.Error("expected Retry-After header on post-reset lockout")
	}
}

// TestFailedAttemptLockout_PerIPIsolation verifies that failures from one IP
// do not affect another IP.
func TestFailedAttemptLockout_PerIPIsolation(t *testing.T) {
	app := setupFailedAttemptTestApp()

	// Exhaust IP A with 5 failures.
	for i := 0; i < 5; i++ {
		resp, err := reqWithIP(app, "POST", "/test", "10.0.1.1", true)
		if err != nil {
			t.Fatalf("ip A failure %d: failed to execute: %v", i+1, err)
		}
		if resp.StatusCode != fiber.StatusBadRequest {
			t.Fatalf("ip A failure %d: expected 400, got %d", i+1, resp.StatusCode)
		}
	}

	// IP A is locked out.
	resp, err := reqWithIP(app, "POST", "/test", "10.0.1.1", false)
	if err != nil {
		t.Fatalf("ip A locked-out: failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusTooManyRequests {
		t.Fatalf("ip A: expected 429, got %d", resp.StatusCode)
	}

	// IP B is unaffected.
	resp, err = reqWithIP(app, "POST", "/test", "10.0.1.2", false)
	if err != nil {
		t.Fatalf("ip B: failed to execute: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("ip B: expected 200, got %d", resp.StatusCode)
	}
}
