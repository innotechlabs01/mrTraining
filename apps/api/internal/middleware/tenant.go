package middleware

import (
	"context"

	"github.com/gofiber/fiber/v2"

	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CoachIDKey is the context key for the tenant coach owning the operation.
// Defined here (not in auth.go) because it is tenant-domain specific.
const CoachIDKey = "coach_id"

// Provisioner provisions missing coach/athlete profile rows for authenticated
// users whose Clerk webhook may have missed the initial provisioning event.
type Provisioner interface {
	// GetUser fetches identity data (email, name) from the auth provider.
	GetUser(ctx context.Context, userID string) (email, name string, err error)
	// EnsureCoach idempotently creates a coaches row for a coach user.
	EnsureCoach(ctx context.Context, userID, email, name string) error
}

// tenantError renders a consistent JSON error with the request id, following
// the same pattern as membershipError in membership.go.
func tenantError(c *fiber.Ctx, status int, code, message string) error {
	reqID, _ := c.Locals("request_id").(string)
	return c.Status(status).JSON(appresponse.ErrorResponse{
		Error:     appresponse.ErrorDetail{Code: code, Message: message},
		RequestID: reqID,
	})
}

// TenantResolver validates the user→coach relationship needed to establish
// the tenant context. It is a port so the middleware can be tested with a
// fake and stays decoupled from the infrastructure layer.
//
// Tenant model (decision 2026-11-02): the COACH is the tenant. There are no
// organizations. See docs/audits/MULTI_TENANT_DEPENDENCY_AUDIT.md §9.
type TenantResolver interface {
	// GetActiveCoachID returns the coach_id for an authenticated user that is
	// an ACTIVE coach (users.is_active = 1 AND coaches.is_active = 1 and the
	// coaches row id equals the user id). Returns ("", nil) when the user is
	// not an active coach — that is not an infrastructure error.
	GetActiveCoachID(ctx context.Context, userID string) (string, error)

	// AthleteHasActiveCoach reports whether an active coach_athlete_links row
	// exists between the athlete and the requested coach.
	AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error)
}

// coachIDHeader is the request header used by athletes to name the coach whose
// data the current operation targets. The coach is resolved PER OPERATION and
// validated against coach_athlete_links — never assigned permanently.
const coachIDHeader = "X-Coach-ID"

// RequireTenantContext resolves the tenant (coach) for the request and stores
// it in the Fiber context. It MUST run after RequireAuth.
//
// Resolution flow (decision 2026-11-02):
//
//	Coach authenticated:
//	  users.id == coaches.id with is_active = 1 → context coach = self.
//	  Inactive or missing coach row → auto-provision from Clerk, then set context.
//
//	Athlete authenticated:
//	  The coach comes from the X-Coach-ID header (or, for resource-scoped
//	  routes, the route parameter). The backend validates the ACTIVE
//	  relationship in coach_athlete_links before setting the context.
//	  An athlete related to coaches A and B gets INDEPENDENT contexts per
//	  operation — never a permanent coach assignment.
//	  If no X-Coach-ID header is present, coach context is simply NOT set
//	  (caller must check GetCoachID() before accessing coach-scoped data).
//
//	Super Admin / service accounts:
//	  Not resolved here. Administrative access is a separate, explicitly
//	  audited flow (pending decision) and must not become an accidental RLS
//	  bypass.
//
// Fail-closed: any resolver infrastructure error → 500. Missing or invalid
// coach context does NOT fail here — individual handlers must check
// GetCoachID() and reject when coach context is required.
func RequireTenantContext(resolver TenantResolver) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == "" {
			return tenantError(c, fiber.StatusUnauthorized, "UNAUTHENTICATED", "user not authenticated")
		}
		ctx := c.Context()

		// Flow 1 — coach user: resolve and validate own active coach profile.
		coachID, err := resolver.GetActiveCoachID(ctx, userID)
		if err != nil {
			return tenantError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "tenant resolution failed")
		}
		if coachID != "" {
			c.Locals(CoachIDKey, coachID)
			return c.Next()
		}

		// Auto-provision: a coach-authenticated user with no active coach row
		// (e.g. signed up on an external page where the Clerk webhook missed
		// user.created) gets a coaches row provisioned on first access.
		if GetUserRole(c) == "coach" {
			if p, ok := resolver.(Provisioner); ok {
				email, name := "", ""
				if e, n, gerr := p.GetUser(ctx, userID); gerr == nil {
					email, name = e, n
				}
				if perr := p.EnsureCoach(ctx, userID, email, name); perr == nil {
					if coachID, err := resolver.GetActiveCoachID(ctx, userID); err == nil && coachID != "" {
						c.Locals(CoachIDKey, coachID)
						return c.Next()
					}
				}
			}
		}

		// Flow 2 — athlete user: coach comes from the operation, validated.
		requestedCoach := c.Get(coachIDHeader)
		if requestedCoach == "" {
			// No coach context requested — leave it unset. Handlers that
			// require a coach context will check GetCoachID() and deny.
			return c.Next()
		}

		hasRelation, err := resolver.AthleteHasActiveCoach(ctx, userID, requestedCoach)
		if err != nil {
			return tenantError(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "tenant resolution failed")
		}
		if !hasRelation {
			return tenantError(c, fiber.StatusForbidden, "COACH_RELATIONSHIP_INVALID",
				"no active relationship with this coach")
		}

		c.Locals(CoachIDKey, requestedCoach)
		return c.Next()
	}
}

// RequireCoachID ensures the tenant coach context resolved by
// RequireTenantContext is present. It does NOT attempt to resolve it itself.
func RequireCoachID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := GetUserID(c)
		if userID == "" {
			return tenantError(c, fiber.StatusUnauthorized, "UNAUTHENTICATED", "user not authenticated")
		}
		coachID := GetCoachID(c)
		if coachID == "" {
			return tenantError(c, fiber.StatusForbidden, "TENANT_CONTEXT_MISSING",
				"coach tenant context is required for this operation")
		}
		return c.Next()
	}
}

// Returns empty string if not set (caller should check RequireTenantContext
// ran first). Handlers pass this value to UnitOfWork.Begin as coachID.
func GetCoachID(c *fiber.Ctx) string {
	id, _ := c.Locals(CoachIDKey).(string)
	return id
}
