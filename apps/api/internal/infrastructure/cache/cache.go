// Package cache provides a cache-aside abstraction for hot read paths.
//
// The Cache interface is the seam between the application and any concrete
// backend (Redis in production, in-memory fake in tests). Implementations
// MUST fail open: a cache error is a miss, never a request failure.
package cache

import (
	"context"
	"time"
)

// Cache is the minimal key/value contract needed for response caching.
// Byte values keep the abstraction backend-agnostic — the middleware owns
// serialization, not the cache.
type Cache interface {
	// Get returns the cached value and true on hit. A miss returns (nil, false).
	// Errors from the underlying backend are surfaced as a miss (fail-open).
	Get(ctx context.Context, key string) ([]byte, bool)

	// Set stores a value under key with the given TTL. Errors are swallowed by
	// the caller (best-effort caching).
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error

	// Del removes one or more keys. Used for explicit invalidation on writes.
	Del(ctx context.Context, keys ...string) error

	// DelByPrefix removes every key sharing the given prefix. Used to
	// invalidate a whole domain (e.g. all product entries) on a write.
	DelByPrefix(ctx context.Context, keyPrefix string) error
}

// noopCache is a disabled cache: every Get is a miss, writes are no-ops.
// Used when REDIS_URL is unset so the middleware stays a transparent pass-through.
type noopCache struct{}

// NewNoop returns a Cache that never hits and never stores.
func NewNoop() Cache { return noopCache{} }

func (noopCache) Get(context.Context, string) ([]byte, bool) { return nil, false }
func (noopCache) Set(context.Context, string, []byte, time.Duration) error {
	return nil
}
func (noopCache) Del(context.Context, ...string) error { return nil }
func (noopCache) DelByPrefix(context.Context, string) error {
	return nil
}
