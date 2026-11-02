// Package middleware provides Fiber HTTP middleware for cross-cutting concerns.
package middleware

import (
	"context"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gofiber/fiber/v2"
	fiberws "github.com/gofiber/websocket/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

// WSAuth returns Fiber middleware that authenticates WebSocket connections
// via a Clerk JWT token sent as a query parameter.
//
// The client must connect with:
//
//	ws://host/ws?token=<clerk_jwt>
//
// On success, the user ID is stored in the Fiber context (accessible via
// GetUserID) and c.Next() is called so the next handler can upgrade.
func WSAuth(clerkSecretKey string) fiber.Handler {
	// Ensure Clerk key is set for JWT verification.
	if clerkSecretKey != "" {
		clerk.SetKey(clerkSecretKey)
	}

	return func(c *fiber.Ctx) error {
		// Only allow WebSocket upgrade connections.
		if !fiberws.IsWebSocketUpgrade(c) {
			return fiber.NewError(fiber.StatusBadRequest, "websocket upgrade required")
		}

		// Extract token from query parameter.
		token := c.Query("token")
		if token == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing token query parameter")
		}

		// Verify the Clerk JWT.
		claims, err := jwt.Verify(context.Background(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			logger.L().Warn("websocket auth failed", zap.Error(err))
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		}

		userID := claims.Subject
		if userID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "token missing subject claim")
		}

		// Extract role: prefer organization role, fall back to default.
		role := "athlete"
		if claims.ActiveOrganizationRole != "" {
			role = strings.TrimPrefix(claims.ActiveOrganizationRole, "org:")
		}

		// Store values in context so downstream handlers can access them.
		c.Locals(string(UserIDKey), userID)
		c.Locals(string(UserRoleKey), role)
		c.Locals(string(SessionClaimsKey), claims)

		return c.Next()
	}
}
