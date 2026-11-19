package wompiavailability

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func statusPayload(indicator string) map[string]any {
	return map[string]any{
		"page": map[string]any{"id": "hx", "name": "Wompi", "url": "https://wompi.statuspage.io"},
		"status": map[string]any{"indicator": indicator, "description": "All Systems Operational"},
	}
}

func componentsPayload(comps []map[string]any) map[string]any {
	return map[string]any{
		"page": map[string]any{"id": "hx"},
		"components": comps,
	}
}

func comp(id, name, status, group string) map[string]any {
	c := map[string]any{"id": id, "name": name, "status": status, "group_id": group}
	if group == "" {
		delete(c, "group_id")
	}
	return c
}

func TestAvailability_AllOperational_AllowsCheckout(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v2/status.json":
			json.NewEncoder(w).Encode(statusPayload("none"))
		case "/api/v2/components.json":
			json.NewEncoder(w).Encode(componentsPayload([]map[string]any{
				comp(ComponentAPI, "API (Col)", "operational", ""),
				comp(ComponentCheckout, "Checkout (Col)", "operational", ""),
				comp(ComponentMediaGroup, "MEDIOS DE PAGO - Colombia", "operational", ""),
				comp(ComponentPSE, "PSE-ACH (Col)", "operational", ComponentMediaGroup),
				comp(ComponentNequi, "Nequi (Col)", "operational", ComponentMediaGroup),
			}))
		case "/api/v2/incidents/unresolved.json":
			json.NewEncoder(w).Encode(map[string]any{"page": map[string]any{}, "incidents": []any{}})
		default:
			w.WriteHeader(404)
		}
	}))
	defer ts.Close()

	svc := NewServiceWithURL(ts.URL, &http.Client{Timeout: 2 * time.Second}, 30*time.Second)
	av := svc.Availability(t.Context())
	if !av.CheckoutAllowed {
		t.Fatalf("expected checkout allowed, got %+v", av)
	}
	if !svc.PaymentCheckoutAllowed() {
		t.Fatal("PaymentCheckoutAllowed false")
	}
	if !svc.MediumAllowed(ComponentPSE) {
		t.Fatal("PSE medium not operational")
	}
}

func TestAvailability_APIDownFailsClosed(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v2/status.json":
			json.NewEncoder(w).Encode(statusPayload("major"))
		case "/api/v2/components.json":
			json.NewEncoder(w).Encode(componentsPayload([]map[string]any{
				comp(ComponentAPI, "API (Col)", "major_outage", ""),
				comp(ComponentCheckout, "Checkout (Col)", "operational", ""),
				comp(ComponentMediaGroup, "MEDIOS DE PAGO - Colombia", "operational", ""),
			}))
		case "/api/v2/incidents/unresolved.json":
			json.NewEncoder(w).Encode(map[string]any{"incidents": []any{}})
		}
	}))
	defer ts.Close()

	svc := NewServiceWithURL(ts.URL, &http.Client{Timeout: 2 * time.Second}, 30*time.Second)
	av := svc.Availability(t.Context())
	if av.CheckoutAllowed {
		t.Fatal("expected checkout not allowed")
	}
	if av.GateKnown != true {
		t.Fatal("expected known")
	}
}

func TestAvailability_InvalidJSON_FailsClosed(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("not json"))
	}))
	defer ts.Close()

	svc := NewServiceWithURL(ts.URL, &http.Client{Timeout: 2 * time.Second}, 30*time.Second)
	av := svc.Availability(t.Context())
	if av.CheckoutAllowed || av.GateKnown || !av.FailClosed {
		t.Fatalf("expected fail closed, got %+v", av)
	}
	if svc.PaymentCheckoutReason() == "" {
		t.Fatal("missing reason")
	}
}

func TestAvailability_MediaDown_DegradesButCheckoutAllowed(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v2/status.json":
			json.NewEncoder(w).Encode(statusPayload("none"))
		case "/api/v2/components.json":
			json.NewEncoder(w).Encode(componentsPayload([]map[string]any{
				comp(ComponentAPI, "API (Col)", "operational", ""),
				comp(ComponentCheckout, "Checkout (Col)", "operational", ""),
				comp(ComponentMediaGroup, "MEDIOS DE PAGO - Colombia", "operational", ""),
				comp(ComponentPSE, "PSE-ACH (Col)", "major_outage", ComponentMediaGroup),
			}))
		case "/api/v2/incidents/unresolved.json":
			json.NewEncoder(w).Encode(map[string]any{"incidents": []any{}})
		}
	}))
	defer ts.Close()

	svc := NewServiceWithURL(ts.URL, &http.Client{Timeout: 2 * time.Second}, 30*time.Second)
	av := svc.Availability(t.Context())
	if !av.CheckoutAllowed {
		t.Fatal("checkout should remain allowed when only PSE down")
	}
	if !av.Degraded {
		t.Fatal("expected degraded")
	}
	if svc.MediumAllowed(ComponentPSE) {
		t.Fatal("PSE should not be allowed")
	}
}

func TestCache_DoesNotQueryPerRequest(t *testing.T) {
	calls := 0
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		switch r.URL.Path {
		case "/api/v2/status.json":
			json.NewEncoder(w).Encode(statusPayload("none"))
		case "/api/v2/components.json":
			json.NewEncoder(w).Encode(componentsPayload([]map[string]any{
				comp(ComponentAPI, "API (Col)", "operational", ""),
				comp(ComponentCheckout, "Checkout (Col)", "operational", ""),
				comp(ComponentMediaGroup, "MEDIOS DE PAGO - Colombia", "operational", ""),
			}))
		case "/api/v2/incidents/unresolved.json":
			json.NewEncoder(w).Encode(map[string]any{"incidents": []any{}})
		}
	}))
	defer ts.Close()

	svc := NewServiceWithURL(ts.URL, &http.Client{Timeout: 2 * time.Second}, 30*time.Second)
	svc.Availability(t.Context())
	svc.Availability(t.Context())
	svc.Availability(t.Context())
	if calls > 4 { // status + components + incidents (optional) <=3, first call only
		t.Fatalf("expected cached, too many calls: %d", calls)
	}
	// ensure at most one full round (~3 endpoints)
	if calls > 3 {
		t.Fatalf("expected <=3 endpoint calls for cached reads, got %d", calls)
	}
}
 