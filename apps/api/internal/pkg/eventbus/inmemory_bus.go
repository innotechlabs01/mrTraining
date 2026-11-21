package eventbus

import (
	"context"
	"strings"
	"sync"
)

type inMemSub struct {
	bus         *InMemoryBus
	id          int
	durableName string
	subject     string
	handler     Handler
	active      bool
}

func (s *inMemSub) Unsubscribe() error {
	s.bus.mu.Lock()
	defer s.bus.mu.Unlock()
	s.active = false
	delete(s.bus.subs, s.id)
	return nil
}

// InMemoryBus is a concurrency-safe synchronous/in-process Publisher+Subscriber
// used in unit tests and single-node dev environments without NATS.
type InMemoryBus struct {
	mu        sync.RWMutex
	nextID    int
	subs      map[int]*inMemSub
	processed map[string]map[string]struct{} // consumer -> event_id -> struct{}
	published []DomainEvent
}

// NewInMemoryBus constructs an InMemoryBus ready for pub/sub tests and fallback use.
func NewInMemoryBus() *InMemoryBus {
	return &InMemoryBus{
		subs:      make(map[int]*inMemSub),
		processed: make(map[string]map[string]struct{}),
	}
}

// Publish delivers event to matching active subscribers synchronously.
func (b *InMemoryBus) Publish(ctx context.Context, event DomainEvent) error {
	b.mu.Lock()
	b.published = append(b.published, event)
	targets := make([]*inMemSub, 0, len(b.subs))
	for _, sub := range b.subs {
		if sub.active && matchSubject(sub.subject, event.EventType) {
			targets = append(targets, sub)
		}
	}
	b.mu.Unlock()

	for _, sub := range targets {
		if sub.durableName != "" && event.EventID != "" {
			b.mu.RLock()
			seen := b.processed[sub.durableName] != nil
			if seen {
				_, seen = b.processed[sub.durableName][event.EventID]
			}
			b.mu.RUnlock()
			if seen {
				continue
			}
		}

		if err := sub.handler(ctx, event); err != nil {
			return err
		}

		if sub.durableName != "" && event.EventID != "" {
			b.mu.Lock()
			if b.processed[sub.durableName] == nil {
				b.processed[sub.durableName] = make(map[string]struct{})
			}
			b.processed[sub.durableName][event.EventID] = struct{}{}
			b.mu.Unlock()
		}
	}
	return nil
}

// Subscribe attaches handler to subject patterns (* and > wildcards supported).
func (b *InMemoryBus) Subscribe(_ context.Context, durableName, subject string, handler Handler) (Subscription, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.nextID++
	sub := &inMemSub{
		bus:         b,
		id:          b.nextID,
		durableName: durableName,
		subject:     subject,
		handler:     handler,
		active:      true,
	}
	b.subs[sub.id] = sub
	return sub, nil
}

// PublishedEvents returns a snapshot of all events published to this bus.
func (b *InMemoryBus) PublishedEvents() []DomainEvent {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]DomainEvent, len(b.published))
	copy(out, b.published)
	return out
}

func matchSubject(pattern, subject string) bool {
	if pattern == ">" || pattern == subject {
		return true
	}
	pTokens := strings.Split(pattern, ".")
	sTokens := strings.Split(subject, ".")
	for i := 0; i < len(pTokens); i++ {
		if pTokens[i] == ">" {
			return true
		}
		if i >= len(sTokens) {
			return false
		}
		if pTokens[i] != "*" && pTokens[i] != sTokens[i] {
			return false
		}
	}
	return len(pTokens) == len(sTokens)
}
