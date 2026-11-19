package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/domain/invite"
	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// clerkWebhookPayload is the minimal subset of a Clerk webhook event we consume.
type clerkWebhookPayload struct {
	Type    string                 `json:"type"`
	Data    map[string]interface{} `json:"data"`
}

// userProvisioner is the subset of the user application service used by the
// Clerk webhook handler. Kept as an interface so the handler can be tested
// without a real database.
type userProvisioner interface {
	EnsureUser(ctx context.Context, id, email, name, role string) error
	EnsureCoach(ctx context.Context, userID, email, name string) error
	EnsureAthleteProfile(ctx context.Context, userID, email, name string) error
	GetCoachByID(ctx context.Context, userID string) (*user.Coach, error)
	UpdateUserAvatar(ctx context.Context, userID, avatarURL string) error
	SoftDeleteUser(ctx context.Context, userID string) error
}

// inviteLinker is the subset of the invite application service used by the
// Clerk webhook handler for athlete provisioning via coach code.
type inviteLinker interface {
	GetByCode(ctx context.Context, code string) (*invite.Invite, error)
	AcceptInvite(ctx context.Context, code, athleteID string) (*invite.AcceptResult, error)
}

// publicMetadataWriter is the port used to mirror role metadata into Clerk's
// PUBLIC metadata. It is a port (not the Clerk client) so the handler stays
// decoupled from the infrastructure layer and testable with a fake.
//
// Merge semantics matter: the Clerk Backend API replaces the whole metadata
// object on PATCH, so writing the role must not wipe `membership_status`.
type publicMetadataWriter interface {
	MergePublicMetadata(ctx context.Context, userID string, patch map[string]interface{}) error
}

// ClerkWebhookHandler handles Clerk webhook events (public endpoint).
// It verifies the Clerk (svix) signature when CLERK_WEBHOOK_SECRET is set,
// otherwise trusts the forward from the Next.js proxy. No auth middleware
// is applied — Clerk webhooks carry no bearer token.
type ClerkWebhookHandler struct {
	userService    userProvisioner
	inviteService  inviteLinker
	clerkSecretKey string
	webhookSecret  string
	metadata       publicMetadataWriter
}

// NewClerkWebhookHandler creates a new Clerk webhook handler.
func NewClerkWebhookHandler(
	userService userProvisioner,
	inviteService inviteLinker,
	clerkSecretKey, webhookSecret string,
) *ClerkWebhookHandler {
	return &ClerkWebhookHandler{
		userService:    userService,
		inviteService:  inviteService,
		clerkSecretKey: clerkSecretKey,
		webhookSecret:  webhookSecret,
	}
}

// WithMetadataWriter injects the Clerk metadata writer. It is a separate
// constructor option because the writer is only needed to mirror the role
// back into Clerk, and tests may not care about it.
func (h *ClerkWebhookHandler) WithMetadataWriter(w publicMetadataWriter) *ClerkWebhookHandler {
	h.metadata = w
	return h
}

// Handle processes POST /webhooks/clerk.
func (h *ClerkWebhookHandler) Handle(c *fiber.Ctx) error {
	body := c.Body()

	// Verify Clerk (svix) signature when a secret is configured. When the
	// webhook is forwarded by the Next.js proxy (which already verified),
	// and no secret is set, we trust the forward.
	if h.webhookSecret != "" {
		if !h.verifySignature(c, body) {
			return appresponse.Error(c, fiber.StatusBadRequest, "invalid webhook signature")
		}
	}

	var evt clerkWebhookPayload
	if err := json.Unmarshal(body, &evt); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid payload")
	}

	userID, _ := evt.Data["id"].(string)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "missing user id")
	}

	email := ""
	if addrs, ok := evt.Data["email_addresses"].([]interface{}); ok && len(addrs) > 0 {
		if m, ok := addrs[0].(map[string]interface{}); ok {
			email, _ = m["email_address"].(string)
		}
	}

	// Build display name from Clerk first/last, with unsafe_metadata fallback
	// (mobile sends firstName/lastName there).
	unsafeMeta, _ := evt.Data["unsafe_metadata"].(map[string]interface{})
	metaFirst, _ := unsafeMeta["firstName"].(string)
	metaLast, _ := unsafeMeta["lastName"].(string)
	firstName, _ := evt.Data["first_name"].(string)
	lastName, _ := evt.Data["last_name"].(string)
	if firstName == "" {
		firstName = metaFirst
	}
	if lastName == "" {
		lastName = metaLast
	}
	name := strings.TrimSpace(firstName + " " + lastName)
	if name == "" {
		name = email
	}
	avatar, _ := evt.Data["image_url"].(string)

	// public_metadata is the server-written metadata (role, coachCode) and is
	// the authoritative source for the user's role.
	publicMeta, _ := evt.Data["public_metadata"].(map[string]interface{})

	ctx := c.Context()

	switch evt.Type {
	case "user.created", "user.updated":
		if err := h.provisionUser(ctx, userID, email, name, avatar, publicMeta, unsafeMeta); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
		}

	case "user.deleted":
		if err := h.userService.SoftDeleteUser(ctx, userID); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
		}

	default:
		// Ignore unknown event types.
	}

	return appresponse.Success(c, dto.WebhookResponse{Received: true})
}

// webhookReplayTolerance is how old a svix timestamp may be before the
// event is treated as a replay. Svix recommends five minutes.
const webhookReplayTolerance = 5 * time.Minute

// verifySignature validates the Clerk (svix) webhook signature using the
// standard SVIX algorithm:
//   signed = svix-id + "." + svix-timestamp + "." + raw_body
//   sig    = HMAC-SHA256(base64-decoded whsec secret, signed)
// and compares it in constant time against the v1 signature(s) carried in
// the svix-signature header.
//
// The timestamp is checked against a replay tolerance: a signature older
// than webhookReplayTolerance (or too far in the future) is rejected even
// when the digest is correct.
func (h *ClerkWebhookHandler) verifySignature(c *fiber.Ctx, body []byte) bool {
	svixID := c.Get("svix-id")
	svixTimestamp := c.Get("svix-timestamp")
	svixSignature := c.Get("svix-signature")
	if svixID == "" || svixTimestamp == "" || svixSignature == "" {
		return false
	}

	// Replay window: the event must be recent.
	ts, err := parseSvixTimestamp(svixTimestamp)
	if err != nil {
		return false
	}
	age := time.Since(ts)
	if age > webhookReplayTolerance || age < -webhookReplayTolerance {
		return false
	}

	secret := strings.TrimSpace(h.webhookSecret)
	secret = strings.TrimPrefix(secret, "whsec_")
	decoded, err := base64.StdEncoding.DecodeString(secret)
	if err != nil {
		decoded = []byte(secret)
	}

	signed := svixID + "." + svixTimestamp + "." + string(body)
	mac := hmac.New(sha256.New, decoded)
	mac.Write([]byte(signed))
	expectedRaw := mac.Sum(nil)
	expectedHex := hex.EncodeToString(expectedRaw)
	expectedB64 := base64.StdEncoding.EncodeToString(expectedRaw)

	// svix-signature may contain multiple "v1,<base64sig>" separated by spaces.
	for _, part := range strings.Fields(svixSignature) {
		for _, field := range strings.Split(part, ",") {
			value := strings.TrimSpace(field)
			if strings.HasPrefix(value, "v1=") {
				value = strings.TrimPrefix(value, "v1=")
			} else if strings.HasPrefix(value, "v1") {
				continue
			}
			// Clerk sends the signature base64 encoded. Compare the raw digest
			// against the DECODED signature and the encoded digests against the
			// encoded signature — comparing the 32 raw bytes with the 64 bytes
			// of a hex string can never match, which rejected every real
			// Clerk event.
			if hmac.Equal([]byte(value), []byte(expectedB64)) {
				return true
			}
			if hmac.Equal([]byte(value), []byte(expectedHex)) {
				return true
			}
			if provided, err := base64.StdEncoding.DecodeString(value); err == nil && hmac.Equal(provided, expectedRaw) {
				return true
			}
			if provided, err := base64.RawStdEncoding.DecodeString(value); err == nil && hmac.Equal(provided, expectedRaw) {
				return true
			}
		}
	}

	return false
}

// parseSvixTimestamp accepts seconds or nanoseconds encoded as strings.
func parseSvixTimestamp(s string) (time.Time, error) {
	// svix timestamps are usually milliseconds/seconds; try parsing standard.
	if v, err := time.Parse(time.RFC3339, s); err == nil {
		return v, nil
	}
	// Otherwise treat as numeric since-epoch.
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return time.Time{}, err
	}
	// Heuristic: value length > 10 means milliseconds.
	if len(s) <= 10 {
		return time.Unix(n, 0), nil
	}
	return time.UnixMilli(n), nil
}

// provisionUser creates or updates the user's application profile based on
// their role.
//
// Role resolution (priority order):
//  1. public_metadata.role — written server-side by the activation endpoint.
//     Authoritative: a client cannot forge it because only the backend holds
//     the Clerk secret key.
//  2. unsafe_metadata.coachCode — legacy signal used by the mobile athlete
//     sign-up (the athlete joins a coach with an invite code).
//  3. Default → coach. The web sign-up flow is the coach flow.
func (h *ClerkWebhookHandler) provisionUser(ctx context.Context, userID, email, name, avatar string, publicMeta, unsafeMeta map[string]interface{}) error {
	role, _ := publicMeta["role"].(string)
	role = strings.TrimSpace(role)

	coachCode, _ := unsafeMeta["coachCode"].(string)
	coachCode = strings.TrimSpace(coachCode)

	switch {
	case role == "athlete" && coachCode != "":
		// An athlete joining a coach with an invite code.
		return h.provisionAthlete(ctx, userID, email, name, avatar, coachCode)
	case role == "athlete":
		// An athlete with no coach yet: the profile is created and the coach
		// link is added later through the invite flow. Validating an empty
		// coach code here would fail the whole webhook.
		return h.provisionAthleteWithoutCoach(ctx, userID, email, name, avatar)
	default:
		return h.provisionCoach(ctx, userID, email, name, avatar)
	}
}

// provisionCoach creates the base user row and coach profile, generates a
// unique coach code, and mirrors role + coachCode into Clerk public_metadata.
func (h *ClerkWebhookHandler) provisionCoach(ctx context.Context, userID, email, name, avatar string) error {
	// Idempotent base user row.
	if err := h.userService.EnsureUser(ctx, userID, email, name, "coach"); err != nil {
		return fmt.Errorf("ensure user: %w", err)
	}
	// Idempotent coach profile (generates coach_code if missing).
	if err := h.userService.EnsureCoach(ctx, userID, email, name); err != nil {
		return fmt.Errorf("ensure coach: %w", err)
	}

	// Read back the generated coach code for Clerk metadata.
	coachCode := ""
	if c, err := h.userService.GetCoachByID(ctx, userID); err == nil {
		coachCode = c.CoachCode
	}

	// Update avatar if provided.
	if avatar != "" {
		_ = h.userService.UpdateUserAvatar(ctx, userID, avatar)
	}

	// Mirror role + coachCode into Clerk public_metadata so the frontend can
	// read it without hitting the database.
	if h.metadata != nil {
		_ = h.metadata.MergePublicMetadata(ctx, userID, map[string]interface{}{
			"role":      "coach",
			"coachCode": coachCode,
		})
	}

	return nil
}

// provisionAthleteWithoutCoach creates the athlete profile for a user that
// has no coach yet. The coach link is added later through the invite flow.
func (h *ClerkWebhookHandler) provisionAthleteWithoutCoach(ctx context.Context, userID, email, name, avatar string) error {
	if err := h.userService.EnsureUser(ctx, userID, email, name, "athlete"); err != nil {
		return fmt.Errorf("ensure user: %w", err)
	}
	if err := h.userService.EnsureAthleteProfile(ctx, userID, email, name); err != nil {
		return fmt.Errorf("ensure athlete profile: %w", err)
	}
	if avatar != "" {
		_ = h.userService.UpdateUserAvatar(ctx, userID, avatar)
	}
	if h.metadata != nil {
		_ = h.metadata.MergePublicMetadata(ctx, userID, map[string]interface{}{
			"role": "athlete",
		})
	}
	return nil
}

// provisionAthlete validates the coach code, creates the athlete profile,
// links the athlete to the coach, and mirrors role + coach info into Clerk.
func (h *ClerkWebhookHandler) provisionAthlete(ctx context.Context, userID, email, name, avatar, coachCode string) error {
	// Validate the coach code before doing anything.
	inv, err := h.inviteService.GetByCode(ctx, coachCode)
	if err != nil {
		return fmt.Errorf("invalid coach code %q: %w", coachCode, err)
	}

	// Idempotent base user row.
	if err := h.userService.EnsureUser(ctx, userID, email, name, "athlete"); err != nil {
		return fmt.Errorf("ensure user: %w", err)
	}
	// Idempotent athlete profile.
	if err := h.userService.EnsureAthleteProfile(ctx, userID, email, name); err != nil {
		return fmt.Errorf("ensure athlete profile: %w", err)
	}

	// Link coach → athlete (idempotent). AcceptInvite returns the coach name.
	result, err := h.inviteService.AcceptInvite(ctx, coachCode, userID)
	if err != nil {
		return fmt.Errorf("link athlete to coach: %w", err)
	}

	// Update avatar if provided.
	if avatar != "" {
		_ = h.userService.UpdateUserAvatar(ctx, userID, avatar)
	}

	// Mirror role + coach info into Clerk public_metadata.
	if h.metadata != nil {
		_ = h.metadata.MergePublicMetadata(ctx, userID, map[string]interface{}{
			"role":      "athlete",
			"coachCode": coachCode,
			"coachId":   inv.CoachID,
			"coachName": result.CoachName,
		})
	}

	return nil
}
