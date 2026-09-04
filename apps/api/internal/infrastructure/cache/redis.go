package cache

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache implements Cache backed by a Redis server.
//
// All operations fail open: Redis connectivity problems degrade to cache
// misses and no-op writes, never to request errors.
type RedisCache struct {
	client *redis.Client
}

// NewRedis connects to the Redis server at addr and verifies the connection.
// It returns the cache and the ping error (the caller may log and continue
// with a no-op cache if Redis is down at boot, or fail hard — caller's choice).
func NewRedis(addr string) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "", // no auth by default; extend if needed
		DB:       0,
	})

	if err := client.Ping(context.Background()).Err(); err != nil {
		// Close to avoid leaking a half-open connection pool.
		_ = client.Close()
		return nil, err
	}

	return &RedisCache{client: client}, nil
}

// Close releases the underlying connection pool.
func (r *RedisCache) Close() error {
	if r == nil || r.client == nil {
		return nil
	}
	return r.client.Close()
}

// Get returns the cached bytes on hit. Any error (including redis.Nil) is
// reported as a miss.
func (r *RedisCache) Get(ctx context.Context, key string) ([]byte, bool) {
	val, err := r.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, false
		}
		return nil, false
	}
	return val, true
}

// Set stores value under key with the given TTL.
func (r *RedisCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	return r.client.Set(ctx, key, value, ttl).Err()
}

// Del removes one or more keys.
func (r *RedisCache) Del(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

// DelByPrefix removes every key matching the given key prefix using a SCAN +
// DELETE pass. SCAN (not KEYS) is used so a large cache does not block Redis.
func (r *RedisCache) DelByPrefix(ctx context.Context, keyPrefix string) error {
	const batch = 100

	var cursor uint64
	for {
		keys, next, err := r.client.Scan(ctx, cursor, keyPrefix+"*", batch).Result()
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := r.client.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}
		if next == 0 {
			break
		}
		cursor = next
	}
	return nil
}
