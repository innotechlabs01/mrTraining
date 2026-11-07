// Package wompiavailability implements a fail-closed availability gate for Wompi
// based on the official Wompi Statuspage (https://wompi.statuspage.io).
//
// The service owns an in-memory cache (TTL 30-60s) and is the backend authority
// for whether an online payment checkout may be started. It never performs a
// statuspage request per HTTP request.
package wompiavailability

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// Official Wompi Statuspage component IDs (Colombia).
const (
	ComponentAPI          = "5my08zr85ylh" // API (Col)
	ComponentCheckout     = "cc5d2k9wlmgs" // Checkout (Col)
	ComponentMediaGroup   = "x63cw46w3kmh" // MEDIOS DE PAGO - Colombia
	ComponentPSE          = "8ls5k1tsc5k3" // PSE-ACH (Col)
	ComponentNequi        = "tz4kvvt4nk19" // Nequi (Col)
	ComponentTarjetasFiserv = "9j6kbnq0yl82"
	ComponentTarjetasRBM   = "l7h77160k4bz"
	ComponentTarjetasApp   = "x841dl76dwbp"
)

// Statuspage base URL (overridable for tests).
const DefaultStatusBaseURL = "https://wompi.statuspage.io"

type componentRaw struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Status    string  `json:"status"`
	GroupID   string  `json:"group_id"`
	Group     bool    `json:"group"`
	Showcase  bool    `json:"showcase"`
	OnlyShow  bool    `json:"only_show_if_degraded"`
}

type statusRaw struct {
	Status struct {
		Indicator    string `json:"indicator"`
		Description  string `json:"description"`
	} `json:"status"`
}

type componentsRaw struct {
	Components []componentRaw `json:"components"`
}

type incidentsRaw struct {
	Incidents []struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Status string `json:"status"`
		Impact string `json:"impact"`
	} `json:"incidents"`
}

// MediumAvailability describes one payment medium (PSE, Nequi, ...).
type MediumAvailability struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Status      string `json:"status"`
	Operational bool   `json:"operational"`
}

// Availability is the safe, serializable snapshot returned by the gate.
type Availability struct {
	GateKnown             bool                 `json:"gate_known"`
	CheckedAt             time.Time            `json:"checked_at"`
	OverallIndicator      string               `json:"overall_indicator"`
	OverallDescription    string               `json:"overall_description"`
	CheckoutAllowed       bool                 `json:"checkout_allowed"`
	Reason                string               `json:"reason"`
	Degraded              bool                 `json:"degraded"`
	APIOperational        bool                 `json:"api_operational"`
	CheckoutOperational   bool                 `json:"checkout_operational"`
	Media                 []MediumAvailability `json:"media"`
	UnresolvedIncidents   int                  `json:"unresolved_incidents"`
	FailClosed            bool                 `json:"fail_closed"`
	APIStatus             string               `json:"api_status"`
	CheckoutStatus        string               `json:"checkout_status"`
}

// Service fetches and caches Wompi availability.
type Service struct {
	mu       sync.RWMutex
	cache    *Availability
	cacheAt  time.Time
	ttl      time.Duration
	client   *http.Client
	baseURL  string
	timeout  time.Duration
}

// NewService creates a gate with sane defaults (45s cache, 5s HTTP timeout).
func NewService() *Service {
	return NewServiceWithURL(DefaultStatusBaseURL, &http.Client{Timeout: 5 * time.Second}, 45*time.Second)
}

// NewServiceWithURL allows overriding the statuspage base URL (tests).
func NewServiceWithURL(baseURL string, client *http.Client, ttl time.Duration) *Service {
	if baseURL == "" {
		baseURL = DefaultStatusBaseURL
	}
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}
	if ttl <= 0 {
		ttl = 45 * time.Second
	}
	if ttl < 30*time.Second {
		ttl = 30 * time.Second
	}
	if ttl > 60*time.Second {
		ttl = 60 * time.Second
	}
	timeout := client.Timeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &Service{
		ttl:     ttl,
		client:  client,
		baseURL: baseURL,
		timeout: timeout,
	}
}

// SetTTL overrides cache TTL (clamped to 30-60s).
func (s *Service) SetTTL(ttl time.Duration) {
	if ttl < 30*time.Second {
		ttl = 30 * time.Second
	}
	if ttl > 60*time.Second {
		ttl = 60 * time.Second
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ttl = ttl
}

// Availability returns the current (cached or freshly fetched) snapshot. It never
// returns an error: failures are encoded as fail-closed availability.
func (s *Service) Availability(ctx context.Context) Availability {
	s.mu.RLock()
	if s.cache != nil && time.Since(s.cacheAt) < s.ttl {
		a := *s.cache
		s.mu.RUnlock()
		return a
	}
	s.mu.RUnlock()

	return s.refresh(ctx)
}

// refresh performs the network fetch under a write lock-ish serialization. We
// hold the mutex for the whole fetch to coalesce concurrent callers; fetches
// are short (client timeout <= 5s).
func (s *Service) refresh(ctx context.Context) Availability {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Double-check after acquiring lock.
	if s.cache != nil && time.Since(s.cacheAt) < s.ttl {
		return *s.cache
	}

	avail := s.fetch(ctx)
	s.cache = &avail
	s.cacheAt = time.Now()
	return avail
}

func (s *Service) fetch(ctx context.Context) Availability {
	now := time.Now()
	fail := func(reason string) Availability {
		return Availability{
			GateKnown:           false,
			CheckedAt:           now,
			OverallIndicator:    "unknown",
			OverallDescription:  "Wompi availability unknown",
			CheckoutAllowed:     false,
			Reason:              reason,
			Degraded:            true,
			FailClosed:          true,
		}
	}

	fctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	// 1. status.json
	statusBytes, err := s.getBytes(fctx, "/api/v2/status.json")
	if err != nil {
		return fail("statuspage_unavailable")
	}
	var st statusRaw
	if err := json.Unmarshal(statusBytes, &st); err != nil {
		return fail("statuspage_invalid_json")
	}

	// 2. components.json
	compBytes, err := s.getBytes(fctx, "/api/v2/components.json")
	if err != nil {
		return fail("statuspage_unavailable")
	}
	var cr componentsRaw
	if err := json.Unmarshal(compBytes, &cr); err != nil {
		return fail("statuspage_invalid_json")
	}
	if len(cr.Components) == 0 {
		return fail("statuspage_incomplete")
	}

	// 3. unresolved incidents
	incBytes, _ := s.getBytes(fctx, "/api/v2/incidents/unresolved.json")
	unresolved := 0
	if incBytes != nil {
		var ir incidentsRaw
		if err := json.Unmarshal(incBytes, &ir); err == nil {
			unresolved = len(ir.Incidents)
		}
	}

	// Index components.
	byID := make(map[string]componentRaw, len(cr.Components))
	for _, c := range cr.Components {
		byID[c.ID] = c
	}

	apiComp, hasAPI := byID[ComponentAPI]
	checkoutComp, hasCheckout := byID[ComponentCheckout]
	if !hasAPI || !hasCheckout {
		return fail("statuspage_incomplete")
	}

	apiOK := apiComp.Status == "operational"
	checkoutOK := checkoutComp.Status == "operational"

	// Media: components in MEDIOS group.
	media := make([]MediumAvailability, 0)
	for _, c := range cr.Components {
		if c.GroupID == ComponentMediaGroup {
			media = append(media, MediumAvailability{
				ID:          c.ID,
				Name:        c.Name,
				Status:      c.Status,
				Operational: c.Status == "operational",
			})
		}
	}
	// Stable-ish: keep statuspage order (already).

	degraded := unresolved > 0
	for _, m := range media {
		if !m.Operational {
			degraded = true
		}
	}

	checkoutAllowed := apiOK && checkoutOK

	reason := "ok"
	switch {
	case !apiOK:
		reason = "wompi_api_unavailable"
	case !checkoutOK:
		reason = "wompi_checkout_unavailable"
	case degraded:
		reason = "wompi_degraded"
	}

	avail := Availability{
		GateKnown:           true,
		CheckedAt:           now,
		OverallIndicator:    st.Status.Indicator,
		OverallDescription:  st.Status.Description,
		CheckoutAllowed:     checkoutAllowed,
		Reason:              reason,
		Degraded:            degraded,
		APIOperational:      apiOK,
		CheckoutOperational:  checkoutOK,
		Media:               media,
		UnresolvedIncidents: unresolved,
		FailClosed:          false,
		APIStatus:           apiComp.Status,
		CheckoutStatus:      checkoutComp.Status,
	}
	return avail
}

func (s *Service) getBytes(ctx context.Context, path string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("statuspage %s: http %d", path, resp.StatusCode)
	}
	// Limit to 1 MiB.
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if len(b) == 0 {
		return nil, fmt.Errorf("empty body")
	}
	return b, nil
}

// ---------- Gate methods ----------

// PaymentCheckoutAllowed reports whether a new online payment checkout may start.
func (s *Service) PaymentCheckoutAllowed() bool {
	return s.Availability(context.Background()).CheckoutAllowed
}

// PaymentCheckoutReason returns the reason associated with PaymentCheckoutAllowed.
func (s *Service) PaymentCheckoutReason() string {
	return s.Availability(context.Background()).Reason
}

// Reason is an alias for PaymentCheckoutReason.
func (s *Service) Reason() string { return s.PaymentCheckoutReason() }

// CheckoutAllowed is an alias for PaymentCheckoutAllowed.
func (s *Service) CheckoutAllowed() bool { return s.PaymentCheckoutAllowed() }

// MediumOperational reports whether a specific medium (by component ID or name)
// is currently operational.
func (s *Service) MediumOperational(ref string) bool {
	a := s.Availability(context.Background())
	for _, m := range a.Media {
		if m.ID == ref || m.Name == ref {
			return m.Operational
		}
	}
	// Allow known official IDs that may not be in the media group (none here).
	return false
}

// MediumAllowed is an alias for MediumOperational.
func (s *Service) MediumAllowed(ref string) bool { return s.MediumOperational(ref) }

// MediaStatus returns a map medium_id -> operational.
func (s *Service) MediaStatus() map[string]bool {
	a := s.Availability(context.Background())
	out := make(map[string]bool, len(a.Media))
	for _, m := range a.Media {
		out[m.ID] = m.Operational
		out[m.Name] = m.Operational
	}
	return out
}

// PerMedium is an alias for MediaStatus.
func (s *Service) PerMedium() map[string]bool { return s.MediaStatus() }

// Snapshot returns the full availability snapshot (uses provided ctx for fetch).
func (s *Service) Snapshot(ctx context.Context) Availability {
	return s.Availability(ctx)
}

// Known reports whether the gate has a usable (non-fail-closed) snapshot.
func (s *Service) Known() bool {
	return s.Availability(context.Background()).GateKnown
}