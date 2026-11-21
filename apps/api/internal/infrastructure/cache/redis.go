package cache

import (
	"context"
	"errors"
	"time"

	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
	"github.com/innotechlabs01/mr-training-api/pkg/resilience"
	"github.com/redis/go-redis/v9"
)

// RedisCache implements Cache backed by a Redis server.
//
// All operations fail open: Redis connectivity problems or an open circuit
// breaker degrade to cache misses and no-op writes, never to request errors.
type RedisCache struct {
	client *redis.Client
	cb     *resilience.CircuitBreaker
}

// NewRedis connects to the Redis server at addr with aggressive timeouts and
// a fail-open circuit breaker.
func NewRedis(addr string) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     "", // no auth by default; extend if needed
		DB:           0,
		DialTimeout:  500 * time.Millisecond,
		ReadTimeout:  300 * time.Millisecond,
		WriteTimeout: 300 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		// Close to avoid leaking a half-open connection pool.
		_ = client.Close()
		return nil, err
	}

	return NewRedisWithClient(client), nil
}

// NewRedisWithClient wraps an existing *redis.Client with fail-open resilience.
func NewRedisWithClient(client *redis.Client) *RedisCache {
	cb := resilience.RegisterBreaker(resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
		Name:             "redis_cache",
		FailureThreshold: 5,
		ResetTimeout:     10 * time.Second,
	}))
	return &RedisCache{client: client, cb: cb}
}

// Client returns the underlying *redis.Client (nil-safe).
func (r *RedisCache) Client() *redis.Client {
	if r == nil {
		return nil
	}
	return r.client
}

// Breaker returns the Redis cache circuit breaker.
func (r *RedisCache) Breaker() *resilience.CircuitBreaker {
	if r == nil {
		return nil
	}
	return r.cb
}

// Ping verifies Redis connectivity within a short bounded timeout.
func (r *RedisCache) Ping(ctx context.Context) error {
	if r == nil || r.client == nil {
		return errors.New("redis client not configured")
	}
	pingCtx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()
	return r.client.Ping(pingCtx).Err()
}

// Close releases the underlying connection pool.
func (r *RedisCache) Close() error {
	if r == nil || r.client == nil {
		return nil
	}
	return r.client.Close()
}

// Get returns the cached bytes on hit. Any error (including redis.Nil or open
// circuit breaker) is reported as a miss so callers degrade cleanly.
func (r *RedisCache) Get(ctx context.Context, key string) ([]byte, bool) {
	if r == nil || r.client == nil {
		return nil, false
	}
	var val []byte
	err := r.cb.Execute(ctx, func(inner context.Context) error {
		opCtx, cancel := context.WithTimeout(inner, 400*time.Millisecond)
		defer cancel()
		b, getErr := r.client.Get(opCtx, key).Bytes()
		if errors.Is(getErr, redis.Nil) {
			metrics.CacheOperationsTotal.Inc("get", "miss")
			return resilience.MarkNonRetryable(getErr)
		}
		if getErr != nil {
			metrics.CacheOperationsTotal.Inc("get", "error")
			return getErr
		}
		val = b
		return nil
	})
	if err != nil {
		if !errors.Is(err, redis.Nil) && errors.Is(err, resilience.ErrCircuitOpen) {
			metrics.CacheOperationsTotal.Inc("get", "circuit_open")
		}
		return nil, false
	}
	metrics.CacheOperationsTotal.Inc("get", "hit")
	return val, true
}

// Set stores value under key with the given TTL.
func (r *RedisCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if r == nil || r.client == nil {
		return nil
	}
	err := r.cb.Execute(ctx, func(inner context.Context) error {
		opCtx, cancel := context.WithTimeout(inner, 400*time.Millisecond)
		defer cancel()
		return r.client.Set(opCtx, key, value, ttl).Err()
	})
	if err != nil {
		metrics.CacheOperationsTotal.Inc("set", "error")
		return err
	}
	metrics.CacheOperationsTotal.Inc("set", "ok")
	return nil
}

// Del removes one or more keys.
func (r *RedisCache) Del(ctx context.Context, keys ...string) error {
	if r == nil || r.client == nil || len(keys) == 0 {
		return nil
	}
	err := r.cb.Execute(ctx, func(inner context.Context) error {
		opCtx, cancel := context.WithTimeout(inner, 400*time.Millisecond)
		defer cancel()
		return r.client.Del(opCtx, keys...).Err()
	})
	if err != nil {
		metrics.CacheOperationsTotal.Inc("del", "error")
		return err
	}
	metrics.CacheOperationsTotal.Inc("del", "ok")
	return nil
}

// DelByPrefix removes every key matching the given key prefix using a SCAN +
// DELETE pass. SCAN (not KEYS) is used so a large cache does not block Redis.
func (r *RedisCache) DelByPrefix(ctx context.Context, keyPrefix string) error {
	if r == nil || r.client == nil {
		return nil
	}
	const batch = 100
	return r.cb.Execute(ctx, func(inner context.Context) error {
		opCtx, cancel := context.WithTimeout(inner, 2*time.Second)
		defer cancel()
		var cursor uint64
		for {
			keys, next, err := r.client.Scan(opCtx, cursor, keyPrefix+"*", batch).Result()
			if err != nil {
				return err
			}
			if len(keys) > 0 {
				if err := r.client.Del(opCtx, keys...).Err(); err != nil {
					return err
				}
			}
			if next == 0 {
				break
			}
			cursor = next
		}
		return nil
	})
}
