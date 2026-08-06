package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	GRPCPort           string
	DatabaseURL        string
	RedisURL           string
	NATSURL            string
	ClerkSecretKey     string
	ClerkPublishableKey string
	JWTIssuer          string
	Environment        string
	ShutdownTimeout    time.Duration
	OTELEndpoint       string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	port := getEnv("PORT", "8080")
	grpcPort := getEnv("GRPC_PORT", "9090")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/mrtraining?sslmode=disable")
	redisURL := getEnv("REDIS_URL", "redis://localhost:6379")
	natsURL := getEnv("NATS_URL", "nats://localhost:4222")
	clerkSecret := getEnv("CLERK_SECRET_KEY", "")
	clerkPublishable := getEnv("CLERK_PUBLISHABLE_KEY", "")
	jwtIssuer := getEnv("JWT_ISSUER", "https://clerk.example.com")
	env := getEnv("ENVIRONMENT", "development")
	otelEndpoint := getEnv("OTEL_ENDPOINT", "")

	shutdownTimeoutStr := getEnv("SHUTDOWN_TIMEOUT", "10s")
	shutdownTimeout, _ := time.ParseDuration(shutdownTimeoutStr)
	if shutdownTimeout == 0 {
		shutdownTimeout = 10 * time.Second
	}

	if port == "" {
		return nil, fmt.Errorf("PORT is required")
	}

	_, err := strconv.Atoi(port)
	if err != nil {
		return nil, fmt.Errorf("PORT must be a valid number: %w", err)
	}

	return &Config{
		Port:               port,
		GRPCPort:           grpcPort,
		DatabaseURL:        dbURL,
		RedisURL:           redisURL,
		NATSURL:            natsURL,
		ClerkSecretKey:     clerkSecret,
		ClerkPublishableKey: clerkPublishable,
		JWTIssuer:          jwtIssuer,
		Environment:        env,
		ShutdownTimeout:    shutdownTimeout,
		OTELEndpoint:       otelEndpoint,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
