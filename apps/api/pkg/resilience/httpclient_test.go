package resilience

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"sync/atomic"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func makeHTTPResp(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Status:     http.StatusText(status),
		Header:     make(http.Header),
		Body:       io.NopCloser(bytes.NewBufferString(body)),
	}
}

func TestHTTPClient_RetriesGETAndDoesNotRetryPOST(t *testing.T) {
	var getCalls, postCalls atomic.Int32
	baseRT := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method == http.MethodGet {
			if getCalls.Add(1) < 3 {
				return makeHTTPResp(http.StatusBadGateway, "bad gateway"), nil
			}
			return makeHTTPResp(http.StatusOK, "recovered"), nil
		}
		postCalls.Add(1)
		return makeHTTPResp(http.StatusServiceUnavailable, "unavailable"), nil
	})

	cb := NewCircuitBreaker(CircuitBreakerConfig{Name: "test-http", FailureThreshold: 10})
	client := NewHTTPClient(HTTPClientConfig{
		Name:    "test-http",
		Timeout: 2 * time.Second,
		Breaker: cb,
		Base:    baseRT,
		Retry: &RetryConfig{
			MaxAttempts:  3,
			InitialDelay: 5 * time.Millisecond,
			MaxDelay:     20 * time.Millisecond,
			Multiplier:   2,
		},
	})

	resp, err := client.Get("https://example.test/ok")
	if err != nil {
		t.Fatalf("GET failed: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK || getCalls.Load() != 3 {
		t.Fatalf("expected GET recovery after 3 calls, status=%d calls=%d", resp.StatusCode, getCalls.Load())
	}

	postResp, err := client.Post("https://example.test/pay", "application/json", bytes.NewBufferString(`{}`))
	if err != nil {
		t.Fatalf("POST err: %v", err)
	}
	_ = postResp.Body.Close()
	if postCalls.Load() != 1 {
		t.Fatalf("expected non-idempotent POST not retried, got %d calls", postCalls.Load())
	}
}

func TestHTTPClient_TripsCircuitBreakerAndFailsFast(t *testing.T) {
	var calls atomic.Int32
	baseRT := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls.Add(1)
		return makeHTTPResp(http.StatusInternalServerError, "down"), nil
	})

	reg := NewRegistry()
	cb := reg.Register(NewCircuitBreaker(CircuitBreakerConfig{
		Name:             "failing-api",
		FailureThreshold: 2,
		ResetTimeout:     time.Minute,
	}))
	client := NewHTTPClient(HTTPClientConfig{
		Name:    "failing-api",
		Timeout: time.Second,
		Breaker: cb,
		Base:    baseRT,
	})

	for i := 0; i < 2; i++ {
		resp, err := client.Get("https://example.test")
		if err != nil {
			t.Fatalf("attempt %d unexpected err: %v", i, err)
		}
		_ = resp.Body.Close()
	}

	req, _ := http.NewRequestWithContext(context.Background(), http.MethodGet, "https://example.test", nil)
	_, err := client.Do(req)
	if !errors.Is(err, ErrCircuitOpen) {
		t.Fatalf("expected ErrCircuitOpen on 3rd call, got %v", err)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected server hit only 2 times, got %d", calls.Load())
	}
	if snap := reg.Snapshot(); len(snap) != 1 || snap[0].State != "open" {
		t.Fatalf("unexpected registry snapshot: %+v", snap)
	}
}
