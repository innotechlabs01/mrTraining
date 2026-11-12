// Package subscription defines the PaymentProvider port, the abstraction the
// application layer uses to interact with an external payment gateway (e.g.
// MercadoPago). The domain layer knows nothing about HTTP or external APIs.
package subscription

import (
	"context"
	"errors"
	"net/http"
	"time"
)

// ErrInvalidSignature is returned when a webhook signature does not verify.
var ErrInvalidSignature = errors.New("invalid webhook signature")

// CheckoutRequest is the input to CreateCheckout: the details needed to build a
// payment preference / checkout session in the provider.
type CheckoutRequest struct {
	ExternalReference string // e.g. "subscription:<id>"
	Description       string // human-readable description shown to the payer
	Amount            float64
	Currency          string
	TRM               float64 // TRM for currency conversion (USD to COP)
	SuccessURL        string
	FailureURL        string
	PendingURL        string
	NotificationURL   string
	PayerEmail        string
}

// CheckoutResponse is the provider's answer: where to redirect the payer and a
// reference to poll/fulfill later.
type CheckoutResponse struct {
	CheckoutURL string // init point / sandbox init point
	Reference   string // provider preference or payment id
}

// Payment is a subset of a provider payment record consumed after a webhook.
// The application fetches the payment from the provider (never trusts the
// notification body alone) before fulfilling money movements.
type ProviderPayment struct {
	ID                string
	Status            string // approved | pending | rejected | refunded | charged_back
	ExternalReference string
	TransactionAmount float64
	Currency          string
	DateApproved      *time.Time
}

// PaymentProvider is the port for interacting with an external payment gateway.
// Implementations live in the infrastructure layer (e.g. MercadoPago adapter).
type PaymentProvider interface {
	// CreateCheckout builds a checkout preference/session and returns the URL
	// to redirect the payer to, plus a reference to fulfill on webhook.
	CreateCheckout(ctx context.Context, req CheckoutRequest) (*CheckoutResponse, error)
	// VerifySignature validates the provider's webhook signature over the raw
	// request body. Returns ErrInvalidSignature on mismatch.
	VerifySignature(body []byte, signatureHeader string) error
	// FetchPayment reads a payment back from the provider by id. Used to
	// confirm webhook notifications before fulfilling.
	FetchPayment(ctx context.Context, paymentID string) (*ProviderPayment, error)
	// Refund reverses a previously captured payment (best-effort).
	Refund(ctx context.Context, paymentID string) error
}

// WebhookRequest bundles the raw body and signature header that a transport
// handler extracts from an HTTP request before handing it to the application
// layer.
type WebhookRequest struct {
	Body            []byte
	SignatureHeader string
	HTTPMethod      string
}

// Ensure http is referenced so the package compiles even if a future handler
// needs status codes directly (kept for parity with the port contract).
var _ = http.StatusOK
