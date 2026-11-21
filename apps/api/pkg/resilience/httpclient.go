package resilience

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// HTTPObserver receives timing and outcome telemetry for outbound resilient HTTP calls.
type HTTPObserver func(dependency, outcome string, elapsed time.Duration)

var (
	httpObserverMu sync.RWMutex
	httpObserverFn HTTPObserver
)

// SetHTTPObserver registers a process-wide observer for outbound HTTP call metrics.
func SetHTTPObserver(fn HTTPObserver) {
	httpObserverMu.Lock()
	httpObserverFn = fn
	httpObserverMu.Unlock()
}

func observeHTTP(dep, outcome string, elapsed time.Duration) {
	httpObserverMu.RLock()
	fn := httpObserverFn
	httpObserverMu.RUnlock()
	if fn != nil && dep != "" {
		fn(dep, outcome, elapsed)
	}
}

// HTTPClientConfig configures a resilient *http.Client combining per-request
// timeouts, bulkhead concurrency caps, circuit breaking, and optional retries.
type HTTPClientConfig struct {
	Name         string
	Timeout      time.Duration
	Breaker      *CircuitBreaker
	Bulkhead     *Bulkhead
	Retry        *RetryConfig
	RetryMethods map[string]bool
	Base         http.RoundTripper
}

type resilientRoundTripper struct {
	cfg          HTTPClientConfig
	base         http.RoundTripper
	retryMethods map[string]bool
}

// NewHTTPClient returns an *http.Client backed by a resilient RoundTripper.
func NewHTTPClient(cfg HTTPClientConfig) *http.Client {
	if cfg.Timeout <= 0 {
		cfg.Timeout = 10 * time.Second
	}
	base := cfg.Base
	if base == nil {
		t := http.DefaultTransport.(*http.Transport).Clone()
		t.MaxIdleConns = 100
		t.MaxIdleConnsPerHost = 20
		t.IdleConnTimeout = 90 * time.Second
		base = t
	}
	methods := cfg.RetryMethods
	if methods == nil {
		methods = map[string]bool{
			http.MethodGet:     true,
			http.MethodHead:    true,
			http.MethodOptions: true,
		}
	}

	return &http.Client{
		Timeout: cfg.Timeout,
		Transport: &resilientRoundTripper{
			cfg:          cfg,
			base:         base,
			retryMethods: methods,
		},
	}
}

func (rt *resilientRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	start := time.Now()
	ctx := req.Context()
	canRetry := rt.cfg.Retry != nil && rt.retryMethods[strings.ToUpper(req.Method)] &&
		(req.Body == nil || req.GetBody != nil)

	var finalResp *http.Response
	execOnce := func(attemptCtx context.Context) error {
		if finalResp != nil && finalResp.Body != nil {
			_, _ = io.Copy(io.Discard, io.LimitReader(finalResp.Body, 4096))
			_ = finalResp.Body.Close()
		}
		finalResp = nil

		attemptReq := req.Clone(attemptCtx)
		if req.Body != nil && req.GetBody != nil {
			body, err := req.GetBody()
			if err != nil {
				return MarkNonRetryable(err)
			}
			attemptReq.Body = body
		}

		resp, err := rt.base.RoundTrip(attemptReq)
		if err != nil {
			return err
		}
		finalResp = resp

		// Record downstream 5xx and 429 as transient failures so CB & retry react,
		// while preserving finalResp for the caller if it was the last attempt.
		if resp.StatusCode >= 500 || resp.StatusCode == http.StatusTooManyRequests {
			return &HTTPError{StatusCode: resp.StatusCode}
		}
		return nil
	}

	runAttempt := func(runCtx context.Context) error {
		do := func(innerCtx context.Context) error {
			if rt.cfg.Bulkhead != nil {
				return rt.cfg.Bulkhead.Execute(innerCtx, execOnce)
			}
			return execOnce(innerCtx)
		}
		if rt.cfg.Breaker != nil {
			return rt.cfg.Breaker.Execute(runCtx, do)
		}
		return do(runCtx)
	}

	var err error
	if canRetry {
		cfg := *rt.cfg.Retry
		err = Do(ctx, cfg, runAttempt)
	} else {
		err = runAttempt(ctx)
	}

	elapsed := time.Since(start)
	if finalResp != nil {
		outcome := classifyStatusOutcome(finalResp.StatusCode)
		observeHTTP(rt.cfg.Name, outcome, elapsed)
		return finalResp, nil
	}
	if err != nil {
		outcome := "network_error"
		if errors.Is(err, ErrCircuitOpen) || errors.Is(err, ErrHalfOpenLimit) {
			outcome = "circuit_open"
		} else if errors.Is(err, ErrBulkheadFull) {
			outcome = "bulkhead_full"
		}
		observeHTTP(rt.cfg.Name, outcome, elapsed)
		return nil, fmt.Errorf("%s http call: %w", rt.cfg.Name, err)
	}
	observeHTTP(rt.cfg.Name, "ok", elapsed)
	return finalResp, nil
}

func classifyStatusOutcome(status int) string {
	switch {
	case status == http.StatusTooManyRequests:
		return "rate_limited"
	case status >= 500:
		return "server_error"
	case status >= 400:
		return "client_error"
	default:
		return "ok"
	}
}
