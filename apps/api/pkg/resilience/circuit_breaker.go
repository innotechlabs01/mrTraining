package resilience

import (
	"context"
	"errors"
	"sync"
	"time"
)

// State represents the lifecycle state of a CircuitBreaker.
type State int32

const (
	StateClosed State = iota
	StateOpen
	StateHalfOpen
)

// String returns the canonical lowercase label for s.
func (s State) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateOpen:
		return "open"
	case StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// Counts captures the current metrics snapshot of a CircuitBreaker.
type Counts struct {
	Requests             uint32    `json:"requests"`
	Successes            uint32    `json:"successes"`
	Failures             uint32    `json:"failures"`
	ConsecutiveFailures  uint32    `json:"consecutive_failures"`
	ConsecutiveSuccesses uint32    `json:"consecutive_successes"`
	OpenUntil            time.Time `json:"open_until,omitempty"`
}

// CircuitBreakerConfig configures failure detection and recovery behavior.
type CircuitBreakerConfig struct {
	Name                string
	FailureThreshold    uint32
	FailureRatio        float64
	MinRequests         uint32
	Interval            time.Duration
	ResetTimeout        time.Duration
	HalfOpenMaxRequests uint32
	SuccessThreshold    uint32
	ShouldTrip          func(error) bool
	OnStateChange       func(name string, from, to State)
	Now                 func() time.Time
}

var (
	defaultStateHookMu sync.RWMutex
	defaultStateHook   func(name string, from, to State)
)

// SetDefaultOnStateChange registers a global hook invoked on every breaker
// state transition (used by pkg/metrics).
func SetDefaultOnStateChange(fn func(name string, from, to State)) {
	defaultStateHookMu.Lock()
	defaultStateHook = fn
	defaultStateHookMu.Unlock()
}

func getDefaultStateHook() func(name string, from, to State) {
	defaultStateHookMu.RLock()
	fn := defaultStateHook
	defaultStateHookMu.RUnlock()
	return fn
}

// CircuitBreaker protects calls against cascading downstream failures.
type CircuitBreaker struct {
	cfg CircuitBreakerConfig

	mu             sync.Mutex
	state          State
	generation     uint64
	expiry         time.Time
	windowStart    time.Time
	halfOpenActive uint32
	counts         Counts
}

// NewCircuitBreaker constructs a CircuitBreaker with safe defaults.
func NewCircuitBreaker(cfg CircuitBreakerConfig) *CircuitBreaker {
	if cfg.FailureThreshold == 0 {
		cfg.FailureThreshold = 5
	}
	if cfg.ResetTimeout <= 0 {
		cfg.ResetTimeout = 30 * time.Second
	}
	if cfg.HalfOpenMaxRequests == 0 {
		cfg.HalfOpenMaxRequests = 1
	}
	if cfg.SuccessThreshold == 0 {
		cfg.SuccessThreshold = 1
	}
	if cfg.FailureRatio > 0 && cfg.MinRequests == 0 {
		cfg.MinRequests = 10
	}
	if cfg.ShouldTrip == nil {
		cfg.ShouldTrip = DefaultShouldTrip
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}

	now := cfg.Now()
	return &CircuitBreaker{
		cfg:         cfg,
		state:       StateClosed,
		windowStart: now,
	}
}

// DefaultShouldTrip treats errors except context.Canceled and NonRetryableError as failures.
func DefaultShouldTrip(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) {
		return false
	}
	return !IsNonRetryable(err)
}

// Name returns the configured circuit breaker name.
func (cb *CircuitBreaker) Name() string {
	return cb.cfg.Name
}

// State returns the current effective state, accounting for ResetTimeout transitions.
func (cb *CircuitBreaker) State() State {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	now := cb.cfg.Now()
	prev, next, changed := cb.advanceStateLocked(now)
	if changed {
		cb.notifyStateChangeUnlocked(prev, next)
	}
	return cb.state
}

// Counts returns a copy of the breaker counters.
func (cb *CircuitBreaker) Counts() Counts {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	c := cb.counts
	if cb.state == StateOpen {
		c.OpenUntil = cb.expiry
	}
	return c
}

// Execute runs fn guarded by the circuit breaker.
func (cb *CircuitBreaker) Execute(ctx context.Context, fn func(context.Context) error) error {
	if ctx != nil && ctx.Err() != nil {
		return ctx.Err()
	}
	done, err := cb.Allow()
	if err != nil {
		return err
	}

	var callErr error
	defer func() {
		if r := recover(); r != nil {
			done(ErrCircuitPanic)
			panic(r)
		}
		done(callErr)
	}()

	callErr = fn(ctx)
	return callErr
}

// ExecuteVal runs value-returning fn guarded by cb.
func ExecuteVal[T any](ctx context.Context, cb *CircuitBreaker, fn func(context.Context) (T, error)) (T, error) {
	var zero T
	if cb == nil {
		return fn(ctx)
	}
	var out T
	err := cb.Execute(ctx, func(inner context.Context) error {
		var innerErr error
		out, innerErr = fn(inner)
		return innerErr
	})
	if err != nil {
		return zero, err
	}
	return out, nil
}

// ErrCircuitPanic is recorded internally if a guarded closure panics before re-panicking.
var ErrCircuitPanic = errors.New("resilience: panic during guarded execution")

// Allow checks admission under the circuit breaker and returns a completion callback
// that must be invoked exactly once when the operation finishes.
func (cb *CircuitBreaker) Allow() (func(error), error) {
	cb.mu.Lock()
	now := cb.cfg.Now()
	from, to, changed := cb.advanceStateLocked(now)

	switch cb.state {
	case StateOpen:
		cb.mu.Unlock()
		if changed {
			cb.emitStateChange(from, to)
		}
		return nil, ErrCircuitOpen
	case StateHalfOpen:
		if cb.halfOpenActive >= cb.cfg.HalfOpenMaxRequests {
			cb.mu.Unlock()
			if changed {
				cb.emitStateChange(from, to)
			}
			return nil, ErrHalfOpenLimit
		}
		cb.halfOpenActive++
	}

	gen := cb.generation
	cb.counts.Requests++
	cb.mu.Unlock()

	if changed {
		cb.emitStateChange(from, to)
	}

	var once sync.Once
	return func(err error) {
		once.Do(func() {
			cb.recordResult(gen, err)
		})
	}, nil
}

func (cb *CircuitBreaker) recordResult(generation uint64, err error) {
	cb.mu.Lock()
	now := cb.cfg.Now()

	if cb.state == StateHalfOpen && cb.halfOpenActive > 0 {
		cb.halfOpenActive--
	}

	if generation != cb.generation {
		cb.mu.Unlock()
		return
	}

	if cb.cfg.ShouldTrip(err) {
		cb.onFailureLocked(now)
	} else {
		cb.onSuccessLocked(now)
	}

	// Copy callback state before releasing mutex.
	cb.mu.Unlock()
}

func (cb *CircuitBreaker) onSuccessLocked(now time.Time) {
	switch cb.state {
	case StateClosed:
		cb.counts.Successes++
		cb.counts.ConsecutiveFailures = 0
		cb.counts.ConsecutiveSuccesses++
	case StateHalfOpen:
		cb.counts.Successes++
		cb.counts.ConsecutiveFailures = 0
		cb.counts.ConsecutiveSuccesses++
		if cb.counts.ConsecutiveSuccesses >= cb.cfg.SuccessThreshold {
			prev := cb.state
			cb.toStateLocked(StateClosed, now)
			cb.notifyStateChangeUnlocked(prev, StateClosed)
		}
	}
}

func (cb *CircuitBreaker) onFailureLocked(now time.Time) {
	switch cb.state {
	case StateClosed:
		cb.counts.Failures++
		cb.counts.ConsecutiveFailures++
		cb.counts.ConsecutiveSuccesses = 0
		shouldOpen := cb.counts.ConsecutiveFailures >= cb.cfg.FailureThreshold
		if !shouldOpen && cb.cfg.FailureRatio > 0 && cb.counts.Requests >= cb.cfg.MinRequests {
			ratio := float64(cb.counts.Failures) / float64(cb.counts.Requests)
			shouldOpen = ratio >= cb.cfg.FailureRatio
		}
		if shouldOpen {
			prev := cb.state
			cb.toStateLocked(StateOpen, now)
			cb.notifyStateChangeUnlocked(prev, StateOpen)
		}
	case StateHalfOpen:
		prev := cb.state
		cb.toStateLocked(StateOpen, now)
		cb.notifyStateChangeUnlocked(prev, StateOpen)
	}
}

func (cb *CircuitBreaker) advanceStateLocked(now time.Time) (State, State, bool) {
	switch cb.state {
	case StateClosed:
		if cb.cfg.Interval > 0 && now.Sub(cb.windowStart) >= cb.cfg.Interval {
			cb.generation++
			cb.counts = Counts{}
			cb.windowStart = now
		}
	case StateOpen:
		if !now.Before(cb.expiry) {
			prev := cb.state
			cb.toStateLocked(StateHalfOpen, now)
			return prev, StateHalfOpen, true
		}
	}
	return cb.state, cb.state, false
}

func (cb *CircuitBreaker) toStateLocked(next State, now time.Time) {
	cb.generation++
	cb.state = next
	cb.counts = Counts{}
	cb.halfOpenActive = 0
	cb.windowStart = now
	if next == StateOpen {
		cb.expiry = now.Add(cb.cfg.ResetTimeout)
	} else {
		cb.expiry = time.Time{}
	}
}

func (cb *CircuitBreaker) emitStateChange(from, to State) {
	if from == to {
		return
	}
	if cb.cfg.OnStateChange != nil {
		cb.cfg.OnStateChange(cb.cfg.Name, from, to)
	}
	if global := getDefaultStateHook(); global != nil {
		global(cb.cfg.Name, from, to)
	}
}

func (cb *CircuitBreaker) notifyStateChangeUnlocked(from, to State) {
	if from == to {
		return
	}
	name := cb.cfg.Name
	fn := cb.cfg.OnStateChange
	global := getDefaultStateHook()
	if fn == nil && global == nil {
		return
	}
	go func() {
		if fn != nil {
			fn(name, from, to)
		}
		if global != nil {
			global(name, from, to)
		}
	}()
}
