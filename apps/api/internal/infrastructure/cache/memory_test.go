package cache

import (
	"context"
	"testing"
	"time"
)

func TestMemoryCacheSetGet(t *testing.T) {
	ctx := context.Background()
	m := NewMemory(8)

	if _, ok := m.Get(ctx, "missing"); ok {
		t.Fatal("expected miss for missing key")
	}

	if err := m.Set(ctx, "k", []byte("v"), time.Minute); err != nil {
		t.Fatalf("Set() error: %v", err)
	}
	got, ok := m.Get(ctx, "k")
	if !ok || string(got) != "v" {
		t.Fatalf("Get() = (%q, %v), want (\"v\", true)", got, ok)
	}
}

func TestMemoryCacheExpiry(t *testing.T) {
	ctx := context.Background()
	m := NewMemory(8)

	if err := m.Set(ctx, "k", []byte("v"), 10*time.Millisecond); err != nil {
		t.Fatalf("Set() error: %v", err)
	}
	time.Sleep(25 * time.Millisecond)

	if _, ok := m.Get(ctx, "k"); ok {
		t.Fatal("expected expired entry to miss")
	}
}

func TestMemoryCacheLRUEviction(t *testing.T) {
	ctx := context.Background()
	m := NewMemory(2)

	_ = m.Set(ctx, "a", []byte("1"), time.Minute)
	_ = m.Set(ctx, "b", []byte("2"), time.Minute)
	// Touch "a" so "b" becomes the least recently used entry.
	if _, ok := m.Get(ctx, "a"); !ok {
		t.Fatal("expected hit for key a")
	}
	_ = m.Set(ctx, "c", []byte("3"), time.Minute)

	if _, ok := m.Get(ctx, "b"); ok {
		t.Fatal("expected LRU entry b to be evicted")
	}
	if _, ok := m.Get(ctx, "a"); !ok {
		t.Fatal("expected recently used entry a to survive")
	}
	if _, ok := m.Get(ctx, "c"); !ok {
		t.Fatal("expected newest entry c to survive")
	}
}

func TestMemoryCacheDelByPrefix(t *testing.T) {
	ctx := context.Background()
	m := NewMemory(8)

	_ = m.Set(ctx, "cache:v1:blog:one", []byte("1"), time.Minute)
	_ = m.Set(ctx, "cache:v1:blog:two", []byte("2"), time.Minute)
	_ = m.Set(ctx, "cache:v1:events:one", []byte("3"), time.Minute)

	if err := m.DelByPrefix(ctx, "cache:v1:blog:"); err != nil {
		t.Fatalf("DelByPrefix() error: %v", err)
	}

	if _, ok := m.Get(ctx, "cache:v1:blog:one"); ok {
		t.Fatal("expected blog entry to be invalidated")
	}
	if _, ok := m.Get(ctx, "cache:v1:blog:two"); ok {
		t.Fatal("expected blog entry to be invalidated")
	}
	if _, ok := m.Get(ctx, "cache:v1:events:one"); !ok {
		t.Fatal("expected events entry to survive blog invalidation")
	}
}

func TestMemoryCacheTTLClamped(t *testing.T) {
	ctx := context.Background()
	m := NewMemory(8)

	// A 24h TTL must be clamped to memoryMaxTTL (10m) so the process-local
	// fallback never serves day-old data after cross-instance invalidation.
	if err := m.Set(ctx, "k", []byte("v"), 24*time.Hour); err != nil {
		t.Fatalf("Set() error: %v", err)
	}
	e := m.(*memoryCache).items["k"].Value.(*memoryEntry)
	if until := time.Until(e.expiresAt); until > memoryMaxTTL+time.Second {
		t.Errorf("expiry = %v, want <= %v", until, memoryMaxTTL)
	}
}
