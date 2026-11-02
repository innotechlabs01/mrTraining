package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	miniredis "github.com/alicebob/miniredis/v2"
	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
)

// setUser is a test middleware that simulates RequireAuth by stamping user_id.
func setUser(id string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Locals(string(UserIDKey), id)
		return c.Next()
	}
}

func setupCache(t *testing.T) cache.Cache {
	t.Helper()
	mr := miniredis.RunT(t)
	rc, err := cache.NewRedis(mr.Addr())
	if err != nil {
		t.Fatalf("NewRedis: %v", err)
	}
	t.Cleanup(func() { rc.Close() })
	return rc
}

func TestCacheHitThenMiss(t *testing.T) {
	SetCache(setupCache(t))
	defer SetCache(nil)

	var calls int32
	app := fiber.New()
	app.Get("/cache-test", setUser("user-1"), Cache(time.Minute, "test"), func(c *fiber.Ctx) error {
		atomic.AddInt32(&calls, 1)
		return c.JSON(fiber.Map{"n": atomic.LoadInt32(&calls)})
	})

	// First request: cache miss, handler runs once.
	resp1, err := app.Test(httptest.NewRequest("GET", "/cache-test", nil))
	if err != nil {
		t.Fatalf("req1: %v", err)
	}
	if resp1.Header.Get("X-Cache") != "MISS" {
		t.Fatalf("req1 X-Cache=%q want MISS", resp1.Header.Get("X-Cache"))
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("handler calls after req1 = %d want 1", got)
	}

	// Second request: cache hit, handler NOT called again.
	resp2, err := app.Test(httptest.NewRequest("GET", "/cache-test", nil))
	if err != nil {
		t.Fatalf("req2: %v", err)
	}
	if resp2.Header.Get("X-Cache") != "HIT" {
		t.Fatalf("req2 X-Cache=%q want HIT", resp2.Header.Get("X-Cache"))
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("handler calls after req2 = %d want 1 (must not re-run on hit)", got)
	}

	// Bodies must match exactly (replayed cached bytes).
	b1 := readBody(t, resp1)
	b2 := readBody(t, resp2)
	if !bytes.Equal(b1, b2) {
		t.Fatalf("replayed body differs:\n miss=%s\n hit=%s", b1, b2)
	}
}

func TestCacheScopedByUser(t *testing.T) {
	SetCache(setupCache(t))
	defer SetCache(nil)

	var calls int32
	app := fiber.New()
	app.Get("/scoped", setUser("u1"), Cache(time.Minute, "scoped"), func(c *fiber.Ctx) error {
		v := atomic.AddInt32(&calls, 1)
		return c.JSON(fiber.Map{"n": v})
	})
	app.Test(httptest.NewRequest("GET", "/scoped", nil))
	app.Test(httptest.NewRequest("GET", "/scoped", nil))
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("same-user repeat calls=%d want 1 (cached)", got)
	}
}

func TestCacheOnlyGET(t *testing.T) {
	SetCache(setupCache(t))
	defer SetCache(nil)

	var calls int32
	app := fiber.New()
	app.Post("/post", Cache(time.Minute, "post"), func(c *fiber.Ctx) error {
		atomic.AddInt32(&calls, 1)
		return c.SendStatus(fiber.StatusCreated)
	})

	// POST must never be cached and never set X-Cache.
	req := httptest.NewRequest("POST", "/post", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("POST: %v", err)
	}
	if resp.Header.Get("X-Cache") != "" {
		t.Fatalf("POST X-Cache=%q want empty", resp.Header.Get("X-Cache"))
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("POST calls=%d want 1 (never cached)", got)
	}
}

func TestCacheInvalidateByPrefix(t *testing.T) {
	SetCache(setupCache(t))
	defer SetCache(nil)

	var calls int32
	app := fiber.New()
	app.Get("/inv", setUser("u1"), Cache(time.Minute, "products"), func(c *fiber.Ctx) error {
		atomic.AddInt32(&calls, 1)
		return c.JSON(fiber.Map{"n": atomic.LoadInt32(&calls)})
	})

	app.Test(httptest.NewRequest("GET", "/inv", nil))
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("after prime calls=%d want 1", got)
	}

	// Invalidate the products domain prefix -> next GET must be a miss.
	middlewareInvalidate("products")

	resp, err := app.Test(httptest.NewRequest("GET", "/inv", nil))
	if err != nil {
		t.Fatalf("req after invalidate: %v", err)
	}
	if resp.Header.Get("X-Cache") != "MISS" {
		t.Fatalf("after invalidate X-Cache=%q want MISS (entry cleared)", resp.Header.Get("X-Cache"))
	}
	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Fatalf("after invalidate calls=%d want 2 (handler re-ran)", got)
	}
}

// middlewareInvalidate wraps the same invocation the write handlers use, so the
// test exercises the real exported seam rather than reaching into internals.
func middlewareInvalidate(prefix string) {
	InvalidateCache(prefix)
}

func TestCacheFailOpen(t *testing.T) {
	// NoopCache always misses -> handler always runs (transparent passthrough).
	SetCache(cache.NewNoop())
	defer SetCache(nil)

	var calls int32
	app := fiber.New()
	app.Get("/noop", Cache(time.Minute, "x"), func(c *fiber.Ctx) error {
		atomic.AddInt32(&calls, 1)
		return c.JSON(fiber.Map{"ok": true})
	})

	for i := 0; i < 3; i++ {
		resp, err := app.Test(httptest.NewRequest("GET", "/noop", nil))
		if err != nil {
			t.Fatalf("req %d: %v", i, err)
		}
		if resp.Header.Get("X-Cache") != "MISS" {
			t.Fatalf("req %d X-Cache=%q want MISS (noop always miss)", i, resp.Header.Get("X-Cache"))
		}
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Fatalf("noop calls=%d want 3 (always run through)", got)
	}
}

func readBody(t *testing.T, resp *http.Response) []byte {
	t.Helper()
	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read body: %v", err)
	}
	return buf.Bytes()
}
