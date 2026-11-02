// Package middleware provides Fiber HTTP middleware for cross-cutting concerns.
package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ipWindow tracks request timestamps for a single client IP.
type ipWindow struct {
	timestamps []time.Time
}

// RateLimitConfig holds configuration for the rate limiter.
type RateLimitConfig struct {
	MaxRequests int
	Window      time.Duration
}

// rateLimiter implements an in-memory sliding window rate limiter per IP.
type rateLimiter struct {
	mu      sync.Mutex
	clients map[string]*ipWindow
	config  RateLimitConfig
}

// newRateLimiter creates a rate limiter with the given configuration.
func newRateLimiter(cfg RateLimitConfig) *rateLimiter {
	rl := &rateLimiter{
		clients: make(map[string]*ipWindow),
		config:  cfg,
	}

	// Background cleanup prevents unbounded memory growth from
	// IPs that stop sending requests but whose entries linger.
	go rl.cleanup()

	return rl
}

// allow checks whether the given IP is within the rate limit.
// Returns (allowed, limit, remaining, resetTime).
func (rl *rateLimiter) allow(ip string) (bool, int, int, time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.config.Window)

	w, exists := rl.clients[ip]
	if !exists {
		w = &ipWindow{}
		rl.clients[ip] = w
	}

	// Prune timestamps outside the current window.
	valid := make([]time.Time, 0, len(w.timestamps))
	for _, ts := range w.timestamps {
		if ts.After(windowStart) {
			valid = append(valid, ts)
		}
	}
	w.timestamps = valid

	remaining := rl.config.MaxRequests - len(w.timestamps)
	if remaining <= 0 {
		// Earliest request in window determines when the limit resets.
		resetTime := w.timestamps[0].Add(rl.config.Window)
		return false, rl.config.MaxRequests, 0, resetTime
	}

	w.timestamps = append(w.timestamps, now)
	return true, rl.config.MaxRequests, remaining - 1, time.Time{}
}

// cleanup periodically removes stale IP entries to prevent memory leaks.
// Runs every 60 seconds and removes entries with no recent requests.
func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		windowStart := time.Now().Add(-rl.config.Window)
		for ip, w := range rl.clients {
			if len(w.timestamps) == 0 || w.timestamps[len(w.timestamps)-1].Before(windowStart) {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit returns middleware that limits requests per IP using an in-memory
// sliding window algorithm. Returns 429 Too Many Requests with Retry-After
// when the limit is exceeded.
//
// Default: 100 requests per 60 seconds per IP.
func RateLimit(maxRequests int, windowSeconds int) fiber.Handler {
	rl := newRateLimiter(RateLimitConfig{
		MaxRequests: maxRequests,
		Window:      time.Duration(windowSeconds) * time.Second,
	})

	return func(c *fiber.Ctx) error {
		ip := c.IP()

		allowed, limit, remaining, resetTime := rl.allow(ip)

		// Always set rate limit headers so clients can self-throttle.
		c.Set("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

		if !allowed {
			retryAfter := int(time.Until(resetTime).Seconds()) + 1
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Set("Retry-After", strconv.Itoa(retryAfter))
			c.Set("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))
			return fiber.NewError(
				fiber.StatusTooManyRequests,
				"rate limit exceeded, try again later",
			)
		}

		return c.Next()
	}
}
