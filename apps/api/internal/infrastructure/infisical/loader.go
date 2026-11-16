package infisical

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/logger"
)

// SecretLoader handles loading and caching secrets from Infisical
type SecretLoader struct {
	client    *Client
	config    *Config
	cache     map[string]string
	cacheExp  time.Time
	mu        sync.RWMutex
	loadOnce  sync.Once
	loadErr   error
}

// NewSecretLoader creates a new secret loader
func NewSecretLoader(config *Config) (*SecretLoader, error) {
	if !config.Enabled {
		logger.L().Info("Infisical integration disabled")
		return &SecretLoader{config: config, cache: make(map[string]string)}, nil
	}

	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("infisical config validation failed: %w", err)
	}

	client := NewClient(config.BaseURL, config.ClientID, config.ClientSecret)
	return &SecretLoader{
		client: client,
		config: config,
		cache:  make(map[string]string),
	}, nil
}

// Load loads all secrets from Infisical into the cache
func (l *SecretLoader) Load(ctx context.Context) error {
	l.loadOnce.Do(func() {
		l.loadErr = l.load(ctx)
	})
	return l.loadErr
}

// load performs the actual secret loading
func (l *SecretLoader) load(ctx context.Context) error {
	if !l.config.Enabled {
		return nil
	}

	logger.L().Info("Loading secrets from Infisical",
		zap.String("project", l.config.ProjectID),
		zap.String("environment", l.config.Environment),
		zap.String("path", l.config.SecretPath))

	secrets, err := l.client.GetSecrets(ctx, l.config.ProjectID, l.config.Environment, l.config.SecretPath)
	if err != nil {
		return fmt.Errorf("failed to load secrets from Infisical: %w", err)
	}

	l.mu.Lock()
	l.cache = secrets
	l.cacheExp = time.Now().Add(l.config.CacheTTL)
	l.mu.Unlock()

	logger.L().Info("Successfully loaded secrets from Infisical", zap.Int("count", len(secrets)))
	return nil
}

// Get retrieves a secret from cache, loading if necessary
func (l *SecretLoader) Get(ctx context.Context, key string) (string, error) {
	if !l.config.Enabled {
		return "", fmt.Errorf("infisical not enabled")
	}

	// Try cache first
	l.mu.RLock()
	if val, ok := l.cache[key]; ok && time.Now().Before(l.cacheExp) {
		l.mu.RUnlock()
		return val, nil
	}
	l.mu.RUnlock()

	// Cache miss or expired, reload
	if err := l.Load(ctx); err != nil {
		return "", err
	}

	l.mu.RLock()
	defer l.mu.RUnlock()

	val, ok := l.cache[key]
	if !ok {
		return "", fmt.Errorf("secret not found: %s", key)
	}
	return val, nil
}

// GetOrDefault retrieves a secret or returns a default value
func (l *SecretLoader) GetOrDefault(ctx context.Context, key, defaultValue string) string {
	val, err := l.Get(ctx, key)
	if err != nil {
		return defaultValue
	}
	return val
}

// MustGet retrieves a secret or panics if not found
func (l *SecretLoader) MustGet(ctx context.Context, key string) string {
	val, err := l.Get(ctx, key)
	if err != nil {
		logger.L().Fatal("Required secret not found",
			zap.String("key", key),
			zap.Error(err))
	}
	return val
}

// Refresh forces a cache refresh
func (l *SecretLoader) Refresh(ctx context.Context) error {
	l.mu.Lock()
	l.cacheExp = time.Time{} // Force expiry
	l.mu.Unlock()
	l.loadOnce = sync.Once{} // Reset once
	return l.Load(ctx)
}