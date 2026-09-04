// Cache middleware provides cache-aside response caching for hot read paths.
//
// The cache store is injected once at startup via SetCache. When unset (or set
// to cache.Nop), the middleware is a transparent pass-through. All cache
// operations fail open — a cache outage never breaks a request.
package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

// store is the process-wide cache backend. SetCache injects it at startup;
// the default is a no-op so the middleware stays safe before init and in tests.
var store cache.Cache = cache.NewNoop()

// SetCache injects the concrete cache backend. It must be called once at
// startup (before any request is served). Pass nil to disable caching.
func SetCache(c cache.Cache) {
	if c == nil {
		store = cache.NewNoop()
		return
	}
	store = c
}

// cachedEntry is the wire format persisted in the cache. It captures enough to
// replay a byte-identical response on a hit.
type cachedEntry struct {
	Status      int    `json:"status"`
	ContentType string `json:"content_type"`
	Body        []byte `json:"body"`
}

// Cache returns a Fiber handler that caches successful GET responses scoped to
// the authenticated user. User scoping guarantees one user can never observe
// another user's cached payload for per-user data.
func Cache(ttl time.Duration, prefix string) fiber.Handler {
	return cacheMiddleware(ttl, prefix)
}

// InvalidateCache flushes every cached entry in the given domain prefix.
// Write handlers MUST call this after Create/Update/Delete so readers never
// observe stale data. It is safe to call even when caching is disabled.
func InvalidateCache(prefix string) {
	if err := store.DelByPrefix(context.Background(), "cache:v1:"+prefix+":"); err != nil {
		logger.L().Warn("cache invalidation failed",
			zap.String("prefix", prefix),
			zap.Error(err),
		)
	}
}

func cacheMiddleware(ttl time.Duration, prefix string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Only cache safe GET reads.
		if c.Method() != fiber.MethodGet {
			return c.Next()
		}

		key := buildKey(prefix, c)

		// Hit: replay cached response and short-circuit the handler.
		if raw, ok := store.Get(c.Context(), key); ok {
			if entry, ok := decode(raw); ok {
				c.Set("X-Cache", "HIT")
				c.Response().Header.SetContentType(entry.ContentType)
				c.Response().SetBody(entry.Body)
				return c.Status(entry.Status).Send(entry.Body)
			}
		}

		// Miss: run the handler, then cache a successful response.
		if err := c.Next(); err != nil {
			return err
		}

		status := c.Response().StatusCode()
		if status < 200 || status >= 300 {
			return nil // never cache error/redirect responses
		}

		entry := cachedEntry{
			Status:      status,
			ContentType: string(c.Response().Header.ContentType()),
			Body:        copyBytes(c.Response().Body()),
		}

		if raw, err := json.Marshal(entry); err == nil {
			if err := store.Set(c.Context(), key, raw, ttl); err != nil {
				logger.L().Warn("cache set failed",
					zap.String("key", key),
					zap.Error(err),
				)
			}
		}

		c.Set("X-Cache", "MISS")
		return nil
	}
}

// buildKey builds a stable, length-bounded cache key from the route prefix and
// the raw request path + query, folded with the authenticated user ID so
// per-user data is never shared across users.
func buildKey(prefix string, c *fiber.Ctx) string {
	raw := prefix + "|" + c.Path()
	if q := c.Request().URI().QueryString(); len(q) > 0 {
		raw += "|" + string(q)
	}
	if uid, ok := c.Locals(string(UserIDKey)).(string); ok {
		raw += "|u:" + uid
	}

	sum := sha256.Sum256([]byte(raw))
	return "cache:v1:" + prefix + ":" + hex.EncodeToString(sum[:])
}

func decode(raw []byte) (cachedEntry, bool) {
	var e cachedEntry
	if err := json.Unmarshal(raw, &e); err != nil {
		return e, false
	}
	return e, true
}

// copyBytes returns a defensive copy of b (fasthttp reuses its response buffer).
func copyBytes(b []byte) []byte {
	out := make([]byte, len(b))
	copy(out, b)
	return out
}
