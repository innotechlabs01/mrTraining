package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	coachapp "github.com/innotechlabs01/mr-training-api/internal/application/coach"
	notificationapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	"github.com/innotechlabs01/mr-training-api/internal/domain/coach"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AthleteSchedulingHandler handles athlete-facing scheduling and Meet P2P booking.
type AthleteSchedulingHandler struct {
	service  *coachapp.Service
	db       *sql.DB
	notifSvc *notificationapp.Service
}

// NewAthleteSchedulingHandler creates handler.
func NewAthleteSchedulingHandler(service *coachapp.Service) *AthleteSchedulingHandler {
	return &AthleteSchedulingHandler{service: service}
}

// WithDeps attaches PostgreSQL and notification service for coach resolution,
// RLS isolation, and booking confirmations.
func (h *AthleteSchedulingHandler) WithDeps(db *sql.DB, notif *notificationapp.Service) *AthleteSchedulingHandler {
	h.db = db
	h.notifSvc = notif
	return h
}

func (h *AthleteSchedulingHandler) resolveCoachInfo(ctx context.Context, athleteID, requestedCoachID, role string) (string, string) {
	coachID := strings.TrimSpace(requestedCoachID)
	coachName := ""
	if h.db == nil {
		return coachID, coachName
	}

	uow := database.NewUnitOfWork(h.db)
	if err := uow.Begin(ctx, athleteID, coachID, role); err != nil {
		return coachID, coachName
	}
	defer uow.Rollback(ctx)

	if coachID == "" {
		_ = uow.Tx().QueryRowContext(ctx, `
			SELECT coach_id FROM coach_athlete_links
			WHERE athlete_id = $1 AND status = 'active'
			ORDER BY is_primary DESC, assigned_at DESC LIMIT 1
		`, athleteID).Scan(&coachID)
	}

	if coachID == "" {
		_ = uow.Tx().QueryRowContext(ctx, `
			SELECT coach_id FROM coach_availability
			WHERE is_active = true
			ORDER BY created_at ASC LIMIT 1
		`).Scan(&coachID)
	}

	if coachID != "" {
		_ = uow.Tx().QueryRowContext(ctx, `
			SELECT COALESCE(NULLIF(c.name, ''), NULLIF(u.name, ''), '')
			FROM coaches c
			LEFT JOIN users u ON u.id = c.id
			WHERE c.id = $1 LIMIT 1
		`, coachID).Scan(&coachName)
		if coachName == "" {
			_ = uow.Tx().QueryRowContext(ctx, `SELECT COALESCE(name, '') FROM users WHERE id = $1 LIMIT 1`, coachID).Scan(&coachName)
		}
	}

	_ = uow.Commit(ctx)
	return coachID, coachName
}

// GetAvailability handles GET /athlete/availability.
func (h *AthleteSchedulingHandler) GetAvailability(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	requestedCoachID := c.Query("coachId", c.Query("coach_id", ""))
	coachID, coachName := h.resolveCoachInfo(c.Context(), userID, requestedCoachID, middleware.GetUserRole(c))

	var slots []*coach.CoachAvailability
	var err error
	if coachID != "" {
		if h.db != nil {
			uow := database.NewUnitOfWork(h.db)
			if bErr := uow.Begin(c.Context(), userID, coachID, middleware.GetUserRole(c)); bErr == nil {
				defer uow.Rollback(c.Context())
				slots, err = h.service.SetExecutor(uow.Tx()).GetAvailability(c.Context(), coachID)
				if err == nil {
					_ = uow.Commit(c.Context())
				}
			} else {
				slots, err = h.service.GetAvailability(c.Context(), coachID)
			}
		} else {
			slots, err = h.service.GetAvailability(c.Context(), coachID)
		}
	} else {
		slots = []*coach.CoachAvailability{}
	}
	if err != nil {
		return h.handleError(c, err)
	}
	if slots == nil {
		slots = []*coach.CoachAvailability{}
	}

	activeSlots := make([]*coach.CoachAvailability, 0, len(slots))
	for _, s := range slots {
		if s.IsActive {
			activeSlots = append(activeSlots, s)
		}
	}

	return appresponse.Success(c, fiber.Map{
		"coach_id":     coachID,
		"coach_name":   coachName,
		"availability": activeSlots,
	})
}

// CreateAppointment handles POST /athlete/appointments.
func (h *AthleteSchedulingHandler) CreateAppointment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	var req struct {
		Date      string `json:"date"`
		StartTime string `json:"startTime"`
		EndTime   string `json:"endTime"`
		Notes     string `json:"notes"`
		Title     string `json:"title"`
		CoachID   string `json:"coachId"`
		CoachID2  string `json:"coach_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Date == "" || req.StartTime == "" || req.EndTime == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "date, startTime and endTime are required")
	}
	requestedCoachID := req.CoachID
	if requestedCoachID == "" {
		requestedCoachID = req.CoachID2
	}
	if requestedCoachID == "" {
		requestedCoachID = c.Query("coachId", c.Query("coach_id", ""))
	}

	coachID, _ := h.resolveCoachInfo(c.Context(), userID, requestedCoachID, middleware.GetUserRole(c))
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "no coach availability configured")
	}

	athleteName := ""
	if h.db != nil {
		uowLookup := database.NewUnitOfWork(h.db)
		if err := uowLookup.Begin(c.Context(), userID, coachID, middleware.GetUserRole(c)); err == nil {
			_ = uowLookup.Tx().QueryRowContext(c.Context(),
				`SELECT COALESCE(NULLIF(ap.name, ''), NULLIF(u.name, ''), '') FROM users u LEFT JOIN athlete_profiles ap ON ap.id = u.id WHERE u.id = $1 LIMIT 1`,
				userID,
			).Scan(&athleteName)
			_ = uowLookup.Commit(c.Context())
		}
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "Meet de Onboarding & Rutina"
	}

	meetRoomID := "meet-" + uuid.New().String()[:12]
	apt := &coach.Appointment{
		ID:          uuid.New().String(),
		AthleteID:   userID,
		AthleteName: athleteName,
		CoachID:     coachID,
		Title:       title,
		StartTime:   req.Date + "T" + req.StartTime,
		EndTime:     req.Date + "T" + req.EndTime,
		Notes:       req.Notes,
		MeetRoomID:  meetRoomID,
		Status:      "scheduled",
	}

	if h.db != nil {
		uow := database.NewUnitOfWork(h.db)
		if err := uow.Begin(c.Context(), userID, coachID, middleware.GetUserRole(c)); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to begin transaction")
		}
		defer uow.Rollback(c.Context())
		if err := h.service.SetExecutor(uow.Tx()).CreateAppointment(c.Context(), apt); err != nil {
			return h.handleError(c, err)
		}
		if err := uow.Commit(c.Context()); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to commit transaction")
		}
	} else {
		if err := h.service.CreateAppointment(c.Context(), apt); err != nil {
			return h.handleError(c, err)
		}
	}

	if h.notifSvc != nil {
		displayAthlete := athleteName
		if displayAthlete == "" {
			displayAthlete = "Nuevo atleta"
		}
		_, _ = h.notifSvc.SendNotification(
			c.Context(),
			userID,
			"appointment",
			"📅 Meet de Onboarding confirmado",
			fmt.Sprintf("Tu reunión (%s, %s–%s) está confirmada. Sala Meet: %s", req.Date, req.StartTime, req.EndTime, apt.MeetRoomID),
			"CalendarIcon",
		)
		_, _ = h.notifSvc.SendNotification(
			c.Context(),
			coachID,
			"appointment",
			"📅 Nueva reunión de onboarding agendada",
			fmt.Sprintf("%s reservó una reunión para el %s (%s–%s).", displayAthlete, req.Date, req.StartTime, req.EndTime),
			"CalendarIcon",
		)
	}

	return appresponse.Success(c, apt)
}

// GetAppointments handles GET /athlete/appointments.
func (h *AthleteSchedulingHandler) GetAppointments(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	apts := []*coach.Appointment{}
	if h.db != nil {
		uow := database.NewUnitOfWork(h.db)
		if err := uow.Begin(c.Context(), userID, "", middleware.GetUserRole(c)); err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to begin transaction")
		}
		defer uow.Rollback(c.Context())

		rows, err := uow.Tx().QueryContext(c.Context(), `
			SELECT id, coach_id, athlete_id, COALESCE(athlete_name, ''), title, status,
			       start_time, end_time, COALESCE(notes, ''), COALESCE(meet_room_id, ''),
			       created_at::text, updated_at::text
			FROM coach_appointments
			WHERE athlete_id = $1
			ORDER BY start_time DESC
		`, userID)
		if err == nil {
			for rows.Next() {
				a := &coach.Appointment{}
				if scanErr := rows.Scan(
					&a.ID, &a.CoachID, &a.AthleteID, &a.AthleteName, &a.Title,
					&a.Status, &a.StartTime, &a.EndTime, &a.Notes, &a.MeetRoomID,
					&a.CreatedAt, &a.UpdatedAt,
				); scanErr == nil {
					apts = append(apts, a)
				}
			}
			rows.Close()
		}
		_ = uow.Commit(c.Context())
	}

	return appresponse.Success(c, apts)
}

func (h *AthleteSchedulingHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
