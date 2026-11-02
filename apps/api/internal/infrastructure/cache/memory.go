package cache

import (
	"container/list"
	"context"
	"strings"
	"sync"
	"time"
)

// memoryMaxTTL caps entries stored in the in-memory fallback. Redis remains the
// shared production cache; because DelByPrefix invalidation is process-local
// for the memory backend, bounding the TTL limits cross-instance staleness.
const memoryMaxTTL = 10 * time.Minute

type memoryEntry struct {
	key       string
	value     []byte
	expiresAt time.Time
}

// memoryCache is a thread-safe, LRU-evicting, TTL-bounded in-memory Cache used
// when Redis is not configured, so hot read paths still skip the database.
type memoryCache struct {
	mu         sync.Mutex
	maxEntries int
	order      *list.List // front = most recently used
	items      map[string]*list.Element
}

// NewMemory returns an LRU in-memory cache holding up to maxEntries keys
// (defaults to 1024 when non-positive).
func NewMemory(maxEntries int) Cache {
	if maxEntries <= 0 {
		maxEntries = 1024
	}
	return &memoryCache{
		maxEntries: maxEntries,
		order:      list.New(),
		items:      make(map[string]*list.Element, maxEntries),
	}
}

// Get returns the value for key and moves it to the front of the LRU order.
// Expired entries are dropped and reported as a miss.
func (m *memoryCache) Get(_ context.Context, key string) ([]byte, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	el, ok := m.items[key]
	if !ok {
		return nil, false
	}
	e := el.Value.(*memoryEntry)
	if time.Now().After(e.expiresAt) {
		m.removeElement(el)
		return nil, false
	}
	m.order.MoveToFront(el)
	return e.value, true
}

// Set stores value under key. TTLs are clamped to (0, memoryMaxTTL].
func (m *memoryCache) Set(_ context.Context, key string, value []byte, ttl time.Duration) error {
	if ttl <= 0 || ttl > memoryMaxTTL {
		ttl = memoryMaxTTL
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if el, ok := m.items[key]; ok {
		e := el.Value.(*memoryEntry)
		e.value = value
		e.expiresAt = time.Now().Add(ttl)
		m.order.MoveToFront(el)
		return nil
	}

	m.items[key] = m.order.PushFront(&memoryEntry{
		key:       key,
		value:     value,
		expiresAt: time.Now().Add(ttl),
	})
	for m.order.Len() > m.maxEntries {
		m.removeElement(m.order.Back())
	}
	return nil
}

// Del removes the given keys (no-op when absent).
func (m *memoryCache) Del(_ context.Context, keys ...string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, k := range keys {
		if el, ok := m.items[k]; ok {
			m.removeElement(el)
		}
	}
	return nil
}

// DelByPrefix removes every key sharing the given prefix (domain invalidation).
func (m *memoryCache) DelByPrefix(_ context.Context, keyPrefix string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for key, el := range m.items {
		if strings.HasPrefix(key, keyPrefix) {
			m.removeElement(el)
		}
	}
	return nil
}

// removeElement unlinks an element from both the list and the map.
func (m *memoryCache) removeElement(el *list.Element) {
	if el == nil {
		return
	}
	m.order.Remove(el)
	delete(m.items, el.Value.(*memoryEntry).key)
}
