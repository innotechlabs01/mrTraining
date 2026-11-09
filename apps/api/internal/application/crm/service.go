// Package crm provee servicios para el panel de super admin (CRM).
// Agrega datos de coaches, planes, ganancias y pagos para el dashboard.
package crm

import (
	"context"
	"fmt"

	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// CoachSummary resume de un coach para el CRM.
type CoachSummary struct {
	ID             string  `json:"id"`
	ClerkID        string  `json:"clerk_id"`
	Email          string  `json:"email"`
	Name           string  `json:"name"`
	Role           string  `json:"role"`
	PlanName       string  `json:"plan_name"`
	PlanPrice      float64 `json:"plan_price"`
	PlanStatus     string  `json:"plan_status"`       // active, expired, cancelled, none
	PlanExpiresAt  string  `json:"plan_expires_at"`   // fecha de vencimiento
	AthletesCount  int     `json:"athletes_count"`
	RevenueMonth   float64 `json:"revenue_month"`     // ganancias mes actual
	RevenueTotal   float64 `json:"revenue_total"`     // ganancias totales
	LastLogin      string  `json:"last_login,omitempty"`
}

// RevenueStats estadísticas de ganancias.
type RevenueStats struct {
	Today      float64 `json:"today"`
	ThisMonth  float64 `json:"this_month"`
	ThisYear   float64 `json:"this_year"`
	Total      float64 `json:"total"`
	ByMonth    []MonthRevenue `json:"by_month"`
}

// MonthRevenue ingreso por mes.
type MonthRevenue struct {
	Month  string  `json:"month"`   // YYYY-MM
	Amount float64 `json:"amount"`
}

// CoachPayment pago de suscripción de un atleta a un coach.
type CoachPayment struct {
	ID             string  `json:"id"`
	AthleteID      string  `json:"athlete_id"`
	AthleteName    string  `json:"athlete_name"`
	CoachID        string  `json:"coach_id"`
	PlanName       string  `json:"plan_name"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	Status         string  `json:"status"`       // approved, pending, failed
	PaidAt         string  `json:"paid_at"`
	PeriodStart    string  `json:"period_start"`
	PeriodEnd      string  `json:"period_end"`
}

// Repository interface para el CRM.
type Repository interface {
	// ListCoaches devuelve todos los coaches con su plan y estado.
	ListCoaches(ctx context.Context) ([]*CoachSummary, error)
	// GetRevenueStats devuelve estadísticas de ganancias.
	GetRevenueStats(ctx context.Context) (*RevenueStats, error)
	// GetCoachPayments devuelve el historial de pagos de un coach.
	GetCoachPayments(ctx context.Context, coachID string) ([]*CoachPayment, error)
	// GetExpiringCoaches devuelve coaches con plan por vencer (7 días).
	GetExpiringCoaches(ctx context.Context) ([]*CoachSummary, error)
	// GetExpiredCoaches devuelve coaches con plan vencido.
	GetExpiredCoaches(ctx context.Context) ([]*CoachSummary, error)
}

// Service orquesta los casos de uso del CRM.
type Service struct {
	repo Repository
}

// NewService crea un nuevo servicio CRM.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// ListCoaches devuelve todos los coaches para el CRM.
func (s *Service) ListCoaches(ctx context.Context) ([]*CoachSummary, error) {
	coaches, err := s.repo.ListCoaches(ctx)
	if err != nil {
		return nil, fmt.Errorf("list coaches: %w", err)
	}
	return coaches, nil
}

// GetRevenueStats devuelve estadísticas de ganancias.
func (s *Service) GetRevenueStats(ctx context.Context) (*RevenueStats, error) {
	stats, err := s.repo.GetRevenueStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("get revenue stats: %w", err)
	}
	return stats, nil
}

// GetCoachPayments devuelve el historial de pagos de un coach.
func (s *Service) GetCoachPayments(ctx context.Context, coachID string) ([]*CoachPayment, error) {
	if coachID == "" {
		return nil, errors.BadRequest("coach_id es requerido")
	}
	payments, err := s.repo.GetCoachPayments(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("get coach payments: %w", err)
	}
	return payments, nil
}

// GetExpiringCoaches devuelve coaches con plan por vencer.
func (s *Service) GetExpiringCoaches(ctx context.Context) ([]*CoachSummary, error) {
	coaches, err := s.repo.GetExpiringCoaches(ctx)
	if err != nil {
		return nil, fmt.Errorf("get expiring coaches: %w", err)
	}
	return coaches, nil
}

// GetExpiredCoaches devuelve coaches con plan vencido.
func (s *Service) GetExpiredCoaches(ctx context.Context) ([]*CoachSummary, error) {
	coaches, err := s.repo.GetExpiredCoaches(ctx)
	if err != nil {
		return nil, fmt.Errorf("get expired coaches: %w", err)
	}
	return coaches, nil
}
