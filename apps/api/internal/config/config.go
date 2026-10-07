// Package config provides application configuration management.
// It loads configuration from environment variables with sensible defaults
// and validates required values in production.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all application configuration values.
type Config struct {
	// App
	AppEnv  string // Application environment: development, staging, production
	AppPort string // HTTP server port
	AppName string // Application name for logging and identification

	// Database
	DatabaseURL    string // Turso/LibSQL connection URL
	TursoAuthToken string // Turso authentication token

	// Auth (Clerk)
	ClerkSecretKey      string // Clerk secret key for backend API calls
	ClerkPublishableKey string // Clerk publishable key for frontend
	ClerkJWKSURL        string // Optional: Custom JWKS URL for token verification

	// Firebase (FCM — optional, skip if empty)
	FirebaseProjectID   string // Firebase project ID for FCM
	FirebaseClientEmail string // Firebase service account client email
	FirebasePrivateKey  string // Firebase service account private key (PEM)

	// CORS
	CORSOrigins string // Allowed CORS origins, comma-separated

	// Cache (Redis — optional, disabled when empty)
	RedisURL string // Redis connection URL; empty disables response caching

	// Traffic / proxy
	TrustedProxies     []string // IPs/CIDRs allowed to set X-Forwarded-For (empty = ignore forwarded headers)
	RateLimitMax       int      // Max requests per window, per client IP
	RateLimitWindowSec int      // Rate limit window in seconds

	// Logging
	LogLevel string // Log level: debug, info, warn, error
}

// Load reads configuration from environment variables and .env file.
// It applies default values for optional fields and validates required fields
// based on the application environment.
func Load() (*Config, error) {
	// Attempt to load .env file; ignore if missing (Docker, CI)
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "3001"),
		AppName: getEnv("APP_NAME", "mr-training-api"),

		DatabaseURL:    getEnv("DATABASE_URL", getEnv("TURSO_URL", "")),
		TursoAuthToken: getEnv("TURSO_AUTH_TOKEN", ""),

		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),
		ClerkPublishableKey: getEnv("CLERK_PUBLISHABLE_KEY", ""),
		ClerkJWKSURL:        getEnv("CLERK_JWKS_URL", ""),

		FirebaseProjectID:   getEnv("FIREBASE_PROJECT_ID", ""),
		FirebaseClientEmail: getEnv("FIREBASE_CLIENT_EMAIL", ""),
		FirebasePrivateKey:  getEnv("FIREBASE_PRIVATE_KEY", ""),

		CORSOrigins: getEnv("CORS_ORIGINS", "*"),

		RedisURL: getEnv("REDIS_URL", ""),

		TrustedProxies:     splitCSV(getEnv("TRUSTED_PROXIES", "")),
		RateLimitMax:       getEnvInt("RATE_LIMIT_MAX", 100),
		RateLimitWindowSec: getEnvInt("RATE_LIMIT_WINDOW", 60),

		LogLevel: getEnv("LOG_LEVEL", "info"),
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// DatabaseConnection returns the database URL and auth token using the same
// .env file and precedence as Load (DATABASE_URL, falling back to TURSO_URL).
// CLI tools that only need database access (e.g. cmd/migrate) use this instead
// of Load so they don't require unrelated production variables.
func DatabaseConnection() (url, token string) {
	_ = godotenv.Load()
	return getEnv("DATABASE_URL", getEnv("TURSO_URL", "")), getEnv("TURSO_AUTH_TOKEN", "")
}

// validate checks that all required configuration values are present.
// In production, stricter validation is enforced.
func (c *Config) validate() error {
	if c.AppEnv == "production" {
		var missing []string

		if c.DatabaseURL == "" {
			missing = append(missing, "DATABASE_URL")
		}
		if c.TursoAuthToken == "" {
			missing = append(missing, "TURSO_AUTH_TOKEN")
		}
		if c.ClerkSecretKey == "" {
			missing = append(missing, "CLERK_SECRET_KEY")
		}

		if len(missing) > 0 {
			return fmt.Errorf("missing required env vars for production: %s", strings.Join(missing, ", "))
		}

		// CORS must be an explicit allowlist in production. A wildcard would let
		// any website call this API from a visitor's browser.
		if c.CORSOrigins == "*" {
			return fmt.Errorf("invalid env var for production: CORS_ORIGINS must be an explicit comma-separated origin allowlist (got '*')")
		}
	}

	return nil
}

// getEnv returns the value of an environment variable or a fallback default.
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getEnvInt returns the positive integer value of an environment variable,
// or fallback when the variable is unset, unparsable, or non-positive.
func getEnvInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if n, err := strconv.Atoi(value); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

// splitCSV splits a comma-separated list into trimmed, non-empty entries.
func splitCSV(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
