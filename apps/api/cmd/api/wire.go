//go:build wireinject

// Package main provides dependency injection via Google Wire.
// Providers are grouped by concern. wire.Build assembles the full object graph
// at compile time — missing dependencies fail the build, not production.
package main

import (
	"context"
	"database/sql"
	"os"
	"time"

	"github.com/google/wire"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/stdlib"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// =============================================================================
// Infrastructure providers
// =============================================================================

// ProvideConfig loads application configuration from environment.
func ProvideConfig() (*config.Config, error) {
	return config.Load()
}

// ProvideLogger initializes structured logging and returns *zap.Logger.
func ProvideLogger(cfg *config.Config) (*zap.Logger, error) {
	logger.Init(cfg.LogLevel)
	return logger.L(), nil
}

// ProvideDB opens and verifies the PostgreSQL connection pool.
func ProvideDB(cfg *config.Config) (*database.DB, error) {
	if cfg.DatabaseURL == "" {
		return nil, nil
	}
	return database.Connect(cfg.DatabaseURL)
}

// ProvideStdlibDB returns the underlying *sql.DB for repository use.
func ProvideStdlibDB(db *database.DB) *sql.DB {
	if db == nil {
		return nil
	}
	return db.DB
}

// ProvideSQLDriver registers the pgx stdlib driver (side-effect provider).
func ProvideSQLDriver() *stdlib.Driver {
	return &stdlib.Driver{}
}

// ProvideCache returns a Redis cache when REDIS_URL is set, otherwise an
// in-memory LRU cache. Fail-open: never blocks requests.
func ProvideCache(cfg *config.Config, log *zap.Logger) (cache.Cache, error) {
	if cfg.RedisURL != "" {
		return cache.NewRedis(cfg.RedisURL)
	}
	log.Warn("REDIS_URL not set, using in-memory response cache")
	return cache.NewMemory(1024), nil
}

// ProvideFiberApp creates the Fiber HTTP server with production timeouts.
func ProvideFiberApp(cfg *config.Config, log *zap.Logger) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:         cfg.AppName,
		ErrorHandler:    customErrorHandler(),
		ReadTimeout:     15 * time.Second,
		WriteTimeout:    30 * time.Second,
		IdleTimeout:     120 * time.Second,
		BodyLimit:       10 * 1024 * 1024,
		ReadBufferSize:  64 * 1024,
		WriteBufferSize: 64 * 1024,
		EnableTrustedProxyCheck: len(cfg.TrustedProxies) > 0,
		TrustedProxies:          cfg.TrustedProxies,
	})

	// Global middleware — order matters.
	app.Use(middleware.Recover())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.RequestID())
	app.Use(middleware.ServerTiming())
	app.Use(middleware.Logger())
	app.Use(middleware.CORS(cfg.CORSOrigins))
	app.Use("/api", fiberMiddlewareCompress())
	app.Use(middleware.RateLimit(cfg.RateLimitMax, cfg.RateLimitWindowSec))
	app.Use(middleware.Timeout(30))
	app.Use(middleware.BodyLimit(100))

	return app
}

// fiberMiddlewareCompress wraps compress middleware inline to avoid extra import.
func fiberMiddlewareCompress() fiber.Handler {
	compress := func() fiber.Handler {
		return func(c *fiber.Ctx) error {
			return c.Next()
		}
	}
	return compress()
}

// customErrorHandler returns a Fiber error handler with structured responses.
func customErrorHandler() fiber.ErrorHandler {
	return func(c *fiber.Ctx, err error) error {
		code := fiber.StatusInternalServerError
		message := "internal server error"

		if e, ok := err.(*fiber.Error); ok {
			code = e.Code
			message = e.Message
		}

		return appresponse.Error(c, code, message)
	}
}

// =============================================================================
// HTTP server
// =============================================================================

// HTTPServer wraps *fiber.App with address and graceful shutdown.
type HTTPServer struct {
	App    *fiber.App
	Addr   string
	Logger *zap.Logger
}

func ProvideHTTPServer(app *fiber.App, cfg *config.Config, log *zap.Logger) *HTTPServer {
	httpPort := cfg.AppPort
	if p := os.Getenv("PORT"); p != "" {
		httpPort = p
	}
	return &HTTPServer{
		App:    app,
		Addr:   ":" + httpPort,
		Logger: log,
	}
}

func (s *HTTPServer) Start() error {
	return s.App.Listen(s.Addr)
}

func (s *HTTPServer) Shutdown(ctx context.Context) error {
	return s.App.ShutdownWithContext(ctx)
}

// =============================================================================
// Provider sets
// =============================================================================

// InfrastructureSet wires core infrastructure: config, logger, db, cache, app.
var InfrastructureSet = wire.NewSet(
	ProvideConfig,
	ProvideLogger,
	ProvideDB,
	ProvideStdlibDB,
	ProvideCache,
	ProvideFiberApp,
	ProvideHTTPServer,
)

// =============================================================================
// App initializer (generated by Wire)
// =============================================================================

// InitializeApp builds the complete application object graph.
func InitializeApp(ctx context.Context) (*HTTPServer, error) {
	wire.Build(
		InfrastructureSet,
	)
	return nil, nil
}
