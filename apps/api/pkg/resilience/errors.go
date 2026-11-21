package resilience

import (
	"errors"
	"fmt"
)

var (
	// ErrCircuitOpen is returned immediately when a circuit breaker is in the open state.
	ErrCircuitOpen = errors.New("resilience: circuit breaker is open")
	// ErrHalfOpenLimit is returned when the maximum probe calls in half-open state are already running.
	ErrHalfOpenLimit = errors.New("resilience: half-open probe limit reached")
	// ErrBulkheadFull is returned when all concurrent execution slots in a bulkhead are occupied.
	ErrBulkheadFull = errors.New("resilience: bulkhead capacity exceeded")
)

// NonRetryableError wraps errors (such as 4xx client validation failures) that
// should neither be retried nor trip a circuit breaker.
type NonRetryableError struct {
	Err error
}

func (e *NonRetryableError) Error() string {
	if e == nil || e.Err == nil {
		return "non-retryable error"
	}
	return e.Err.Error()
}

func (e *NonRetryableError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

// MarkNonRetryable wraps err so retry loops and circuit breakers treat it as a
// caller/domain error rather than a downstream failure. Returns nil if err is nil.
func MarkNonRetryable(err error) error {
	if err == nil {
		return nil
	}
	var nre *NonRetryableError
	if errors.As(err, &nre) {
		return err
	}
	return &NonRetryableError{Err: err}
}

// IsNonRetryable reports whether err is marked non-retryable or is a non-429 4xx HTTP error.
func IsNonRetryable(err error) bool {
	if err == nil {
		return false
	}
	var nre *NonRetryableError
	if errors.As(err, &nre) {
		return true
	}
	var he *HTTPError
	if errors.As(err, &he) {
		return he.IsClientError()
	}
	return false
}

// HTTPError represents an upstream HTTP failure status response.
type HTTPError struct {
	StatusCode int
	Body       string
}

func (e *HTTPError) Error() string {
	if e.Body != "" {
		return fmt.Sprintf("http status %d: %s", e.StatusCode, e.Body)
	}
	return fmt.Sprintf("http status %d", e.StatusCode)
}

// IsClientError reports whether StatusCode is a 4xx client error other than 429 Too Many Requests.
func (e *HTTPError) IsClientError() bool {
	return e != nil && e.StatusCode >= 400 && e.StatusCode < 500 && e.StatusCode != 429
}
