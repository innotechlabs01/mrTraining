package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"

	"github.com/innotechlabs01/mr-training-api/internal/domain/invite"
	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// mockUserService implements userProvisioner for testing.
type mockUserService struct {
	ensureUserFn      func(ctx context.Context, id, email, name, role string) error
	ensureCoachFn     func(ctx context.Context, userID, email, name string) error
	ensureAthleteFn   func(ctx context.Context, userID, email, name string) error
	getCoachByIDFn    func(ctx context.Context, userID string) (*user.Coach, error)
	updateAvatarFn    func(ctx context.Context, userID, avatarURL string) error
	softDeleteUserFn  func(ctx context.Context, userID string) error
}

func (m *mockUserService) EnsureUser(ctx context.Context, id, email, name, role string) error {
	if m.ensureUserFn != nil {
		return m.ensureUserFn(ctx, id, email, name, role)
	}
	return nil
}

func (m *mockUserService) EnsureCoach(ctx context.Context, userID, email, name string) error {
	if m.ensureCoachFn != nil {
		return m.ensureCoachFn(ctx, userID, email, name)
	}
	return nil
}

func (m *mockUserService) EnsureAthleteProfile(ctx context.Context, userID, email, name string) error {
	if m.ensureAthleteFn != nil {
		return m.ensureAthleteFn(ctx, userID, email, name)
	}
	return nil
}

func (m *mockUserService) GetCoachByID(ctx context.Context, userID string) (*user.Coach, error) {
	if m.getCoachByIDFn != nil {
		return m.getCoachByIDFn(ctx, userID)
	}
	return nil, errors.New("not implemented")
}

func (m *mockUserService) UpdateUserAvatar(ctx context.Context, userID, avatarURL string) error {
	if m.updateAvatarFn != nil {
		return m.updateAvatarFn(ctx, userID, avatarURL)
	}
	return nil
}

func (m *mockUserService) SoftDeleteUser(ctx context.Context, userID string) error {
	if m.softDeleteUserFn != nil {
		return m.softDeleteUserFn(ctx, userID)
	}
	return nil
}

// mockInviteService implements inviteLinker for testing.
type mockInviteService struct {
	getByCodeFn    func(ctx context.Context, code string) (*invite.Invite, error)
	acceptInviteFn func(ctx context.Context, code, athleteID string) (*invite.AcceptResult, error)
}

func (m *mockInviteService) GetByCode(ctx context.Context, code string) (*invite.Invite, error) {
	if m.getByCodeFn != nil {
		return m.getByCodeFn(ctx, code)
	}
	return nil, errors.New("not implemented")
}

func (m *mockInviteService) AcceptInvite(ctx context.Context, code, athleteID string) (*invite.AcceptResult, error) {
	if m.acceptInviteFn != nil {
		return m.acceptInviteFn(ctx, code, athleteID)
	}
	return nil, errors.New("not implemented")
}

func svixSignature(secret, timestamp string, body []byte) string {
	secret = strings.TrimPrefix(secret, "whsec_")
	signedPayload := "msg_123." + timestamp + "." + string(body)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedPayload))
	return "v1=" + hex.EncodeToString(mac.Sum(nil))
}

func postWebhook(t *testing.T, handler *ClerkWebhookHandler, body []byte, signature string) (int, string) {
	t.Helper()

	app := fiber.New()
	app.Post("/webhooks/clerk", handler.Handle)

	ctx := &fasthttp.RequestCtx{}
	ctx.Request.SetRequestURI("/webhooks/clerk")
	ctx.Request.Header.SetMethod(http.MethodPost)
	ctx.Request.Header.SetContentType("application/json")
	ctx.Request.Header.Set("svix-id", "msg_123")
	ctx.Request.Header.Set("svix-timestamp", "1704067200")
	if signature != "" {
		ctx.Request.Header.Set("svix-signature", signature)
	}
	ctx.Request.SetBody(body)

	h := app.Handler()
	h(ctx)

	return ctx.Response.StatusCode(), string(ctx.Response.Body())
}

func TestClerkWebhook_ValidSignature_UserCreatedCoach(t *testing.T) {
	secret := "whsec_test123"
	body := []byte(`{
		"type": "user.created",
		"data": {
			"id": "user_123",
			"email_addresses": [{"email_address": "coach@example.com"}],
			"first_name": "Jane",
			"last_name": "Coach",
			"image_url": "https://example.com/avatar.jpg",
			"unsafe_metadata": {}
		}
	}`)
	sig := svixSignature(secret, "1704067200", body)

	var ensureCalled bool
	var ensureCoachCalled bool
	svc := &mockUserService{
		ensureUserFn: func(ctx context.Context, id, email, name, role string) error {
			ensureCalled = true
			if id != "user_123" || email != "coach@example.com" || name != "Jane Coach" || role != "coach" {
				t.Errorf("ensureUser called with wrong args: %s %s %s %s", id, email, name, role)
			}
			return nil
		},
		ensureCoachFn: func(ctx context.Context, userID, email, name string) error {
			ensureCoachCalled = true
			if userID != "user_123" {
				t.Errorf("ensureCoach called with wrong userID: %s", userID)
			}
			return nil
		},
		getCoachByIDFn: func(ctx context.Context, userID string) (*user.Coach, error) {
			return &user.Coach{ID: userID, CoachCode: "MR-ABCD"}, nil
		},
		updateAvatarFn: func(ctx context.Context, userID, avatarURL string) error {
			return nil
		},
	}
	invSvc := &mockInviteService{}

	handler := NewClerkWebhookHandler(svc, invSvc, "clerk_sk_test", secret)
	status, respBody := postWebhook(t, handler, body, sig)

	if status != 200 {
		t.Fatalf("expected status 200, got %d", status)
	}
	var resp dto.WebhookResponse
	if err := json.Unmarshal([]byte(respBody), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if !resp.Received {
		t.Error("expected received=true")
	}
	if !ensureCalled {
		t.Error("expected EnsureUser to be called")
	}
	if !ensureCoachCalled {
		t.Error("expected EnsureCoach to be called")
	}
}

func TestClerkWebhook_InvalidSignature(t *testing.T) {
	body := []byte(`{"type":"user.created","data":{"id":"user_123"}}`)
	handler := NewClerkWebhookHandler(nil, nil, "", "whsec_secret")

	status, _ := postWebhook(t, handler, body, "v1=badsignature")
	if status != 400 {
		t.Fatalf("expected status 400 for invalid signature, got %d", status)
	}
}

func TestClerkWebhook_MissingSignatureHeaders(t *testing.T) {
	body := []byte(`{"type":"user.created","data":{"id":"user_123"}}`)
	handler := NewClerkWebhookHandler(nil, nil, "", "whsec_secret")

	status, _ := postWebhook(t, handler, body, "")
	if status != 400 {
		t.Fatalf("expected status 400 for missing signature headers, got %d", status)
	}
}

func TestClerkWebhook_InvalidPayload(t *testing.T) {
	body := []byte(`not-json`)
	handler := NewClerkWebhookHandler(nil, nil, "", "")

	status, _ := postWebhook(t, handler, body, "")
	if status != 400 {
		t.Fatalf("expected status 400 for invalid payload, got %d", status)
	}
}

func TestClerkWebhook_MissingUserID(t *testing.T) {
	body := []byte(`{"type":"user.created","data":{}}`)
	handler := NewClerkWebhookHandler(nil, nil, "", "")

	status, _ := postWebhook(t, handler, body, "")
	if status != 400 {
		t.Fatalf("expected status 400 for missing user id, got %d", status)
	}
}

func TestClerkWebhook_UserDeleted(t *testing.T) {
	secret := "whsec_test123"
	body := []byte(`{
		"type": "user.deleted",
		"data": {"id": "user_123"}
	}`)
	sig := svixSignature(secret, "1704067200", body)

	var softDeleted bool
	svc := &mockUserService{
		softDeleteUserFn: func(ctx context.Context, userID string) error {
			softDeleted = true
			if userID != "user_123" {
				t.Errorf("softDeleteUser called with wrong userID: %s", userID)
			}
			return nil
		},
	}
	handler := NewClerkWebhookHandler(svc, nil, "", secret)

	status, respBody := postWebhook(t, handler, body, sig)
	if status != 200 {
		t.Fatalf("expected status 200, got %d", status)
	}
	if !softDeleted {
		t.Error("expected SoftDeleteUser to be called")
	}

	var resp dto.WebhookResponse
	if err := json.Unmarshal([]byte(respBody), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if !resp.Received {
		t.Error("expected received=true")
	}
}

func TestClerkWebhook_UserDeleted_RepoError(t *testing.T) {
	secret := "whsec_test123"
	body := []byte(`{
		"type": "user.deleted",
		"data": {"id": "user_123"}
	}`)
	sig := svixSignature(secret, "1704067200", body)

	svc := &mockUserService{
		softDeleteUserFn: func(ctx context.Context, userID string) error {
			return errors.New("db error")
		},
	}
	handler := NewClerkWebhookHandler(svc, nil, "", secret)

	status, _ := postWebhook(t, handler, body, sig)
	if status != 500 {
		t.Fatalf("expected status 500 for repo error, got %d", status)
	}
}

func TestClerkWebhook_UnknownEventType(t *testing.T) {
	body := []byte(`{
		"type": "session.created",
		"data": {"id": "user_123"}
	}`)
	handler := NewClerkWebhookHandler(nil, nil, "", "")

	status, _ := postWebhook(t, handler, body, "")
	if status != 200 {
		t.Fatalf("expected status 200 for unknown event type, got %d", status)
	}
}

func TestClerkWebhook_NoSecretConfigured(t *testing.T) {
	body := []byte(`{"type":"user.created","data":{"id":"user_123"}}`)
	// No secret configured — signature check is skipped. With valid mock
	// services, provisioning succeeds and returns 200 (not 400 for signature).
	svc := &mockUserService{
		ensureUserFn:  func(ctx context.Context, id, email, name, role string) error { return nil },
		ensureCoachFn: func(ctx context.Context, userID, email, name string) error { return nil },
		getCoachByIDFn: func(ctx context.Context, userID string) (*user.Coach, error) {
			return &user.Coach{ID: userID, CoachCode: "MR-X"}, nil
		},
		updateAvatarFn: func(ctx context.Context, userID, avatarURL string) error { return nil },
	}
	handler := NewClerkWebhookHandler(svc, nil, "", "")

	status, _ := postWebhook(t, handler, body, "")
	if status == 400 {
		t.Fatal("expected signature check to be skipped when no secret configured")
	}
}

// mockMetadataWriter records the public metadata patches applied by the handler.
type mockMetadataWriter struct {
	patches []map[string]interface{}
}

func (m *mockMetadataWriter) MergePublicMetadata(ctx context.Context, userID string, patch map[string]interface{}) error {
	m.patches = append(m.patches, patch)
	return nil
}

func TestClerkWebhook_PublicMetadataRoleAthlete_ProvisionsAthlete(t *testing.T) {
	secret := "whsec_test123"
	body := []byte(`{
		"type": "user.created",
		"data": {
			"id": "user_athlete",
			"email_addresses": [{"email_address": "athlete@example.com"}],
			"public_metadata": {"role": "athlete"},
			"unsafe_metadata": {}
		}
	}`)
	sig := svixSignature(secret, "1704067200", body)

	var ensuredRole string
	var ensureCoachCalled bool
	svc := &mockUserService{
		ensureUserFn: func(ctx context.Context, id, email, name, role string) error {
			ensuredRole = role
			return nil
		},
		ensureCoachFn: func(ctx context.Context, userID, email, name string) error {
			ensureCoachCalled = true
			return nil
		},
	}
	invSvc := &mockInviteService{
		getByCodeFn: func(ctx context.Context, code string) (*invite.Invite, error) {
			return &invite.Invite{CoachID: "coach_1"}, nil
		},
		acceptInviteFn: func(ctx context.Context, code, athleteID string) (*invite.AcceptResult, error) {
			return &invite.AcceptResult{CoachName: "Coach One"}, nil
		},
	}
	writer := &mockMetadataWriter{}
	handler := NewClerkWebhookHandler(svc, invSvc, "clerk_sk_test", secret).WithMetadataWriter(writer)

	status, _ := postWebhook(t, handler, body, sig)
	if status != 200 {
		t.Fatalf("expected status 200, got %d", status)
	}
	if ensuredRole != "athlete" {
		t.Errorf("expected role athlete from public_metadata, got %q", ensuredRole)
	}
	if ensureCoachCalled {
		t.Error("expected coach NOT to be provisioned for an athlete")
	}
	if len(writer.patches) != 1 {
		t.Fatalf("expected 1 metadata patch, got %d", len(writer.patches))
	}
	if writer.patches[0]["role"] != "athlete" {
		t.Errorf("expected role athlete mirrored to public metadata, got %v", writer.patches[0]["role"])
	}
}

func TestClerkWebhook_CoachMirrorsRoleAndCoachCodeToPublicMetadata(t *testing.T) {
	secret := "whsec_test123"
	body := []byte(`{
		"type": "user.created",
		"data": {
			"id": "user_coach",
			"email_addresses": [{"email_address": "coach@example.com"}],
			"public_metadata": {"role": "coach"},
			"unsafe_metadata": {}
		}
	}`)
	sig := svixSignature(secret, "1704067200", body)

	svc := &mockUserService{
		ensureUserFn:  func(ctx context.Context, id, email, name, role string) error { return nil },
		ensureCoachFn: func(ctx context.Context, userID, email, name string) error { return nil },
		getCoachByIDFn: func(ctx context.Context, userID string) (*user.Coach, error) {
			return &user.Coach{ID: userID, CoachCode: "MR-ABCD"}, nil
		},
		updateAvatarFn: func(ctx context.Context, userID, avatarURL string) error { return nil },
	}
	writer := &mockMetadataWriter{}
	handler := NewClerkWebhookHandler(svc, nil, "clerk_sk_test", secret).WithMetadataWriter(writer)

	status, _ := postWebhook(t, handler, body, sig)
	if status != 200 {
		t.Fatalf("expected status 200, got %d", status)
	}
	if len(writer.patches) != 1 {
		t.Fatalf("expected 1 metadata patch, got %d", len(writer.patches))
	}
	patch := writer.patches[0]
	if patch["role"] != "coach" {
		t.Errorf("expected role coach, got %v", patch["role"])
	}
	if patch["coachCode"] != "MR-ABCD" {
		t.Errorf("expected coachCode MR-ABCD, got %v", patch["coachCode"])
	}
}
