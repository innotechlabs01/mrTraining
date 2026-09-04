package cache

import (
	"context"
	"testing"
	"time"

	miniredis "github.com/alicebob/miniredis/v2"
)

func TestRedisCacheSetGet(t *testing.T) {
	mr := miniredis.RunT(t)
	rc, err := NewRedis(mr.Addr())
	if err != nil {
		t.Fatalf("NewRedis: %v", err)
	}
	defer rc.Close()

	ctx := context.Background()
	if err := rc.Set(ctx, "k:1", []byte("hello"), time.Minute); err != nil {
		t.Fatalf("Set: %v", err)
	}

	got, ok := rc.Get(ctx, "k:1")
	if !ok {
		t.Fatal("expected hit after Set")
	}
	if string(got) != "hello" {
		t.Fatalf("got %q, want %q", got, "hello")
	}
}

func TestRedisCacheMiss(t *testing.T) {
	mr := miniredis.RunT(t)
	rc, err := NewRedis(mr.Addr())
	if err != nil {
		t.Fatalf("NewRedis: %v", err)
	}
	defer rc.Close()

	if _, ok := rc.Get(context.Background(), "missing"); ok {
		t.Fatal("expected miss for unknown key")
	}
}

func TestRedisCacheExpiry(t *testing.T) {
	mr := miniredis.RunT(t)
	rc, err := NewRedis(mr.Addr())
	if err != nil {
		t.Fatalf("NewRedis: %v", err)
	}
	defer rc.Close()

	ctx := context.Background()
	if err := rc.Set(ctx, "k:ttl", []byte("v"), 50*time.Millisecond); err != nil {
		t.Fatalf("Set: %v", err)
	}

	// miniredis fast-forwards expiry deterministically.
	mr.FastForward(100 * time.Millisecond)

	if _, ok := rc.Get(ctx, "k:ttl"); ok {
		t.Fatal("expected miss after TTL expired")
	}
}

func TestRedisCacheDel(t *testing.T) {
	mr := miniredis.RunT(t)
	rc, err := NewRedis(mr.Addr())
	if err != nil {
		t.Fatalf("NewRedis: %v", err)
	}
	defer rc.Close()

	ctx := context.Background()
	rc.Set(ctx, "a", []byte("1"), time.Minute)
	rc.Set(ctx, "b", []byte("2"), time.Minute)

	if err := rc.Del(ctx, "a", "b"); err != nil {
		t.Fatalf("Del: %v", err)
	}

	if _, ok := rc.Get(ctx, "a"); ok {
		t.Fatal("expected 'a' deleted")
	}
	if _, ok := rc.Get(ctx, "b"); ok {
		t.Fatal("expected 'b' deleted")
	}
}

func TestRedisCacheDelByPrefix(t *testing.T) {
	mr := miniredis.RunT(t)
	rc, err := NewRedis(mr.Addr())
	if err != nil {
		t.Fatalf("NewRedis: %v", err)
	}
	defer rc.Close()

	ctx := context.Background()
	rc.Set(ctx, "cache:v1:products:a", []byte("1"), time.Minute)
	rc.Set(ctx, "cache:v1:products:b", []byte("2"), time.Minute)
	rc.Set(ctx, "cache:v1:events:c", []byte("3"), time.Minute) // different prefix, must survive

	if err := rc.DelByPrefix(ctx, "cache:v1:products:"); err != nil {
		t.Fatalf("DelByPrefix: %v", err)
	}

	if _, ok := rc.Get(ctx, "cache:v1:products:a"); ok {
		t.Fatal("expected products:a deleted")
	}
	if _, ok := rc.Get(ctx, "cache:v1:products:b"); ok {
		t.Fatal("expected products:b deleted")
	}
	if v, ok := rc.Get(ctx, "cache:v1:events:c"); !ok || string(v) != "3" {
		t.Fatalf("expected events:c preserved, got ok=%v val=%s", ok, v)
	}
}

func TestNoopCache(t *testing.T) {
	ctx := context.Background()
	nc := NewNoop()
	if _, ok := nc.Get(ctx, "k"); ok {
		t.Fatal("noop should never hit")
	}
	if err := nc.Set(ctx, "k", []byte("v"), time.Minute); err != nil {
		t.Fatalf("noop Set: %v", err)
	}
	if err := nc.Del(ctx, "k"); err != nil {
		t.Fatalf("noop Del: %v", err)
	}
}
