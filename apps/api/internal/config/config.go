// Package config provides application configuration management.
// It loads configuration from environment variables with sensible defaults
// and validates required values in production.
package config

import (
	"fmt"
	"os"
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
	DatabaseURL   string // Turso/LibSQL connection URL
	TursoAuthToken string // Turso authentication token

	// Auth (Clerk)
	ClerkSecretKey      string // Clerk secret key for backend API calls
	ClerkPublishableKey string // Clerk publishable key for frontend
	ClerkJWKSURL        string // Optional: Custom JWKS URL for token verification

	// CORS
	CORSOrigins string // Allowed CORS origins, comma-separated

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
		AppPort: getEnv("APP_PORT", "8080"),
		AppName: getEnv("APP_NAME", "mr-training-api"),

		DatabaseURL:    getEnv("DATABASE_URL", getEnv("TURSO_URL", "")),
		TursoAuthToken: getEnv("TURSO_AUTH_TOKEN", ""),

		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),
		ClerkPublishableKey: getEnv("CLERK_PUBLISHABLE_KEY", ""),
		ClerkJWKSURL:        getEnv("CLERK_JWKS_URL", ""),

		CORSOrigins: getEnv("CORS_ORIGINS", "*"),

		LogLevel: getEnv("LOG_LEVEL", "info"),
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
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
