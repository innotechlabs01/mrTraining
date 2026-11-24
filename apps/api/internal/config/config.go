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
	DatabaseURL string // PostgreSQL connection URL (DATABASE_URL)

	// Auth (Clerk)
	ClerkSecretKey       string // Clerk secret key for backend API calls
	ClerkPublishableKey  string // Clerk publishable key for frontend
	ClerkJWKSURL         string // Optional: Custom JWKS URL for token verification
	ClerkWebhookSecret   string // Clerk webhook signing secret (svix) for /webhooks/clerk

	// Firebase (FCM — optional, skip if empty)
	FirebaseProjectID   string // Firebase project ID for FCM
	FirebaseClientEmail string // Firebase service account client email
	FirebasePrivateKey  string // Firebase service account private key (PEM)

	// CORS
	CORSOrigins string // Allowed CORS origins, comma-separated

	// Cache (Redis — optional, disabled when empty)
	RedisURL string // Redis connection URL; empty disables response caching
	// Platform super admin (read-only MVP)
	PlatformSuperAdminClerkID  string   // PLATFORM_SUPER_ADMIN_CLERK_ID (raw)
	PlatformSuperAdminClerkIDs []string // Normalized, trimmed, non-empty

	// NATS (JetStream event bus — optional, disabled when empty)
	NATSURL string // NATS server URL; empty disables JetStream consumers

	// Traffic / proxy
	TrustedProxies     []string // IPs/CIDRs allowed to set X-Forwarded-For (empty = ignore forwarded headers)
	RateLimitMax       int      // Max requests per window, per client IP
	RateLimitWindowSec int      // Rate limit window in seconds

	// MercadoPago (legacy, historical records preserved)
	MercadoPagoWebhookURL  string // URL del webhook registrada en el dashboard de MP
	MercadoPagoSecretKey   string // Access token (APP_USR-...) para llamar la API de MP
	MercadoPagoPublicKey   string // Public key (APP_USR-...) — informativa, para el cliente
	MercadoPagoWebhookKey  string // Webhook secret: firma x-signature de las notificaciones

	// Wompi (active payment provider)
	WompiPublicKey       string // pub_...
	WompiPrivateKey      string // prv_...
	WompiIntegritySecret string // Integrity secret used for widget/checkout signatures
	WompiEventsSecret    string // Events secret used to verify webhooks
	WompiEnv             string // sandbox | production
	WompiWebhookURL      string // URL del webhook registrada en el dashboard de Wompi

	AppURL                 string // URL base de la API (para back_urls server-to-server)
	WebAppURL              string // URL base del frontend (destino de las redirecciones de pago)

// Email (para notificaciones a coaches)
	EmailSMTPHost         string // Servidor SMTP (ej: smtp.gmail.com)
	EmailSMTPPort         int      // Puerto SMTP (ej: 587)
	EmailSMTPUsername     string // Usuario SMTP (email)
	EmailSMTPPassword     string // Contraseña SMTP (contraseña o App Password)
	EmailFromName         string // Nombre del remitente
	EmailEnabled          bool     // Cuando true, envía emails reales; false = modo solo-log

	// Discord (error tracking webhook — optional)
	DiscordWebhookURL string // Discord webhook URL for error notifications

	// Logging
	LogLevel string // Log level: debug, info, warn, error

	// Infisical (secrets management)
	InfisicalEnabled      bool
	InfisicalBaseURL      string
	InfisicalClientID     string
	InfisicalClientSecret string
	InfisicalProjectID    string
	InfisicalEnvironment  string
	InfisicalSecretPath   string
	InfisicalCacheTTL     string

	// Observability & Worker Topology
	MetricsToken     string // METRICS_TOKEN: optional bearer/header secret protecting GET /metrics
	EmbeddedWorker   bool   // EMBEDDED_WORKER: run outbox relay + NATS workers inside cmd/api (default true unless split)
	RateLimitBackend string // RATE_LIMIT_BACKEND: "memory" | "redis" | "auto" (default "auto")

	// Cloudflare R2 (S3-compatible private media storage)
	R2AccountID            string // R2_ACCOUNT_ID
	R2AccessKeyID          string // R2_ACCESS_KEY_ID
	R2SecretAccessKey      string // R2_SECRET_ACCESS_KEY
	R2Bucket               string // R2_BUCKET
	R2Endpoint             string // R2_ENDPOINT (optional override; defaults to https://<account_id>.r2.cloudflarestorage.com)
	R2UploadTTLSeconds     int    // R2_UPLOAD_TTL_SECONDS (default 900)
	R2ReadTTLSeconds       int    // R2_READ_TTL_SECONDS (default 3600)
	R2PublicViewTTLSeconds int    // R2_PUBLIC_VIEW_TTL_SECONDS (default 900)
	R2MaxImageBytes        int64  // R2_MAX_IMAGE_BYTES (default 10MB)
	R2MaxVideoBytes        int64  // R2_MAX_VIDEO_BYTES (default 100MB)
}

// Load reads configuration from environment variables and .env file.
// It applies default values for optional fields and validates required fields
// based on the application environment.
func Load() (*Config, error) {
	// Attempt to load .env file; ignore if missing (Docker, CI)
	_ = godotenv.Load()
	_ = godotenv.Load("config/.env.local")

	cfg := &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "3001"),
		AppName: getEnv("APP_NAME", "mr-training-api"),

		DatabaseURL: getEnv("DATABASE_URL", ""),

		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),
		ClerkPublishableKey: getEnv("CLERK_PUBLISHABLE_KEY", ""),
		ClerkJWKSURL:        getEnv("CLERK_JWKS_URL", ""),
		ClerkWebhookSecret:  getEnv("CLERK_WEBHOOK_SECRET", ""),

		FirebaseProjectID:   getEnv("FIREBASE_PROJECT_ID", ""),
		FirebaseClientEmail: getEnv("FIREBASE_CLIENT_EMAIL", ""),
		FirebasePrivateKey:  getEnv("FIREBASE_PRIVATE_KEY", ""),

		CORSOrigins: normalizeCORSOrigins(getEnv("CORS_ORIGINS", "*")),

		RedisURL: getEnv("REDIS_URL", ""),

		PlatformSuperAdminClerkID: getEnv("PLATFORM_SUPER_ADMIN_CLERK_ID", ""),
		NATSURL:  getEnv("NATS_URL", "nats://localhost:4222"),

		DiscordWebhookURL: getEnv("ERROR_WEBHOOK_DISCOR", ""),

		TrustedProxies:     splitCSV(getEnv("TRUSTED_PROXIES", "")),
		RateLimitMax:       getEnvInt("RATE_LIMIT_MAX", 100),
		RateLimitWindowSec: getEnvInt("RATE_LIMIT_WINDOW", 60),

		LogLevel: getEnv("LOG_LEVEL", "info"),

		// Infisical (secrets management)
		InfisicalEnabled:      getEnvBool("INFISICAL_ENABLED", false),
		InfisicalBaseURL:      getEnv("INFISICAL_BASE_URL", "http://localhost:80"),
		InfisicalClientID:     getEnv("INFISICAL_CLIENT_ID", ""),
		InfisicalClientSecret: getEnv("INFISICAL_CLIENT_SECRET", ""),
		InfisicalProjectID:    getEnv("INFISICAL_PROJECT_ID", ""),
		InfisicalEnvironment:  getEnv("INFISICAL_ENVIRONMENT", "dev"),
		InfisicalSecretPath:   getEnv("INFISICAL_SECRET_PATH", "/"),
		InfisicalCacheTTL:     getEnv("INFISICAL_CACHE_TTL", "5m"),

		MetricsToken:     getEnv("METRICS_TOKEN", ""),
		EmbeddedWorker:   getEnvBool("EMBEDDED_WORKER", true),
		RateLimitBackend: getEnv("RATE_LIMIT_BACKEND", "auto"),

		MercadoPagoWebhookURL: getEnv("MERCADO_PAGO_WEBHOOK_URL", ""),
		MercadoPagoSecretKey:  getEnv("MERCADO_PAGO_SECRET_KEY", ""),
		MercadoPagoPublicKey:  getEnv("MERCADO_PAGO_PUBLIC_KEY", ""),
		MercadoPagoWebhookKey: getEnv("MERCADO_PAG_SECRET_WEBHOOK", getEnv("MERCADO_PAGO_WEBHOOK_SECRET", "")),

		WompiPublicKey:       getEnv("WOMPI_PUBLIC_KEY", getEnv("KEY_PUBLIC", "")),
		WompiPrivateKey:      getEnv("WOMPI_PRIVATE_KEY", getEnv("KEY_PRIVATE", "")),
		WompiIntegritySecret: getEnv("WOMPI_INTEGRITY_SECRET", ""),
		WompiEventsSecret:    getEnv("WOMPI_EVENTS_SECRET", ""),
		WompiEnv:             getEnv("WOMPI_ENV", "sandbox"),
		WompiWebhookURL:      getEnv("WOMPI_WEBHOOK_URL", ""),
		AppURL:                getEnv("APP_URL", ""),
		// The frontend base URL is where the payment provider sends the payer
		// back. It MUST NOT fall back to APP_URL: that points at this API and
		// every return URL would 404.
		WebAppURL:             strings.TrimRight(strings.TrimSpace(getEnv("WEB_APP_URL", defaultWebAppURL())), "/"),

		// Cloudflare R2
		R2AccountID:            getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:          getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey:      getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2Bucket:               getEnv("R2_BUCKET", ""),
		R2Endpoint:             getEnv("R2_ENDPOINT", ""),
		R2UploadTTLSeconds:     getEnvInt("R2_UPLOAD_TTL_SECONDS", 900),
		R2ReadTTLSeconds:       getEnvInt("R2_READ_TTL_SECONDS", 3600),
		R2PublicViewTTLSeconds: getEnvInt("R2_PUBLIC_VIEW_TTL_SECONDS", 900),
		R2MaxImageBytes:        int64(getEnvInt("R2_MAX_IMAGE_BYTES", 10*1024*1024)),
		R2MaxVideoBytes:        int64(getEnvInt("R2_MAX_VIDEO_BYTES", 100*1024*1024)),
	}

	cfg.PlatformSuperAdminClerkIDs = splitCSV(cfg.PlatformSuperAdminClerkID)

	if err := cfg.validate(); err != nil {		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// DatabaseConnection returns the database URL using the same
// .env file and environment variables as Load (DATABASE_URL).
// CLI tools that only need database access (e.g. cmd/migrate) use this instead
// of Load so they don't require unrelated production variables.
func DatabaseConnection() (url string) {
	_ = godotenv.Load()
	_ = godotenv.Load("config/.env.local")
	return getEnv("DATABASE_URL", "")
}

// validate checks that all required configuration values are present.
// In production, stricter validation is enforced.
func (c *Config) validate() error {
	if c.AppEnv == "production" {
		var missing []string

		if c.DatabaseURL == "" {
			missing = append(missing, "DATABASE_URL")
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

// defaultWebAppURL returns the development fallback for the frontend base
// URL. Production must set WEB_APP_URL explicitly.
func defaultWebAppURL() string {
	if os.Getenv("APP_ENV") == "production" {
		return ""
	}
	return "http://localhost:3000"
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

// getEnvBool returns the boolean value of an environment variable,
// or fallback when the variable is unset or unparsable.
func getEnvBool(key string, fallback bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
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

// normalizeCORSOrigins trims whitespace and strips trailing slashes from each
// comma-separated origin so values like "https://app.example.com/" match the
// browser Origin header ("https://app.example.com").
func normalizeCORSOrigins(raw string) string {
	parts := splitCSV(raw)
	if len(parts) == 0 {
		return strings.TrimSpace(raw)
	}
	for i, p := range parts {
		if p != "*" {
			parts[i] = strings.TrimRight(p, "/")
		}
	}
	return strings.Join(parts, ",")
}
