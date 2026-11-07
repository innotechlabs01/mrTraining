package wompi

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/stretchr/testify/require"
)

func newAdapter(baseURL string) *Adapter {
	return NewAdapterWithURL(&config.Config{
		WompiEnv:          "sandbox",
		WompiEventsSecret: "ev_secret",
		WompiPrivateKey:   "priv_test",
	}, baseURL)
}

func TestAdapterVerifySignatureValid(t *testing.T) {
	secret := "ev_secret"
	bodyMap := map[string]any{
		"data": map[string]any{
			"transaction": map[string]any{"id": "tx_1", "status": "APPROVED"},
		},
		"signature": map[string]any{
			"properties": []string{"data.transaction.id", "data.transaction.status"},
			"checksum":   "",
		},
	}
	concat := "tx_1APPROVED" + secret
	sum := sha256.Sum256([]byte(concat))
	bodyMap["signature"].(map[string]any)["checksum"] = hex.EncodeToString(sum[:])
	b, _ := json.Marshal(bodyMap)

	a := newAdapter("http://unused")
	require.NoError(t, a.VerifySignature(b, "x"))
}

func TestAdapterVerifySignatureInvalidChecksum(t *testing.T) {
	bodyMap := map[string]any{
		"data": map[string]any{
			"transaction": map[string]any{"id": "tx_1", "status": "APPROVED"},
		},
		"signature": map[string]any{
			"properties": []string{"data.transaction.id", "data.transaction.status"},
			"checksum":   "deadbeef",
		},
	}
	b, _ := json.Marshal(bodyMap)
	a := newAdapter("http://unused")
	err := a.VerifySignature(b, "x")
	require.Error(t, err)
	require.ErrorIs(t, err, subscription.ErrInvalidSignature)
}

func TestAdapterVerifySignatureMalformed(t *testing.T) {
	a := newAdapter("http://unused")
	require.ErrorIs(t, a.VerifySignature([]byte("{"), "x"), subscription.ErrInvalidSignature)

	// missing checksum
	b, _ := json.Marshal(map[string]any{
		"data":      map[string]any{"id": "x"},
		"signature": map[string]any{"properties": []string{"data.id"}},
	})
	require.ErrorIs(t, a.VerifySignature(b, "x"), subscription.ErrInvalidSignature)

	// missing property
	b2, _ := json.Marshal(map[string]any{
		"data": map[string]any{"id": "x"},
		"signature": map[string]any{
			"properties": []string{"data.missing"},
			"checksum":   "abc",
		},
	})
	require.ErrorIs(t, a.VerifySignature(b2, "x"), subscription.ErrInvalidSignature)
}

func TestAdapterVerifySignatureEmptySecretAllows(t *testing.T) {
	// Adapter with no events secret skips verification entirely.
	a := NewAdapterWithURL(&config.Config{WompiEnv: "sandbox"}, "http://unused")
	require.NoError(t, a.VerifySignature([]byte("{}"), "x"))
}

func TestAdapterFetchPaymentApproved(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/transactions/tx_approved", r.URL.Path)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": map[string]any{
				"id":              "tx_approved",
				"status":          "APPROVED",
				"reference":       "membership:m_1",
				"amount_in_cents": 4990000,
				"currency":        "COP",
				"finalized_at":    "2026-11-06T12:00:00Z",
			},
		})
	}))
	defer srv.Close()

	a := newAdapter(srv.URL)
	got, err := a.FetchPayment(context.Background(), "tx_approved")
	require.NoError(t, err)
	require.Equal(t, "tx_approved", got.ID)
	require.Equal(t, "approved", got.Status)
	require.Equal(t, "membership:m_1", got.ExternalReference)
	require.InDelta(t, 49900.0, got.TransactionAmount, 0.001)
	require.Equal(t, "COP", got.Currency)
	require.NotNil(t, got.DateApproved)
}

func TestAdapterFetchPaymentPendingAndRejected(t *testing.T) {
	cases := []struct {
		status string
		want   string
	}{
		{"PENDING", "pending"},
		{"DECLINED", "rejected"},
		{"ERROR", "rejected"},
		{"VOIDED", "refunded"},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.status, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_ = json.NewEncoder(w).Encode(map[string]any{
					"data": map[string]any{
						"id":              "tx_" + strings.ToLower(tc.status),
						"status":          tc.status,
						"reference":       "order_1",
						"amount_in_cents": 10000,
						"currency":        "COP",
					},
				})
			}))
			defer srv.Close()

			a := newAdapter(srv.URL)
			got, err := a.FetchPayment(context.Background(), "tx_"+strings.ToLower(tc.status))
			require.NoError(t, err)
			require.Equal(t, tc.want, got.Status)
		})
	}
}

func TestAdapterFetchPaymentIDReferenceMismatch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": map[string]any{
				"id":              "tx_actual",
				"status":          "APPROVED",
				"reference":       "ref_from_gateway",
				"amount_in_cents": 20000,
				"currency":        "USD",
			},
		})
	}))
	defer srv.Close()

	a := newAdapter(srv.URL)
	got, err := a.FetchPayment(context.Background(), "tx_requested")
	require.NoError(t, err)
	// Adapter reports the gateway's own id/reference/amount/currency;
	// callers decide whether they mismatch the notification/local data.
	require.Equal(t, "tx_actual", got.ID)
	require.Equal(t, "ref_from_gateway", got.ExternalReference)
	require.InDelta(t, 200.0, got.TransactionAmount, 0.001)
	require.Equal(t, "USD", got.Currency)
}

func TestAdapterFetchPaymentServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	a := newAdapter(srv.URL)
	_, err := a.FetchPayment(context.Background(), "missing")
	require.Error(t, err)
}

func TestAdapterCreateCheckoutSuccessAndFallbackURL(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/payment_links", r.URL.Path)
		require.Equal(t, "Bearer priv_test", r.Header.Get("Authorization"))
		var body map[string]any
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		require.Equal(t, "order_1", body["sku"])
		// No permalink returned; adapter must fall back to well-known path.
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": map[string]any{"id": "plink_123"},
		})
	}))
	defer srv.Close()

	a := newAdapter(srv.URL)
	resp, err := a.CreateCheckout(context.Background(), subscription.CheckoutRequest{
		ExternalReference: "order_1",
		Description:      "Test order",
		Amount:           12.34,
		Currency:         "COP",
		SuccessURL:       "https://app.test/s",
	})
	require.NoError(t, err)
	require.Equal(t, "https://checkout.wompi.co/l/plink_123", resp.CheckoutURL)
	require.Equal(t, "plink_123", resp.Reference)
}

func TestAdapterCreateCheckoutWithPermalink(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": map[string]any{"id": "plink_2", "permalink": "https://checkout.wompi.co/l/plink_2"},
		})
	}))
	defer srv.Close()

	a := newAdapter(srv.URL)
	resp, err := a.CreateCheckout(context.Background(), subscription.CheckoutRequest{
		Description: "Test",
		Amount:      5,
		Currency:    "COP",
	})
	require.NoError(t, err)
	require.Equal(t, "https://checkout.wompi.co/l/plink_2", resp.CheckoutURL)
}

func TestAdapterCreateCheckoutInvalidAmountAndMissingURL(t *testing.T) {
	a := newAdapter("http://unused")
	_, err := a.CreateCheckout(context.Background(), subscription.CheckoutRequest{Amount: 0, Currency: "COP"})
	require.Error(t, err)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"id": ""}})
	}))
	defer srv.Close()
	a2 := newAdapter(srv.URL)
	_, err = a2.CreateCheckout(context.Background(), subscription.CheckoutRequest{Amount: 1, Currency: "COP"})
	require.Error(t, err)
}

func TestAdapterCreateCheckoutHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"invalid token"}`))
	}))
	defer srv.Close()

	a := newAdapter(srv.URL)
	_, err := a.CreateCheckout(context.Background(), subscription.CheckoutRequest{Amount: 1, Currency: "COP"})
	require.Error(t, err)
}

func TestAdapterCreateCheckoutMalformedResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("{not json"))
	}))
	defer srv.Close()

	a := newAdapter(srv.URL)
	_, err := a.CreateCheckout(context.Background(), subscription.CheckoutRequest{Amount: 1, Currency: "COP"})
	require.Error(t, err)
}

func TestAdapterBaseURLProduction(t *testing.T) {
	a := NewAdapter(&config.Config{WompiEnv: "production"})
	require.Equal(t, "https://production.wompi.co/v1", a.baseURL())

	a2 := NewAdapter(&config.Config{WompiEnv: "sandbox"})
	require.Equal(t, "https://sandbox.wompi.co/v1", a2.baseURL())
}
