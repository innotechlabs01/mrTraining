package mercadopago

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
)

func TestVerifySignature_FailClosedWhenKeyEmpty(t *testing.T) {
	adapter := NewAdapter(&config.Config{MercadoPagoWebhookKey: ""})
	err := adapter.VerifySignature([]byte(`{"id":"123"}`), "ts=1700000000,v1=deadbeef")
	if !errors.Is(err, subscription.ErrInvalidSignature) {
		t.Fatalf("expected ErrInvalidSignature when webhook key is empty, got %v", err)
	}
}

func TestVerifySignature_ValidAndInvalidHMAC(t *testing.T) {
	secret := "mp-secret-123"
	adapter := NewAdapter(&config.Config{MercadoPagoWebhookKey: secret})
	body := []byte(`{"action":"payment.updated","data":{"id":"99"}}`)
	ts := "1700000000"

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts))
	mac.Write(body)
	sig := "ts=" + ts + ",v1=" + hex.EncodeToString(mac.Sum(nil))

	if err := adapter.VerifySignature(body, sig); err != nil {
		t.Fatalf("expected valid signature to pass, got %v", err)
	}

	if err := adapter.VerifySignature(body, "ts=1700000000,v1=0000"); !errors.Is(err, subscription.ErrInvalidSignature) {
		t.Fatalf("expected ErrInvalidSignature for wrong HMAC, got %v", err)
	}
	if err := adapter.VerifySignature(body, ""); !errors.Is(err, subscription.ErrInvalidSignature) {
		t.Fatalf("expected ErrInvalidSignature for empty header, got %v", err)
	}
}
