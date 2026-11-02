// Package dto provides request and response data transfer objects for the
// subscription (plans & payments) domain.
package dto

import (
	subscription "github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
)

// SubscribeRequest is the payload for subscribing an athlete to a plan.
type SubscribeRequest struct {
	// PlanID is the plan being subscribed to.
	PlanID string `json:"plan_id" validate:"required"`
	// GracePeriodDays overrides the default grace period (default 5).
	GracePeriodDays int `json:"grace_period_days"`
}

// SubscribeResponse is the payload returned after creating a subscription.
type SubscribeResponse struct {
	Subscription SubscriptionResponse `json:"subscription"`
	CheckoutURL  string               `json:"checkout_url"`
	Reference    string               `json:"reference"`
}

// SubscriptionResponse represents a subscription in API responses.
type SubscriptionResponse struct {
	ID                 string  `json:"id"`
	AthleteID          string  `json:"athlete_id"`
	CoachID            string  `json:"coach_id"`
	PlanID             string  `json:"plan_id"`
	PlanName           string  `json:"plan_name"`
	PlanPrice          float64 `json:"plan_price"`
	Currency           string  `json:"currency"`
	BillingPeriod      string  `json:"billing_period"`
	Status             string  `json:"status"`
	CancelAtPeriodEnd  bool    `json:"cancel_at_period_end"`
	CurrentPeriodStart string  `json:"current_period_start"`
	CurrentPeriodEnd   string  `json:"current_period_end"`
	GracePeriodDays    int     `json:"grace_period_days"`
	PaymentDueDate     string  `json:"payment_due_date"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

// CancelResponse is the payload returned after cancelling a subscription.
type CancelResponse struct {
	SubscriptionID string `json:"subscription_id"`
	Status         string `json:"status"`
	Message        string `json:"message"`
}

// ListSubscriptionsResponse is a paginated list of subscriptions.
type ListSubscriptionsResponse struct {
	Data  []SubscriptionResponse `json:"data"`
	Total int                    `json:"total"`
	Page  int                    `json:"page"`
	Limit int                    `json:"limit"`
}

// ToSubscriptionResponse converts a domain Subscription to its API DTO.
func ToSubscriptionResponse(s *subscription.Subscription) *SubscriptionResponse {
	return &SubscriptionResponse{
		ID:                 s.ID,
		AthleteID:          s.AthleteID,
		CoachID:            s.CoachID,
		PlanID:             s.PlanID,
		PlanName:           s.PlanName,
		PlanPrice:          s.PlanPrice,
		Currency:           s.Currency,
		BillingPeriod:      s.BillingPeriod,
		Status:             string(s.Status),
		CancelAtPeriodEnd:  s.CancelAtPeriodEnd,
		CurrentPeriodStart: s.CurrentPeriodStart.Format("2006-01-02T15:04:05Z07:00"),
		CurrentPeriodEnd:   s.CurrentPeriodEnd.Format("2006-01-02T15:04:05Z07:00"),
		GracePeriodDays:    s.GracePeriodDays,
		PaymentDueDate:     s.PaymentDueDate.Format("2006-01-02T15:04:05Z07:00"),
		CreatedAt:          s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:          s.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
