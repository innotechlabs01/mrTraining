package wompi

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
)

type Adapter struct {
	cfg            *config.Config
	baseURLOverride string
}

// NewAdapterWithURL creates an adapter whose Wompi base URL can be overridden
// (used by local/simulated HTTP tests). Production code should use NewAdapter.
func NewAdapterWithURL(cfg *config.Config, baseURL string) *Adapter {
	a := NewAdapter(cfg)
	a.baseURLOverride = baseURL
	return a
}

func NewAdapter(cfg *config.Config) *Adapter {
	return &Adapter{cfg: cfg}
}

func (a *Adapter) baseURL() string {
	if a.baseURLOverride != "" {
		return strings.TrimRight(a.baseURLOverride, "/")
	}
	if strings.EqualFold(strings.TrimSpace(a.cfg.WompiEnv), "production") {
		return "https://production.wompi.co/v1"
	}
	return "https://sandbox.wompi.co/v1"
}

func (a *Adapter) CreateCheckout(ctx context.Context, req subscription.CheckoutRequest) (*subscription.CheckoutResponse, error) {
	currency := req.Currency
	if currency == "" {
		currency = "COP"
	}
	cents := int64(math.Round(req.Amount * 100))
	if cents <= 0 {
		return nil, fmt.Errorf("wompi amount must be positive")
	}

	body := map[string]interface{}{
		"name":             req.Description,
		"description":      req.Description,
		"single_use":       true,
		"collect_shipping": false,
		"currency":         currency,
		"amount_in_cents":  cents,
		"redirect_url":     req.SuccessURL,
	}
	if req.ExternalReference != "" {
		body["sku"] = req.ExternalReference
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal wompi payment link: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.baseURL()+"/payment_links", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create wompi request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if a.cfg.WompiPrivateKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+a.cfg.WompiPrivateKey)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("wompi unavailable: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("wompi error: status %d: %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		Data struct {
			ID        string `json:"id"`
			Permalink string `json:"permalink"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("unmarshal wompi payment link: %w", err)
	}
	checkoutURL := parsed.Data.Permalink
	if checkoutURL == "" && parsed.Data.ID != "" {
		// Wompi's payment_links API does not return a permalink; the public
		// checkout page is mounted at this well-known path.
		checkoutURL = "https://checkout.wompi.co/l/" + parsed.Data.ID
	}
	if checkoutURL == "" {
		return nil, fmt.Errorf("wompi did not return checkout url")
	}
	ref := parsed.Data.ID
	if ref == "" {
		ref = req.ExternalReference
	}
	return &subscription.CheckoutResponse{
		CheckoutURL: checkoutURL,
		Reference:   ref,
	}, nil
}

func (a *Adapter) VerifySignature(body []byte, signatureHeader string) error {
	secret := a.cfg.WompiEventsSecret
	if secret == "" {
		return nil
	}

	var event struct {
		Signature struct {
			Checksum   string   `json:"checksum"`
			Properties []string `json:"properties"`
		} `json:"signature"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		return subscription.ErrInvalidSignature
	}
	if event.Signature.Checksum == "" {
		return subscription.ErrInvalidSignature
	}

	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return subscription.ErrInvalidSignature
	}

	var b strings.Builder
	for _, prop := range event.Signature.Properties {
		v, ok := resolveProperty(raw, prop)
		if !ok {
			return subscription.ErrInvalidSignature
		}
		b.WriteString(stringify(v))
	}
	b.WriteString(secret)

	sum := sha256.Sum256([]byte(b.String()))
	if !strings.EqualFold(hex.EncodeToString(sum[:]), event.Signature.Checksum) {
		return subscription.ErrInvalidSignature
	}
	return nil
}

func resolveProperty(root map[string]any, path string) (any, bool) {
	cur := any(root)
	for _, part := range strings.Split(path, ".") {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}
		v, ok := m[part]
		if !ok {
			return nil, false
		}
		cur = v
	}
	return cur, true
}

func stringify(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case bool:
		if x {
			return "true"
		}
		return "false"
	case float64:
		if x == math.Trunc(x) {
			return strconv.FormatInt(int64(x), 10)
		}
		return strconv.FormatFloat(x, 'f', -1, 64)
	case float32:
		if float32(math.Trunc(float64(x))) == x {
			return strconv.FormatInt(int64(x), 10)
		}
		return strconv.FormatFloat(float64(x), 'f', -1, 32)
	case string:
		return x
	default:
		return fmt.Sprintf("%v", x)
	}
}

func (a *Adapter) FetchPayment(ctx context.Context, paymentID string) (*subscription.ProviderPayment, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.baseURL()+"/transactions/"+paymentID, nil)
	if err != nil {
		return nil, fmt.Errorf("create wompi fetch request: %w", err)
	}
	if a.cfg.WompiPrivateKey != "" {
		req.Header.Set("Authorization", "Bearer "+a.cfg.WompiPrivateKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch wompi payment: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("wompi transactions error: status %d", resp.StatusCode)
	}

	var parsed struct {
		Data struct {
			ID            string  `json:"id"`
			Status        string  `json:"status"`
			Reference     string  `json:"reference"`
			AmountInCents int64   `json:"amount_in_cents"`
			Currency      string  `json:"currency"`
			FinalizedAt   *string `json:"finalized_at"`
			CreatedAt     *string `json:"created_at"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("unmarshal wompi transaction: %w", err)
	}

	status := strings.ToLower(parsed.Data.Status)
	switch status {
	case "approved":
		status = "approved"
	case "pending":
		status = "pending"
	case "declined", "error":
		status = "rejected"
	case "voided":
		status = "refunded"
	}

	var date *time.Time
	for _, raw := range []*string{parsed.Data.FinalizedAt, parsed.Data.CreatedAt} {
		if raw != nil && *raw != "" {
			if t, err := time.Parse(time.RFC3339, *raw); err == nil {
				date = &t
				break
			}
		}
	}

	return &subscription.ProviderPayment{
		ID:                parsed.Data.ID,
		Status:            status,
		ExternalReference: parsed.Data.Reference,
		TransactionAmount: float64(parsed.Data.AmountInCents) / 100.0,
		Currency:          parsed.Data.Currency,
		DateApproved:      date,
	}, nil
}

func (a *Adapter) Refund(ctx context.Context, paymentID string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.baseURL()+"/transactions/"+paymentID+"/void", nil)
	if err != nil {
		return fmt.Errorf("create wompi refund request: %w", err)
	}
	if a.cfg.WompiPrivateKey != "" {
		req.Header.Set("Authorization", "Bearer "+a.cfg.WompiPrivateKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("wompi refund: %w", err)
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("wompi refund error: status %d", resp.StatusCode)
	}
	return nil
}
