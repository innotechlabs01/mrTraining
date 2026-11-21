package infisical

import (
	"os"
	"strconv"
	"time"
)

// Config holds Infisical configuration
type Config struct {
	// Base URL of the Infisical instance (e.g., http://localhost:80)
	BaseURL string

	// Client ID for Universal Auth
	ClientID string

	// Client Secret for Universal Auth
	ClientSecret string

	// Project ID in Infisical
	ProjectID string

	// Environment slug (dev, qa, production)
	Environment string

	// Secret path (folder path, default "/")
	SecretPath string

	// Cache TTL for secrets in memory
	CacheTTL time.Duration

	// Whether Infisical integration is enabled
	Enabled bool
}

// Load loads Infisical configuration from environment variables
func Load() *Config {
	enabled := getEnvBool("INFISICAL_ENABLED", false)
	if !enabled {
		return &Config{Enabled: false}
	}

	cacheTTL := getEnvDuration("INFISICAL_CACHE_TTL", 5*time.Minute)

	return &Config{
		Enabled:      true,
		BaseURL:      getEnv("INFISICAL_BASE_URL", "http://localhost:80"),
		ClientID:     getEnv("INFISICAL_CLIENT_ID", ""),
		ClientSecret: getEnv("INFISICAL_CLIENT_SECRET", ""),
		ProjectID:    getEnv("INFISICAL_PROJECT_ID", ""),
		Environment:  getEnv("INFISICAL_ENVIRONMENT", "dev"),
		SecretPath:   getEnv("INFISICAL_SECRET_PATH", "/"),
		CacheTTL:     cacheTTL,
	}
}

// Validate checks that all required fields are present
func (c *Config) Validate() error {
	if !c.Enabled {
		return nil
	}
	if c.BaseURL == "" {
		return ErrMissingConfig("INFISICAL_BASE_URL")
	}
	if c.ClientID == "" {
		return ErrMissingConfig("INFISICAL_CLIENT_ID")
	}
	if c.ClientSecret == "" {
		return ErrMissingConfig("INFISICAL_CLIENT_SECRET")
	}
	if c.ProjectID == "" {
		return ErrMissingConfig("INFISICAL_PROJECT_ID")
	}
	return nil
}

type missingConfigError string

func (e missingConfigError) Error() string {
	return "infisical: missing required config: " + string(e)
}

func ErrMissingConfig(key string) error {
	return missingConfigError(key)
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}