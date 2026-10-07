package config_test

import (
	"os"
	"strings"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/config"
)

// clearEnv unsets env vars for the duration of a test so ambient shell/CI
// values cannot influence config defaults.
func clearEnv(t *testing.T, keys ...string) {
	t.Helper()
	for _, k := range keys {
		if v, ok := os.LookupEnv(k); ok {
			if err := os.Unsetenv(k); err != nil {
				t.Fatalf("unset %s: %v", k, err)
			}
			t.Cleanup(func() {
				_ = os.Setenv(k, v)
			})
		}
	}
}

var configEnvKeys = []string{
	"APP_ENV", "DATABASE_URL", "TURSO_AUTH_TOKEN", "CLERK_SECRET_KEY",
	"CORS_ORIGINS", "TRUSTED_PROXIES", "RATE_LIMIT_MAX", "RATE_LIMIT_WINDOW",
}

// TestLoad_DevelopmentDefaults verifies sane traffic defaults in development.
func TestLoad_DevelopmentDefaults(t *testing.T) {
	clearEnv(t, configEnvKeys...)
	t.Setenv("APP_ENV", "development")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}
	if cfg.RateLimitMax != 100 {
		t.Errorf("RateLimitMax = %d, want 100", cfg.RateLimitMax)
	}
	if cfg.RateLimitWindowSec != 60 {
		t.Errorf("RateLimitWindowSec = %d, want 60", cfg.RateLimitWindowSec)
	}
	if len(cfg.TrustedProxies) != 0 {
		t.Errorf("TrustedProxies = %v, want empty by default", cfg.TrustedProxies)
	}
}

// TestLoad_ProductionRejectsWildcardCORS verifies fail-fast on wildcard CORS in production.
func TestLoad_ProductionRejectsWildcardCORS(t *testing.T) {
	clearEnv(t, configEnvKeys...)
	t.Setenv("APP_ENV", "production")
	t.Setenv("DATABASE_URL", "libsql://db.example.com")
	t.Setenv("TURSO_AUTH_TOKEN", "token")
	t.Setenv("CLERK_SECRET_KEY", "sk_test_x")
	// CORS_ORIGINS intentionally unset → defaults to "*".

	_, err := config.Load()
	if err == nil {
		t.Fatal("Load() expected error for wildcard CORS in production, got nil")
	}
	if !strings.Contains(err.Error(), "CORS_ORIGINS") {
		t.Errorf("error should mention CORS_ORIGINS, got: %v", err)
	}
}

// TestLoad_ProductionAllowsExplicitCORS verifies an explicit allowlist passes validation.
func TestLoad_ProductionAllowsExplicitCORS(t *testing.T) {
	clearEnv(t, configEnvKeys...)
	t.Setenv("APP_ENV", "production")
	t.Setenv("DATABASE_URL", "libsql://db.example.com")
	t.Setenv("TURSO_AUTH_TOKEN", "token")
	t.Setenv("CLERK_SECRET_KEY", "sk_test_x")
	t.Setenv("CORS_ORIGINS", "https://app.example.com,https://admin.example.com")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}
	if cfg.CORSOrigins != "https://app.example.com,https://admin.example.com" {
		t.Errorf("CORSOrigins = %q, want explicit allowlist", cfg.CORSOrigins)
	}
}

// TestLoad_TrafficParsing verifies TRUSTED_PROXIES and rate-limit env parsing,
// including fallback for invalid values.
func TestLoad_TrafficParsing(t *testing.T) {
	clearEnv(t, configEnvKeys...)
	t.Setenv("APP_ENV", "development")
	t.Setenv("TRUSTED_PROXIES", "10.0.0.1, 10.0.0.0/24 ,")
	t.Setenv("RATE_LIMIT_MAX", "300")
	t.Setenv("RATE_LIMIT_WINDOW", "not-a-number")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}
	if len(cfg.TrustedProxies) != 2 || cfg.TrustedProxies[0] != "10.0.0.1" || cfg.TrustedProxies[1] != "10.0.0.0/24" {
		t.Errorf("TrustedProxies = %v, want [10.0.0.1 10.0.0.0/24]", cfg.TrustedProxies)
	}
	if cfg.RateLimitMax != 300 {
		t.Errorf("RateLimitMax = %d, want 300", cfg.RateLimitMax)
	}
	if cfg.RateLimitWindowSec != 60 {
		t.Errorf("RateLimitWindowSec = %d, want fallback 60 for invalid input", cfg.RateLimitWindowSec)
	}
}
