// Package support provides application logic for support tickets.
package support

import (
	"context"
	"fmt"

	supportdomain "github.com/innotechlabs01/mr-training-api/internal/domain/support"
	notificationdomain "github.com/innotechlabs01/mr-training-api/internal/domain/notification"
	"github.com/google/uuid"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Notifier defines the notification interface needed by support service.
type Notifier interface {
	SendNotification(ctx context.Context, userID, notifType, title, message, icon string) (*notificationdomain.Notification, error)
}

// Service provides support ticket business logic.
type Service struct {
	repo   supportdomain.Repository
	notifs Notifier
}

// NewService creates a new support ticket service.
func NewService(repo supportdomain.Repository, notifs Notifier) *Service {
	return &Service{repo: repo, notifs: notifs}
}

// Coach methods
func (s *Service) ListTickets(ctx context.Context, coachID string, status *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	return s.repo.ListByCoach(ctx, coachID, status)
}

func (s *Service) GetTicket(ctx context.Context, coachID, id string) (*supportdomain.SupportTicket, error) {
	ticket, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ticket.CoachID != coachID {
		return nil, apperrors.Forbidden("you can only access your own tickets")
	}
	return ticket, nil
}

func (s *Service) CreateTicket(ctx context.Context, coachID string, req CreateTicketRequest) (*supportdomain.SupportTicket, error) {
	if req.Subject == "" {
		return nil, apperrors.BadRequest("subject is required")
	}
	if req.Body == "" {
		return nil, apperrors.BadRequest("body is required")
	}

	// Generate ticket number (simple approach: max + 1)
	tickets, _ := s.repo.ListByCoach(ctx, coachID, nil)
	maxNum := 0
	for _, t := range tickets {
		if t.TicketNumber > maxNum {
			maxNum = t.TicketNumber
		}
	}

	ticket := &supportdomain.SupportTicket{
		ID:           uuid.New().String(),
		TicketNumber: maxNum + 1,
		Subject:      req.Subject,
		Category:     req.Category,
		Priority:     req.Priority,
		Status:       supportdomain.TicketStatusOpen,
		CoachID:      coachID,
		AthleteID:    req.AthleteID,
		UnreadCount:  1, // Support team has 1 unread
		LastMessageAt: "",
	}
	if ticket.Category == "" {
		ticket.Category = supportdomain.TicketCategoryProblem
	}
	if ticket.Priority == "" {
		ticket.Priority = supportdomain.TicketPriorityMedium
	}

	if err := s.repo.Create(ctx, ticket); err != nil {
		return nil, fmt.Errorf("create ticket: %w", err)
	}

	// Create initial message from coach
	msg := &supportdomain.TicketMessage{
		ID:       uuid.New().String(),
		TicketID: ticket.ID,
		Author:   supportdomain.TicketAuthorCoach,
		AuthorID: coachID,
		Body:     req.Body,
		ImageURL: req.ImageURL,
	}
	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("create initial message: %w", err)
	}

	ticket.LastMessageAt = msg.CreatedAt
	ticket.UnreadCount = 1 // for support team
	_ = s.repo.Update(ctx, ticket)

	// Notify support team (fire and forget)
	if s.notifs != nil {
		go s.notifs.SendNotification(ctx, "support", "support_ticket_created", "Nuevo ticket", ticket.Subject, "ticket")
	}

	return ticket, nil
}

func (s *Service) UpdateTicket(ctx context.Context, coachID, id string, req UpdateTicketRequest) (*supportdomain.SupportTicket, error) {
	ticket, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ticket.CoachID != coachID {
		return nil, apperrors.Forbidden("you can only update your own tickets")
	}

	if req.Status != nil {
		ticket.Status = *req.Status
		if *req.Status == supportdomain.TicketStatusResolved || *req.Status == supportdomain.TicketStatusClosed {
			now := "datetime('now')" // will be set by DB
			ticket.ResolvedAt = now
		}
	}
	if req.Priority != nil {
		ticket.Priority = *req.Priority
	}
	if req.Category != nil {
		ticket.Category = *req.Category
	}
	if req.AssignedTo != nil {
		ticket.AssignedTo = *req.AssignedTo
	}

	if err := s.repo.Update(ctx, ticket); err != nil {
		return nil, fmt.Errorf("update ticket: %w", err)
	}
	return ticket, nil
}

func (s *Service) DeleteTicket(ctx context.Context, coachID, id string) error {
	ticket, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if ticket.CoachID != coachID {
		return apperrors.Forbidden("you can only delete your own tickets")
	}
	return s.repo.Delete(ctx, id)
}

// Athlete methods
func (s *Service) ListAthleteTickets(ctx context.Context, athleteID string, status *supportdomain.TicketStatus) ([]*supportdomain.SupportTicket, error) {
	return s.repo.ListByAthlete(ctx, athleteID, status)
}

func (s *Service) GetAthleteTicket(ctx context.Context, athleteID, id string) (*supportdomain.SupportTicket, error) {
	ticket, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ticket.AthleteID != athleteID && ticket.CoachID != athleteID {
		return nil, apperrors.Forbidden("you can only access your own tickets")
	}
	return ticket, nil
}

func (s *Service) CreateAthleteTicket(ctx context.Context, athleteID string, req CreateAthleteTicketRequest) (*supportdomain.SupportTicket, error) {
	if req.Subject == "" {
		return nil, apperrors.BadRequest("subject is required")
	}
	if req.Body == "" {
		return nil, apperrors.BadRequest("body is required")
	}

	// For athlete tickets, they go to support team - need a default coach or special handling
	// For now, assign to first available coach or use a system coach ID
	tickets, _ := s.repo.ListByCoach(ctx, "system", nil) // placeholder
	coachID := "system"
	if len(tickets) > 0 {
		coachID = tickets[0].CoachID
	}

	maxNum := 0
	for _, t := range tickets {
		if t.TicketNumber > maxNum {
			maxNum = t.TicketNumber
		}
	}

	ticket := &supportdomain.SupportTicket{
		ID:           uuid.New().String(),
		TicketNumber: maxNum + 1,
		Subject:      req.Subject,
		Category:     req.Category,
		Priority:     req.Priority,
		Status:       supportdomain.TicketStatusOpen,
		CoachID:      coachID,
		AthleteID:    athleteID,
		UnreadCount:  1,
	}
	if ticket.Category == "" {
		ticket.Category = supportdomain.TicketCategoryQuestion
	}
	if ticket.Priority == "" {
		ticket.Priority = supportdomain.TicketPriorityMedium
	}

	if err := s.repo.Create(ctx, ticket); err != nil {
		return nil, fmt.Errorf("create athlete ticket: %w", err)
	}

	msg := &supportdomain.TicketMessage{
		ID:       uuid.New().String(),
		TicketID: ticket.ID,
		Author:   supportdomain.TicketAuthorAthlete,
		AuthorID: athleteID,
		Body:     req.Body,
		ImageURL: req.ImageURL,
	}
	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("create initial message: %w", err)
	}

	ticket.LastMessageAt = msg.CreatedAt
	_ = s.repo.Update(ctx, ticket)

	if s.notifs != nil {
		go s.notifs.SendNotification(ctx, "support", "support_ticket_created", "Nuevo ticket", ticket.Subject, "ticket")
	}

	return ticket, nil
}

// Messages
func (s *Service) ListMessages(ctx context.Context, userID, userRole, ticketID string) ([]*supportdomain.TicketMessage, error) {
	ticket, err := s.repo.GetByID(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	// Check access
	if userRole == "coach" && ticket.CoachID != userID {
		return nil, apperrors.Forbidden("not your ticket")
	}
	if userRole == "athlete" && ticket.AthleteID != userID {
		return nil, apperrors.Forbidden("not your ticket")
	}
	return s.repo.ListMessages(ctx, ticketID)
}

func (s *Service) AddMessage(ctx context.Context, userID, userRole, ticketID, body, imageURL string) (*supportdomain.TicketMessage, error) {
	ticket, err := s.repo.GetByID(ctx, ticketID)
	if err != nil {
		return nil, err
	}

	// Check access
	var author supportdomain.TicketAuthor
	switch userRole {
	case "coach":
		if ticket.CoachID != userID {
			return nil, apperrors.Forbidden("not your ticket")
		}
		author = supportdomain.TicketAuthorCoach
	case "support":
		author = supportdomain.TicketAuthorSupport
	case "athlete":
		if ticket.AthleteID != userID {
			return nil, apperrors.Forbidden("not your ticket")
		}
		author = supportdomain.TicketAuthorAthlete
	default:
		return nil, apperrors.Forbidden("invalid role")
	}

	if body == "" {
		return nil, apperrors.BadRequest("body is required")
	}

	msg := &supportdomain.TicketMessage{
		ID:       uuid.New().String(),
		TicketID: ticketID,
		Author:   author,
		AuthorID: userID,
		Body:     body,
		ImageURL: imageURL,
	}
	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("add message: %w", err)
	}

	// Determine recipient for notification
	var recipientID string
	switch author {
	case supportdomain.TicketAuthorCoach:
		recipientID = "support" // notify support team
	case supportdomain.TicketAuthorSupport:
		if ticket.AthleteID != "" {
			recipientID = ticket.AthleteID
		} else {
			recipientID = ticket.CoachID
		}
	case supportdomain.TicketAuthorAthlete:
		recipientID = "support"
	}

	// Notify recipient (fire and forget)
	if s.notifs != nil && recipientID != "" {
		go s.notifs.SendNotification(ctx, recipientID, "support_message_added", "Nuevo mensaje", msg.Body[:min(50, len(msg.Body))], "message")
	}

	return msg, nil
}

func (s *Service) MarkRead(ctx context.Context, userID, userRole, ticketID string) error {
	ticket, err := s.repo.GetByID(ctx, ticketID)
	if err != nil {
		return err
	}

	var author supportdomain.TicketAuthor
	switch userRole {
	case "coach":
		if ticket.CoachID != userID {
			return apperrors.Forbidden("not your ticket")
		}
		author = supportdomain.TicketAuthorCoach
	case "support":
		author = supportdomain.TicketAuthorSupport
	case "athlete":
		if ticket.AthleteID != userID {
			return apperrors.Forbidden("not your ticket")
		}
		author = supportdomain.TicketAuthorAthlete
	default:
		return apperrors.Forbidden("invalid role")
	}

	return s.repo.MarkMessagesRead(ctx, ticketID, userID, author)
}

func (s *Service) GetUnreadCount(ctx context.Context, userID, userRole, ticketID string) (int, error) {
	ticket, err := s.repo.GetByID(ctx, ticketID)
	if err != nil {
		return 0, err
	}

	var author supportdomain.TicketAuthor
	switch userRole {
	case "coach":
		if ticket.CoachID != userID {
			return 0, apperrors.Forbidden("not your ticket")
		}
		author = supportdomain.TicketAuthorCoach
	case "support":
		author = supportdomain.TicketAuthorSupport
	case "athlete":
		if ticket.AthleteID != userID {
			return 0, apperrors.Forbidden("not your ticket")
		}
		author = supportdomain.TicketAuthorAthlete
	default:
		return 0, apperrors.Forbidden("invalid role")
	}

	return s.repo.GetUnreadCount(ctx, ticketID, userID, author)
}

// Request types
type CreateTicketRequest struct {
	Subject  string                      `json:"subject"`
	Body     string                      `json:"body"`
	Category supportdomain.TicketCategory `json:"category"`
	Priority supportdomain.TicketPriority `json:"priority"`
	AthleteID string                     `json:"athlete_id,omitempty"`
	ImageURL string                      `json:"image_url,omitempty"`
}

type UpdateTicketRequest struct {
	Status    *supportdomain.TicketStatus   `json:"status,omitempty"`
	Priority  *supportdomain.TicketPriority `json:"priority,omitempty"`
	Category  *supportdomain.TicketCategory `json:"category,omitempty"`
	AssignedTo *string                     `json:"assigned_to,omitempty"`
}

type CreateAthleteTicketRequest struct {
	Subject  string                      `json:"subject"`
	Body     string                      `json:"body"`
	Category supportdomain.TicketCategory `json:"category"`
	Priority supportdomain.TicketPriority `json:"priority"`
	ImageURL string                      `json:"image_url,omitempty"`
}