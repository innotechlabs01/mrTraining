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
	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

// contextKey type for context values to avoid collisions.
type contextKey string

const (
	// UserIDKey is the context key for the authenticated user's ID.
	UserIDKey contextKey = "user_id"
	// UserEmailKey is the context key for the authenticated user's email.
	UserEmailKey contextKey = "user_email"
	// UserRoleKey is the context key for the authenticated user's role.
	UserRoleKey contextKey = "user_role"
	// SessionClaimsKey is the context key for the full Clerk session claims.
	SessionClaimsKey contextKey = "session_claims"
)

// roleCache caches Clerk user roles to avoid API calls on every request.
var (
	roleCacheMu sync.RWMutex
	roleCache   = make(map[string]roleCacheEntry)
)

type roleCacheEntry struct {
	role      string
	expiresAt time.Time
}

const roleCacheTTL = 5 * time.Minute

func getCachedRole(userID string) (string, bool) {
	roleCacheMu.RLock()
	defer roleCacheMu.RUnlock()
	entry, ok := roleCache[userID]
	if !ok || time.Now().After(entry.expiresAt) {
		return "", false
	}
	return entry.role, true
}

func setCachedRole(userID, role string) {
	roleCacheMu.Lock()
	defer roleCacheMu.Unlock()
	roleCache[userID] = roleCacheEntry{
		role:      role,
		expiresAt: time.Now().Add(roleCacheTTL),
	}
}

// fetchUserRole fetches the user's role from Clerk Backend API.
func fetchUserRole(userID string) string {
	u, err := user.Get(context.Background(), userID)
	if err != nil {
		return "athlete"
	}
	if u.PublicMetadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(u.PublicMetadata, &metadata); err == nil {
			if role, ok := metadata["role"].(string); ok && role != "" {
				setCachedRole(userID, role)
				return role
			}
		}
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
		claims, err := jwt.Verify(context.Background(), &jwt.VerifyParams{
			Token: token,
		})
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
			if cached, ok := getCachedRole(userID); ok {
				role = cached
			} else {
				role = fetchUserRole(userID)
			}
		}

		// Store values in Fiber context for downstream handlers
		c.Locals(string(UserIDKey), userID)
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
