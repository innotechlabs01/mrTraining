package middleware

import (
	"fmt"
	"strings"

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

// RequireAlly returns middleware that requires the ally role.
// Also allows admin and super_admin roles.
func RequireAlly() fiber.Handler {
	return RequireRole("ally", "admin", "super_admin")
}

// RequireAdmin returns middleware that requires admin or super_admin role.
func RequireAdmin() fiber.Handler {
	return RequireRole("admin", "super_admin")
}

// RequireSuperAdmin returns middleware that requires the super_admin role only.
func RequireSuperAdmin() fiber.Handler {
	return RequireRole("super_admin")
}

// platformSuperAdminIDs splits comma/newline separated Clerk IDs into a
// normalized (trimmed, non-empty, de-duplicated) list.
func platformSuperAdminIDs(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

// parsePlatformSuperAdminIDs normalizes the various ways callers may supply the
// allowlist: a single comma-separated string, a []string, or a variadic
// collection of strings/slices.
func parsePlatformSuperAdminIDs(values ...interface{}) []string {
	out := make([]string, 0)
	seen := make(map[string]struct{})
	add := func(value string) {
		for _, id := range platformSuperAdminIDs(value) {
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			out = append(out, id)
		}
	}

	for _, value := range values {
		switch v := value.(type) {
		case nil:
			// ignored
		case string:
			add(v)
		case []string:
			for _, item := range v {
				add(item)
			}
		case []interface{}:
			for _, item := range v {
				if s, ok := item.(string); ok {
					add(s)
				}
			}
		default:
			add(strings.TrimSpace(fmt.Sprint(v)))
		}
	}
	return out
}

// RequirePlatformSuperAdmin returns Fiber middleware that allows only requests
// whose authenticated Clerk user ID appears in the supplied allowlist.
//
// The allowlist may be passed as a comma-separated string, a []string, or
// individual string arguments. When the allowlist is empty, no request is
// allowed (fail-closed).
func RequirePlatformSuperAdmin(allowed ...interface{}) fiber.Handler {
	allowedIDs := parsePlatformSuperAdminIDs(allowed...)
	allowedSet := make(map[string]struct{}, len(allowedIDs))
	for _, id := range allowedIDs {
		allowedSet[id] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "unauthenticated")
		}
		if _, ok := allowedSet[userID]; !ok {
			return fiber.NewError(fiber.StatusForbidden, "platform super admin access required")
		}
		return c.Next()
	}
}