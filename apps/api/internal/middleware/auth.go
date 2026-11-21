// Package middleware provides Fiber HTTP middleware for cross-cutting concerns.
package middleware

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
)

// contextKey type for context values to avoid collisions.
type contextKey string

const (
	// UserIDKey is the context key for the authenticated user's ID.
	UserIDKey contextKey = "user_id"
	// AthleteIDKey is the context key for the authenticated athlete's ID.
	// Memberships are keyed by the same ID as the user, so athlete_id mirrors user_id.
	AthleteIDKey contextKey = "athlete_id"
	// UserEmailKey is the context key for the authenticated user's email.
	UserEmailKey contextKey = "user_email"
	// UserRoleKey is the context key for the authenticated user's role.
	UserRoleKey contextKey = "user_role"
	// SessionClaimsKey is the context key for the full Clerk session claims.
	SessionClaimsKey contextKey = "session_claims"
)

// roleCache caches Clerk user roles to avoid API calls on every request.
var (
	roleCacheMu      sync.RWMutex
	roleCache        = make(map[string]roleCacheEntry)
	distRoleCache    cache.Cache
	roleFallbackMu   sync.RWMutex
	roleFallbackFn   func(context.Context, string) string
	roleFetchFlight  = resilience.NewFlight[string](4 * time.Second)
	clerkRoleBreaker = resilience.RegisterBreaker(resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
		Name:             "clerk_role",
		FailureThreshold: 5,
		ResetTimeout:     20 * time.Second,
	}))
)

// SetRoleCache attaches a distributed cache (e.g. Redis) for role lookups.
func SetRoleCache(c cache.Cache) {
	roleCacheMu.Lock()
	defer roleCacheMu.Unlock()
	distRoleCache = c
}

// SetRoleFallback registers a DB-backed fallback resolver used when Clerk is slow
// or its circuit breaker is open.
func SetRoleFallback(fn func(ctx context.Context, userID string) string) {
	roleFallbackMu.Lock()
	defer roleFallbackMu.Unlock()
	roleFallbackFn = fn
}

type roleCacheEntry struct {
	role      string
	expiresAt time.Time
}

const roleCacheTTL = 5 * time.Minute

func getCachedRole(ctx context.Context, userID string) (string, bool) {
	roleCacheMu.RLock()
	entry, ok := roleCache[userID]
	dc := distRoleCache
	roleCacheMu.RUnlock()
	if ok && time.Now().Before(entry.expiresAt) {
		return entry.role, true
	}
	if dc != nil {
		rcCtx, cancel := context.WithTimeout(ctx, 400*time.Millisecond)
		defer cancel()
		if raw, hit := dc.Get(rcCtx, "role:v1:"+userID); hit && len(raw) > 0 {
			r := string(raw)
			setLocalCachedRole(userID, r)
			return r, true
		}
	}
	return "", false
}

func setLocalCachedRole(userID, role string) {
	roleCacheMu.Lock()
	roleCache[userID] = roleCacheEntry{
		role:      role,
		expiresAt: time.Now().Add(roleCacheTTL),
	}
	roleCacheMu.Unlock()
}

func setCachedRole(ctx context.Context, userID, role string) {
	roleCacheMu.Lock()
	roleCache[userID] = roleCacheEntry{
		role:      role,
		expiresAt: time.Now().Add(roleCacheTTL),
	}
	dc := distRoleCache
	roleCacheMu.Unlock()

	if dc != nil && role != "" {
		rcCtx, cancel := context.WithTimeout(ctx, 400*time.Millisecond)
		defer cancel()
		_ = dc.Set(rcCtx, "role:v1:"+userID, []byte(role), roleCacheTTL)
	}
}

// InvalidateRoleCache drops the cached role for a user.
//
// It MUST be called whenever the role is written (coach activation, Clerk
// webhook) so the next request does not keep resolving the stale role for up
// to roleCacheTTL.
func InvalidateRoleCache(userID string) {
	if userID == "" {
		return
	}
	roleCacheMu.Lock()
	delete(roleCache, userID)
	dc := distRoleCache
	roleCacheMu.Unlock()

	if dc != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 400*time.Millisecond)
		defer cancel()
		_ = dc.Del(ctx, "role:v1:"+userID)
	}
}

// fetchUserRole fetches the user's role from Clerk Backend API with
// singleflight coalescing, bounded timeout, circuit breaker, and DB fallback.
func fetchUserRole(ctx context.Context, userID string) string {
	role, _, err := roleFetchFlight.Do(ctx, "clerk-role:"+userID, func(inner context.Context) (string, error) {
		res, cbErr := resilience.ExecuteVal(inner, clerkRoleBreaker, func(cbCtx context.Context) (string, error) {
			apiCtx, cancel := context.WithTimeout(cbCtx, 3*time.Second)
			defer cancel()
			u, getErr := user.Get(apiCtx, userID)
			if getErr != nil {
				return "", getErr
			}
			if u.PublicMetadata != nil {
				var metadata map[string]interface{}
				if jerr := json.Unmarshal(u.PublicMetadata, &metadata); jerr == nil {
					if r, ok := metadata["role"].(string); ok && r != "" {
						return r, nil
					}
				}
			}
			return "athlete", nil
		})
		if cbErr != nil {
			roleFallbackMu.RLock()
			fb := roleFallbackFn
			roleFallbackMu.RUnlock()
			if fb != nil {
				if fbRole := fb(inner, userID); fbRole != "" {
					return fbRole, nil
				}
			}
			return "", cbErr
		}
		return res, nil
	})
	if err == nil && role != "" {
		setCachedRole(ctx, userID, role)
		return role
	}
	return "athlete"
}

// RequireAuth returns Fiber middleware that validates Clerk JWT tokens.
// It extracts the Bearer token from the Authorization header, verifies it
// using Clerk's JWKS-based verification, and stores user claims in the Fiber context.
//
// The middleware sets the following context values via c.Locals():
//   - user_id: The Clerk user ID (sub claim)
//   - user_role: The user's role from organization claims or custom metadata (defaults to "athlete")
//   - session_claims: The full *clerk.SessionClaims object
//
// Note: Email is not available in JWT claims. Use the Clerk Backend API
// (user.Get) to fetch email when needed.
func RequireAuth(clerkSecretKey string) fiber.Handler {
	// Set the Clerk key globally for JWT verification.
	// This is safe to call multiple times; only the first call takes effect.
	clerk.SetKey(clerkSecretKey)

	return func(c *fiber.Ctx) error {
		// Extract Bearer token from Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing authorization header")
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			// No "Bearer " prefix found — format is invalid
			return fiber.NewError(fiber.StatusUnauthorized, "invalid authorization format, expected 'Bearer <token>'")
		}

		// Verify the JWT using Clerk's JWKS-based verification
		reqCtx := RequestContext(c)
		jwtCtx, cancel := context.WithTimeout(reqCtx, 3*time.Second)
		claims, err := jwt.Verify(jwtCtx, &jwt.VerifyParams{
			Token: token,
		})
		cancel()
		if err != nil {
			log := logger.L()
			log.Error("JWT verification failed", zap.Error(err), zap.String("token_preview", token[:min(20, len(token))]+"..."))
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}

		// Extract user ID from the subject claim
		userID := claims.Subject
		if userID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "token missing subject claim")
		}

		// Extract role: prefer organization role, fall back to custom claims, then Clerk API
		role := "athlete" // default role
		if claims.ActiveOrganizationRole != "" {
			// Clerk org roles are prefixed with "org:", strip it for app use
			role = strings.TrimPrefix(claims.ActiveOrganizationRole, "org:")
		} else if claims.Custom != nil {
			// Check custom claims for a role (set via Clerk public metadata in JWT)
			if customMap, ok := claims.Custom.(map[string]interface{}); ok {
				if metadata, ok := customMap["publicMetadata"].(map[string]interface{}); ok {
					if r, ok := metadata["role"].(string); ok && r != "" {
						role = r
					}
				}
			}
		}

		// If role is still default, try cache then Clerk API
		if role == "athlete" {
			if cached, ok := getCachedRole(reqCtx, userID); ok {
				role = cached
			} else {
				role = fetchUserRole(reqCtx, userID)
			}
		}

		// Store values in Fiber context for downstream handlers
		c.Locals(string(UserIDKey), userID)
		c.Locals(string(AthleteIDKey), userID)
		c.Locals(string(UserRoleKey), role)
		c.Locals(string(SessionClaimsKey), claims)

		return c.Next()
	}
}

// GetUserID extracts the authenticated user's ID from Fiber context.
// Returns empty string if not set (caller should check RequireAuth ran first).
func GetUserID(c *fiber.Ctx) string {
	id, _ := c.Locals(string(UserIDKey)).(string)
	return id
}

// GetUserEmail extracts the authenticated user's email from Fiber context.
// Returns empty string if not set. Note: email is not extracted from JWT claims;
// use the Clerk Backend API to fetch it.
func GetUserEmail(c *fiber.Ctx) string {
	email, _ := c.Locals(string(UserEmailKey)).(string)
	return email
}

// GetUserRole extracts the authenticated user's role from Fiber context.
// Returns empty string if not set.
func GetUserRole(c *fiber.Ctx) string {
	role, _ := c.Locals(string(UserRoleKey)).(string)
	return role
}

// GetSessionClaims extracts the full Clerk session claims from Fiber context.
// Returns nil if not set.
func GetSessionClaims(c *fiber.Ctx) *clerk.SessionClaims {
	claims, _ := c.Locals(string(SessionClaimsKey)).(*clerk.SessionClaims)
	return claims
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
