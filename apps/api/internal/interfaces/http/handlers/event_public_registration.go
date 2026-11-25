package handlers

import (
	"context"
	"database/sql"
	stderrors "errors"
	"net/mail"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// PublicEventRegistration represents an unauthenticated visitor's registration for a public event.
type PublicEventRegistration struct {
	ID        string `json:"id"`
	EventID   string `json:"event_id"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Notes     string `json:"notes"`
	CreatedAt string `json:"created_at"`
}

// PublicEventResponse extends EventResponse with the public registration count.
type PublicEventResponse struct {
	*dto.EventResponse
	RegistrationCount int `json:"registration_count"`
}

// PublicEventRegistrationStore defines persistence for public_event_registrations.
type PublicEventRegistrationStore interface {
	CountByEvent(ctx context.Context, eventID string) (int, error)
	Insert(ctx context.Context, reg *PublicEventRegistration) (bool, error)
	ListByEvent(ctx context.Context, eventID string) ([]*PublicEventRegistration, error)
}

type sqlPublicEventRegistrationStore struct {
	db *sql.DB
}

func (s *sqlPublicEventRegistrationStore) CountByEvent(ctx context.Context, eventID string) (int, error) {
	if s.db == nil {
		return 0, nil
	}
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM public_event_registrations WHERE event_id = $1
	`, eventID).Scan(&count)
	return count, err
}

func (s *sqlPublicEventRegistrationStore) Insert(ctx context.Context, reg *PublicEventRegistration) (bool, error) {
	if s.db == nil {
		return false, stderrors.New("database not configured")
	}
	var insertedID string
	var createdAt time.Time
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO public_event_registrations (id, event_id, full_name, email, phone, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (event_id, email) DO NOTHING
		RETURNING id, created_at
	`, reg.ID, reg.EventID, reg.FullName, reg.Email, reg.Phone, reg.Notes).Scan(&insertedID, &createdAt)
	if stderrors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	reg.ID = insertedID
	reg.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	return true, nil
}

func (s *sqlPublicEventRegistrationStore) ListByEvent(ctx context.Context, eventID string) ([]*PublicEventRegistration, error) {
	if s.db == nil {
		return []*PublicEventRegistration{}, nil
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, event_id, full_name, email, phone, notes, created_at
		FROM public_event_registrations
		WHERE event_id = $1
		ORDER BY created_at DESC
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []*PublicEventRegistration{}
	for rows.Next() {
		var r PublicEventRegistration
		var createdAt time.Time
		if err := rows.Scan(&r.ID, &r.EventID, &r.FullName, &r.Email, &r.Phone, &r.Notes, &createdAt); err != nil {
			return nil, err
		}
		r.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		out = append(out, &r)
	}
	return out, rows.Err()
}

func (h *EventHandler) publicRegStore() PublicEventRegistrationStore {
	if h.pubRegStore != nil {
		return h.pubRegStore
	}
	return &sqlPublicEventRegistrationStore{db: h.db}
}

// WithPublicRegStore overrides the public registration store (for testing).
func (h *EventHandler) WithPublicRegStore(store PublicEventRegistrationStore) *EventHandler {
	h.pubRegStore = store
	return h
}

// RegisterPublicEvent handles POST /public/events/:id/register.
// Unauthenticated registration for a public, active event.
func (h *EventHandler) RegisterPublicEvent(c *fiber.Ctx) error {
	eventID := strings.TrimSpace(c.Params("id"))
	if eventID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	ev, err := h.service.GetEvent(c.Context(), eventID)
	if err != nil {
		return h.handleError(c, err)
	}
	if !ev.IsPublic || ev.Status == "cancelled" {
		return h.handleError(c, errors.NotFound("Event", eventID))
	}

	var body struct {
		FullName string `json:"full_name"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Notes    string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	fullName := strings.TrimSpace(body.FullName)
	email := strings.ToLower(strings.TrimSpace(body.Email))
	phone := strings.TrimSpace(body.Phone)
	notes := strings.TrimSpace(body.Notes)

	if fullName == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "full_name is required")
	}
	if email == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "email is required")
	}
	if addr, err := mail.ParseAddress(email); err != nil || addr.Address != email || !strings.Contains(email, ".") {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "email must be a valid email address")
	}

	reg := &PublicEventRegistration{
		ID:       uuid.New().String(),
		EventID:  eventID,
		FullName: fullName,
		Email:    email,
		Phone:    phone,
		Notes:    notes,
	}

	inserted, err := h.publicRegStore().Insert(c.Context(), reg)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to register for event")
	}
	if !inserted {
		return appresponse.Error(c, fiber.StatusConflict, "email is already registered for this event")
	}

	middleware.InvalidateCache("events")
	h.broadcastEventsUpdate("public_register", eventID)
	return c.Status(fiber.StatusCreated).JSON(reg)
}

// ListPublicEventRegistrations handles GET /api/v1/events/:id/public-registrations.
// Coach-only endpoint to view unauthenticated public registrations for their event.
func (h *EventHandler) ListPublicEventRegistrations(c *fiber.Ctx) error {
	eventID := strings.TrimSpace(c.Params("id"))
	if eventID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "event ID is required")
	}

	coachID := middleware.GetCoachID(c)
	if coachID == "" {
		coachID = middleware.GetUserID(c)
	}
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	ev, err := h.service.GetEvent(c.Context(), eventID)
	if err != nil {
		return h.handleError(c, err)
	}
	if ev.CoachID != coachID {
		return appresponse.Error(c, fiber.StatusForbidden, "you do not have permission to view registrations for this event")
	}

	regs, err := h.publicRegStore().ListByEvent(c.Context(), eventID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to list public registrations")
	}
	if regs == nil {
		regs = []*PublicEventRegistration{}
	}
	return appresponse.Success(c, regs)
}
