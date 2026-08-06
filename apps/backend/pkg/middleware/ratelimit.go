package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog"
)

type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.Mutex
	rate     int
	window   time.Duration
	logger   *zerolog.Logger
	cleanup  *time.Ticker
	stopCh   chan struct{}
}

type visitor struct {
	lastSeen time.Time
	count    int
}

func NewRateLimiter(rate int, window time.Duration, logger *zerolog.Logger) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		window:   window,
		logger:   logger,
		cleanup:  time.NewTicker(1 * time.Minute),
		stopCh:   make(chan struct{}),
	}

	go rl.cleanupLoop()
	return rl
}

func (rl *RateLimiter) cleanupLoop() {
	for {
		select {
		case <-rl.cleanup.C:
			rl.mu.Lock()
			now := time.Now()
			for ip, v := range rl.visitors {
				if now.Sub(v.lastSeen) > rl.window*2 {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		case <-rl.stopCh:
			rl.cleanup.Stop()
			return
		}
	}
}

func (rl *RateLimiter) Stop() {
	close(rl.stopCh)
}

func (rl *RateLimiter) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		now := time.Now()

		rl.mu.Lock()
		v, exists := rl.visitors[ip]
		if !exists {
			rl.visitors[ip] = &visitor{lastSeen: now, count: 1}
			rl.mu.Unlock()
			return c.Next()
		}

		if now.Sub(v.lastSeen) > rl.window {
			v.count = 1
			v.lastSeen = now
			rl.mu.Unlock()
			return c.Next()
		}

		v.count++
		v.lastSeen = now

		if v.count > rl.rate {
			rl.mu.Unlock()
			rl.logger.Warn().
				Str("ip", ip).
				Int("count", v.count).
				Int("limit", rl.rate).
				Msg("rate limit exceeded")
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "rate limit exceeded",
				"code":  "rate_limit_exceeded",
			})
		}
		rl.mu.Unlock()

		c.Set("X-RateLimit-Limit", string(rune(rl.rate)))
		c.Set("X-RateLimit-Remaining", string(rune(rl.rate - v.count)))
		return c.Next()
	}
}
