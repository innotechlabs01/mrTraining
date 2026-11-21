package resilience

import (
	"sort"
	"sync"
)

// BreakerSnapshot describes the runtime state of a registered CircuitBreaker.
type BreakerSnapshot struct {
	Name   string `json:"name"`
	State  string `json:"state"`
	Counts Counts `json:"counts"`
}

// Registry tracks named CircuitBreakers for observability endpoints such as /ready and /metrics.
type Registry struct {
	mu       sync.RWMutex
	breakers map[string]*CircuitBreaker
}

// NewRegistry creates an empty CircuitBreaker registry.
func NewRegistry() *Registry {
	return &Registry{breakers: make(map[string]*CircuitBreaker)}
}

// DefaultRegistry is the process-wide registry of external dependency circuit breakers.
var DefaultRegistry = NewRegistry()

// Register stores cb under its configured name (no-op if nil or unnamed).
func (r *Registry) Register(cb *CircuitBreaker) *CircuitBreaker {
	if r == nil || cb == nil || cb.Name() == "" {
		return cb
	}
	r.mu.Lock()
	r.breakers[cb.Name()] = cb
	r.mu.Unlock()
	return cb
}

// Get retrieves a registered breaker by name.
func (r *Registry) Get(name string) (*CircuitBreaker, bool) {
	if r == nil {
		return nil, false
	}
	r.mu.RLock()
	cb, ok := r.breakers[name]
	r.mu.RUnlock()
	return cb, ok
}

// Snapshot returns deterministic, name-sorted state and counters for all breakers.
func (r *Registry) Snapshot() []BreakerSnapshot {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	names := make([]string, 0, len(r.breakers))
	for name := range r.breakers {
		names = append(names, name)
	}
	sort.Strings(names)
	out := make([]BreakerSnapshot, 0, len(names))
	for _, name := range names {
		cb := r.breakers[name]
		out = append(out, BreakerSnapshot{
			Name:   name,
			State:  cb.State().String(),
			Counts: cb.Counts(),
		})
	}
	r.mu.RUnlock()
	return out
}

// RegisterBreaker registers cb on DefaultRegistry and returns it.
func RegisterBreaker(cb *CircuitBreaker) *CircuitBreaker {
	return DefaultRegistry.Register(cb)
}
