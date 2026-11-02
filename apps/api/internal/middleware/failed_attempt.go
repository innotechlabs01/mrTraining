// Package middleware provides Fiber HTTP middleware for cross-cutting concerns.
package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

// attemptStore tracks consecutive failed authentication attempts per client IP
// and enforces a temporary lockout after a threshold is reached. It is used to
// protect endpoints whose secret space is small enough to brute-force, such as
// coach invite codes (MR-XXXX).
type attemptStore struct {
	mu       sync.Mutex
	failures map[string]int      // IP -> consecutive failure count
	lockouts map[string]time.Time // IP -> lockout expiry time
}

var (
	// defaultAttemptStore is the process-wide store used by FailedAttemptLockout.
	defaultAttemptStore = &attemptStore{
		failures: make(map[string]int),
		lockouts: make(map[string]time.Time),
	}

	// maxFailures is the number of consecutive failed attempts before lockout.
	maxFailures = 5
	// lockoutDuration is how long a locked-out IP is blocked.
	lockoutDuration = 15 * time.Minute
)

func (s *attemptStore) isLockedOut(ip string) (bool, time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	until, ok := s.lockouts[ip]
	if !ok {
		return false, 0
	}
	if time.Now().After(until) {
		delete(s.lockouts, ip)
		return false, 0
	}
	return true, time.Until(until)
}

func (s *attemptStore) recordFailure(ip string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.failures[ip]++
	return s.failures[ip]
}

func (s *attemptStore) setLockout(ip string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lockouts[ip] = time.Now().Add(lockoutDuration)
	delete(s.failures, ip)
}

func (s *attemptStore) reset(ip string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.failures, ip)
	delete(s.lockouts, ip)
}

// FailedAttemptLockout returns middleware that enforces a temporary lockout
// after repeated failed attempts from the same IP.
//
// Before the handler runs, requests from a locked-out IP are rejected with
// 429 Too Many Requests and a Retry-After header. After the handler runs, if
// the response indicates a failed attempt (400/401/403), the failure is
// recorded for that IP. After maxFailures consecutive failures the IP is
// locked out for lockoutDuration. A successful response (200) clears the
// failure counter for that IP.
//
// It is intended for sensitive endpoints such as invite acceptance and
// validation, where the coach code space (MR-XXXX) is small enough to be
// brute-forced.
func FailedAttemptLockout() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()

		locked, until := defaultAttemptStore.isLockedOut(ip)
		if locked {
			retryAfter := int(until.Seconds()) + 1
			c.Set("Retry-After", strconv.Itoa(retryAfter))
			return fiber.NewError(
				fiber.StatusTooManyRequests,
				"too many failed attempts, try again later",
			)
		}

		err := c.Next()

		status := c.Response().StatusCode()
		switch {
		case status == fiber.StatusBadRequest || status == fiber.StatusUnauthorized || status == fiber.StatusForbidden:
			count := defaultAttemptStore.recordFailure(ip)
			if count >= maxFailures {
				defaultAttemptStore.setLockout(ip)
			}
		case status == fiber.StatusOK:
			defaultAttemptStore.reset(ip)
		}

		return err
	}
}
