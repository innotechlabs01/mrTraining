package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// RequireRole returns Fiber middleware that checks if the authenticated user
// has one of the allowed roles. Must be used after RequireAuth middleware.
//
// Returns 403 Forbidden if the user's role does not match any of the provided roles.
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := GetUserRole(c)

		for _, role := range roles {
			if userRole == role {
				return c.Next()
			}
		}

		return fiber.NewError(fiber.StatusForbidden, "insufficient permissions")
	}
}

// RequireCoach returns middleware that requires the coach role.
// Also allows admin and super_admin roles.
func RequireCoach() fiber.Handler {
	return RequireRole("coach", "admin", "super_admin")
}

// RequireAthlete returns middleware that requires the athlete role.
// Also allows admin and super_admin roles.
func RequireAthlete() fiber.Handler {
	return RequireRole("athlete", "admin", "super_admin")
}

// RequireAdmin returns middleware that requires admin or super_admin role.
func RequireAdmin() fiber.Handler {
	return RequireRole("admin", "super_admin")
}

// RequireSuperAdmin returns middleware that requires the super_admin role only.
func RequireSuperAdmin() fiber.Handler {
	return RequireRole("super_admin")
}
