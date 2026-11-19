// Package mercadopago implements the subscription.PaymentProvider port using
// MercadoPago's checkout preferences and payments API. Configuration (access
// token, webhook secret, notification URL) is injected via config.Config.
package mercadopago

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
)

// API is the MercadoPago base URL.
const API = "https://api.mercadopago.com"

// Adapter is the MercadoPago implementation of the PaymentProvider port.
type Adapter struct {
	cfg *config.Config
}

// NewAdapter creates a MercadoPago payment adapter.
func NewAdapter(cfg *config.Config) *Adapter {
	return &Adapter{cfg: cfg}
}

// CreateCheckout builds a MercadoPago checkout preference and returns the init
// point URL to redirect the payer to, plus the preference id as reference.
func (a *Adapter) CreateCheckout(ctx context.Context, req subscription.CheckoutRequest) (*subscription.CheckoutResponse, error) {
	body := map[string]interface{}{
		"items": []map[string]interface{}{{
			"title":       req.Description,
			"currency_id": req.Currency,
			"category_id": "subscriptions",
			"quantity":    1,
			"unit_price":  req.Amount,
		}},
		"back_urls": map[string]string{
			"success": req.SuccessURL,
			"failure": req.FailureURL,
			"pending": req.PendingURL,
		},
		"notification_url":     req.NotificationURL,
		"external_reference":   req.ExternalReference,
		"statement_descriptor": "MRTRAINING",
		"payer":                map[string]interface{}{},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal checkout preference: %w", err)
	}

	pref, err := a.postPreference(ctx, payload)
	if err != nil {
		return nil, err
	}
	return &subscription.CheckoutResponse{
		CheckoutURL: pref.point(),
		Reference:   pref.ID,
	}, nil
}

// VerifySignature validates MercadoPago's x-signature header:
//
//	x-signature: ts=<unix-ts>,v1=<hex HMAC-SHA256(ts + body, webhook secret)>
//
// When no webhook secret is configured (dev), it accepts the payload but the
// caller should log loudly. Production must set MERCADO_PAGO_WEBHOOK_SECRET.
func (a *Adapter) VerifySignature(body []byte, signatureHeader string) error {
	if signatureHeader == "" {
		return subscription.ErrInvalidSignature
	}
	if a.cfg.MercadoPagoWebhookKey == "" {
		// Dev convenience: no secret configured → accept but the caller logs.
		return nil
	}

	var ts, v1 string
	for _, part := range strings.Split(signatureHeader, ",") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "ts=") {
			ts = strings.TrimPrefix(part, "ts=")
		} else if strings.HasPrefix(part, "v1=") {
			v1 = strings.TrimPrefix(part, "v1=")
		}
	}
	if ts == "" || v1 == "" {
		return subscription.ErrInvalidSignature
	}

	mac := hmac.New(sha256.New, []byte(a.cfg.MercadoPagoWebhookKey))
	mac.Write([]byte(ts))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(v1)) {
		return subscription.ErrInvalidSignature
	}
	return nil
}

// FetchPayment reads a payment back from MercadoPago by id. Never trusts the
// notification body alone for money movements.
func (a *Adapter) FetchPayment(ctx context.Context, paymentID string) (*subscription.ProviderPayment, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, API+"/v1/payments/"+paymentID, nil)
	if err != nil {
		return nil, fmt.Errorf("create fetch payment request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+a.cfg.MercadoPagoSecretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch payment: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mercadopago payments error: status %d", resp.StatusCode)
	}

	var raw struct {
		ID                string     `json:"id"`
		Status            string     `json:"status"`
		ExternalReference string     `json:"external_reference"`
		TransactionAmount float64    `json:"transaction_amount"`
		CurrencyID        string     `json:"currency_id"`
		DateApproved      *time.Time `json:"date_approved"`
	}
	if err := json.Unmarshal(respBody, &raw); err != nil {
		return nil, fmt.Errorf("unmarshal payment: %w", err)
	}

	return &subscription.ProviderPayment{
		ID:                raw.ID,
		Status:            raw.Status,
		ExternalReference: raw.ExternalReference,
		TransactionAmount: raw.TransactionAmount,
		Currency:          raw.CurrencyID,
		DateApproved:      raw.DateApproved,
	}, nil
}

// Refund reverses a previously captured payment (best-effort).
func (a *Adapter) Refund(ctx context.Context, paymentID string) error {
	body := map[string]interface{}{"payment_id": paymentID}
	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal refund: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, API+"/v1/refunds", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create refund request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.cfg.MercadoPagoSecretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("refund: %w", err)
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body) // discard
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("mercadopago refund error: status %d", resp.StatusCode)
	}
	return nil
}

// mpPreference is the subset of MercadoPago's preference response we consume.
type mpPreference struct {
	ID           string `json:"id"`
	InitPoint    string `json:"init_point"`
	SandboxPoint string `json:"sandbox_init_point"`
}

func (p mpPreference) point() string {
	if p.InitPoint != "" {
		return p.InitPoint
	}
	return p.SandboxPoint
}

func (a *Adapter) postPreference(ctx context.Context, payload []byte) (*mpPreference, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, API+"/checkout/preferences", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create preference request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.cfg.MercadoPagoSecretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mercadopago unavailable: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("mercadopago error: status %d", resp.StatusCode)
	}

	var pref mpPreference
	if err := json.Unmarshal(respBody, &pref); err != nil {
		return nil, fmt.Errorf("unmarshal preference: %w", err)
	}
	if pref.point() == "" {
		return nil, fmt.Errorf("mercadopago did not return init_point")
	}
	return &pref, nil
}
