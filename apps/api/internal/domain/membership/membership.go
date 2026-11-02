// Package membership defines the core membership domain entities for the MR Training API.
// It includes Membership, Plan, and Payment types that map to the database schema.
package membership

import (
	"github.com/google/uuid"
	"time"
)

// NewMembership creates a new Membership aggregate with generated ID.
func NewMembership(athleteID, coachID, planName string) *Membership {
	return &Membership{
		ID:        uuid.New().String(),
		AthleteID: athleteID,
		CoachID:   coachID,
		PlanName:  planName,
		Status:    "active",
	}
}

// Membership represents an athlete's subscription to a coach's training program.
// Status can be: "active", "trial", "past_due", "cancelled", "expired".
type Membership struct {
	ID                 string  `json:"id"`
	AthleteID          string  `json:"athlete_id"`
	CoachID            string  `json:"coach_id"`
	PlanName           string  `json:"plan_name"`
	PlanPrice          float64 `json:"plan_price"`
	BillingPeriod      string  `json:"billing_period"` // "monthly" or "yearly"
	Status             string  `json:"status"`
	CurrentPeriodStart string  `json:"current_period_start"`
	CurrentPeriodEnd   string  `json:"current_period_end"`
	GracePeriodDays    int     `json:"grace_period_days"`
	PaymentDueDate     string  `json:"payment_due_date"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

// RecalculateStatus updates the membership status based on current date
// and period dates. This mirrors the TypeScript computeMembershipStatus logic.
// Cancelled memberships are never auto-updated.
func (m *Membership) RecalculateStatus() {
	if m.Status == "cancelled" {
		return
	}

	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	periodEnd, err := time.Parse("2006-01-02", m.CurrentPeriodEnd)
	if err != nil {
		return
	}

	paymentDue, err := time.Parse("2006-01-02", m.PaymentDueDate)
	if err != nil {
		return
	}

	if !today.After(periodEnd) {
		m.Status = "active"
	} else if !today.After(paymentDue) {
		m.Status = "past_due"
	} else {
		m.Status = "expired"
	}
}

// Plan represents a subscription plan offered by a coach.
type Plan struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Price         float64  `json:"price"`
	BillingPeriod string   `json:"billing_period"` // "monthly" or "yearly"
	Features      []string `json:"features"`
	IsActive      bool     `json:"is_active"`
}

// Payment represents a single payment record for a membership.
type Payment struct {
	ID            string  `json:"id"`
	MembershipID  string  `json:"membership_id"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status"` // "pending", "completed", "failed", "refunded"
	PolarOrderID  string  `json:"polar_order_id,omitempty"`
	PeriodStart   string  `json:"period_start"`
	PeriodEnd     string  `json:"period_end"`
	PaidAt        string  `json:"paid_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
}
