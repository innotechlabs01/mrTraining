// Package middleware provides Fiber HTTP middleware for cross-cutting concerns.
package middleware

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
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

// RedisScriptEvaluator captures the atomic Lua script evaluation subset of *redis.Client.
type RedisScriptEvaluator interface {
	Eval(ctx context.Context, script string, keys []string, args ...interface{}) *redis.Cmd
}

var (
	rateLimitRedisMu      sync.RWMutex
	rateLimitRedisCache   *cache.RedisCache
	rateLimitBackendMode  = "auto"
	rateLimitRedisBreaker = resilience.RegisterBreaker(resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
		Name:             "redis_ratelimit",
		FailureThreshold: 5,
		ResetTimeout:     10 * time.Second,
	}))
)

// SetRateLimitRedis configures a shared Redis cache backend for distributed
// rate limiting across API replicas (fail-open to local memory when Redis degrades).
func SetRateLimitRedis(rc *cache.RedisCache, backend string) {
	rateLimitRedisMu.Lock()
	rateLimitRedisCache = rc
	if backend != "" {
		rateLimitBackendMode = backend
	}
	rateLimitRedisMu.Unlock()
}

func getRateLimitRedis() (RedisScriptEvaluator, *resilience.CircuitBreaker) {
	rateLimitRedisMu.RLock()
	rc := rateLimitRedisCache
	mode := rateLimitBackendMode
	rateLimitRedisMu.RUnlock()
	if mode == "memory" || rc == nil || rc.Client() == nil {
		return nil, nil
	}
	return rc.Client(), rateLimitRedisBreaker
}

const slidingWindowLua = `
local current = redis.call("INCR", KEYS[1])
if tonumber(current) == 1 then
	redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local pttl = redis.call("PTTL", KEYS[1])
return {current, pttl}
`

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

func allowDistributed(ctx context.Context, eval RedisScriptEvaluator, cb *resilience.CircuitBreaker, bucketKey string, maxReq int, window time.Duration) (allowed bool, remaining int, reset time.Time, err error) {
	var count, pttlMs int64
	run := func(runCtx context.Context) error {
		opCtx, cancel := context.WithTimeout(runCtx, 250*time.Millisecond)
		defer cancel()
		res, evalErr := eval.Eval(opCtx, slidingWindowLua, []string{bucketKey}, window.Milliseconds()).Result()
		if evalErr != nil {
			return evalErr
		}
		vals, ok := res.([]interface{})
		if !ok || len(vals) < 2 {
			return nil
		}
		count = toInt64(vals[0])
		pttlMs = toInt64(vals[1])
		return nil
	}
	if cb != nil {
		err = cb.Execute(ctx, run)
	} else {
		err = run(ctx)
	}
	if err != nil {
		return false, 0, time.Time{}, err
	}
	if count <= int64(maxReq) {
		rem := maxReq - int(count)
		if rem < 0 {
			rem = 0
		}
		return true, rem, time.Time{}, nil
	}
	if pttlMs <= 0 {
		pttlMs = window.Milliseconds()
	}
	return false, 0, time.Now().Add(time.Duration(pttlMs) * time.Millisecond), nil
}

func toInt64(v interface{}) int64 {
	switch x := v.(type) {
	case int64:
		return x
	case int:
		return int64(x)
	case float64:
		return int64(x)
	default:
		return 0
	}
}

// RateLimit returns middleware that limits requests per IP using distributed Redis
// Lua atomic counters when configured, failing open to the local sliding window
// limiter on Redis outages.
func RateLimit(maxRequests int, windowSeconds int) fiber.Handler {
	return RateLimitWithEvaluator(maxRequests, windowSeconds, nil)
}

// RateLimitWithEvaluator constructs rate limiting middleware backed by eval when
// non-nil, or the process-wide Redis backend configured via SetRateLimitRedis.
func RateLimitWithEvaluator(maxRequests int, windowSeconds int, evalOverride RedisScriptEvaluator) fiber.Handler {
	window := time.Duration(windowSeconds) * time.Second
	rl := newRateLimiter(RateLimitConfig{
		MaxRequests: maxRequests,
		Window:      window,
	})
	scopePrefix := "rl:" + strconv.Itoa(maxRequests) + ":" + strconv.Itoa(windowSeconds) + ":"

	return func(c *fiber.Ctx) error {
		ip := c.IP()

		var allowed bool
		var limit = maxRequests
		var remaining int
		var resetTime time.Time
		usedRedis := false

		eval := evalOverride
		cb := rateLimitRedisBreaker
		if eval == nil {
			eval, cb = getRateLimitRedis()
		}
		if eval != nil {
			routeTag := "global"
			if r := c.Route(); r != nil && r.Path != "" {
				routeTag = r.Path
			}
			key := scopePrefix + routeTag + ":" + ip
			var rerr error
			allowed, remaining, resetTime, rerr = allowDistributed(RequestContext(c), eval, cb, key, maxRequests, window)
			if rerr == nil {
				usedRedis = true
			}
		}

		if !usedRedis {
			allowed, limit, remaining, resetTime = rl.allow(ip)
		}

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
