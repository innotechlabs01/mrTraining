// Package main is the entrypoint for the MR Training API server.
// It loads config, connects database, builds the HTTP server via Wire,
// registers protected routes, and handles graceful shutdown.
package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/infisical"
	cacheinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	natsInfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/nats"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
	runningoutbox "github.com/innotechlabs01/mr-training-api/internal/application/running/outbox"
	athleteConsumer "github.com/innotechlabs01/mr-training-api/internal/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
	handlers "github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	routes "github.com/innotechlabs01/mr-training-api/internal/interfaces/http/routes"
)

// Version is set at build time via ldflags.
var Version = "0.1.0"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Load configuration.
	cfg, err := config.Load()
	if err != nil {
		zap.L().Fatal("failed to load config", zap.Error(err))
	}

	// Initialize structured logger.
	logger.Init(cfg.LogLevel)
	defer logger.Sync()
	log := logger.L()

	log.Info("starting application",
		zap.String("app", cfg.AppName),
		zap.String("env", cfg.AppEnv),
		zap.String("version", Version),
	)

	// Load secrets from Infisical if enabled.
	if cfg.InfisicalEnabled {
		infisicalConfig := &infisical.Config{
			Enabled:      cfg.InfisicalEnabled,
			BaseURL:      cfg.InfisicalBaseURL,
			ClientID:     cfg.InfisicalClientID,
			ClientSecret: cfg.InfisicalClientSecret,
			ProjectID:    cfg.InfisicalProjectID,
			Environment:  cfg.InfisicalEnvironment,
			SecretPath:   cfg.InfisicalSecretPath,
			CacheTTL:     5 * time.Minute, // default, will parse from config if needed
		}

		loader, err := infisical.NewSecretLoader(infisicalConfig)
		if err != nil {
			log.Fatal("failed to create infisical secret loader", zap.Error(err))
		}

		// Load secrets at startup
		if err := loader.Load(ctx); err != nil {
			log.Fatal("failed to load secrets from Infisical", zap.Error(err))
		}

		// Override config values with secrets from Infisical
		// Only override if not already set via environment
		if cfg.ClerkSecretKey == "" {
			if val, err := loader.Get(ctx, "CLERK_SECRET_KEY"); err == nil {
				cfg.ClerkSecretKey = val
				log.Info("loaded CLERK_SECRET_KEY from Infisical")
			}
		}
		if cfg.DatabaseURL == "" {
			if val, err := loader.Get(ctx, "DATABASE_URL"); err == nil {
				cfg.DatabaseURL = val
				log.Info("loaded DATABASE_URL from Infisical")
			}
		}
		if cfg.RedisURL == "" {
			if val, err := loader.Get(ctx, "REDIS_URL"); err == nil {
				cfg.RedisURL = val
				log.Info("loaded REDIS_URL from Infisical")
			}
		}
		if cfg.NATSURL == "" {
			if val, err := loader.Get(ctx, "NATS_URL"); err == nil {
				cfg.NATSURL = val
				log.Info("loaded NATS_URL from Infisical")
			}
		}
		if cfg.WompiPrivateKey == "" {
			if val, err := loader.Get(ctx, "WOMPI_PRIVATE_KEY"); err == nil {
				cfg.WompiPrivateKey = val
				log.Info("loaded WOMPI_PRIVATE_KEY from Infisical")
			}
		}
		if cfg.WompiEventsSecret == "" {
			if val, err := loader.Get(ctx, "WOMPI_EVENTS_SECRET"); err == nil {
				cfg.WompiEventsSecret = val
				log.Info("loaded WOMPI_EVENTS_SECRET from Infisical")
			}
		}
		if cfg.WompiIntegritySecret == "" {
			if val, err := loader.Get(ctx, "WOMPI_INTEGRITY_SECRET"); err == nil {
				cfg.WompiIntegritySecret = val
				log.Info("loaded WOMPI_INTEGRITY_SECRET from Infisical")
			}
		}
		if cfg.ClerkWebhookSecret == "" {
			if val, err := loader.Get(ctx, "CLERK_WEBHOOK_SECRET"); err == nil {
				cfg.ClerkWebhookSecret = val
				log.Info("loaded CLERK_WEBHOOK_SECRET from Infisical")
			}
		}

		log.Info("Infisical secrets loaded successfully")
	}
	var db *database.DB
	if cfg.DatabaseURL != "" {
		db, err = database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Error("failed to connect to database", zap.Error(err))
			os.Exit(1)
		}
		defer db.Close()
		log.Info("database connected")
	} else {
		log.Warn("no database URL configured, running without database")
	}

	// Build HTTP server via Wire.
	server, err := InitializeApp(ctx)
	if err != nil {
		log.Fatal("failed to initialize application", zap.Error(err))
	}

	// Initialize response cache (Redis or in-memory, fail-open).
	if cfg.RedisURL != "" {
		if redisCache, cacheErr := cacheinfrastructure.NewRedis(cfg.RedisURL); cacheErr != nil {
			log.Warn("redis cache disabled, falling back to in-memory", zap.Error(cacheErr))
			middleware.SetCache(cacheinfrastructure.NewMemory(1024))
		} else {
			middleware.SetCache(redisCache)
			log.Info("redis response cache enabled")
		}
	} else {
		middleware.SetCache(cacheinfrastructure.NewMemory(1024))
		log.Warn("REDIS_URL not set, using in-memory response cache (LRU, max TTL 10m)")
	}

	// Health / readiness (no auth).
	server.App.Get("/health", healthHandler(cfg.AppName, cfg.AppEnv))
	if db != nil {
		server.App.Get("/ready", readinessHandler(db.DB))
	} else {
		server.App.Get("/ready", func(c *fiber.Ctx) error {
			return appresponse.Error(c, fiber.StatusServiceUnavailable, "database not configured")
		})
	}

	// Static media serving.
	server.App.Static("/uploads", "./uploads")

	// Public routes — no Clerk auth required. Registered OUTSIDE the
	// Clerk block so they work even when CLERK_SECRET_KEY is unset.
	pub := server.App.Group("/public")
	pub.Get("/landing", middleware.Cache(time.Hour, "landing"), handlers.HandlerGetLanding(db.DB))
	pub.Post("/landing/contact", handlers.HandlerInsertLandingContact(db.DB))

	// Protected API group (Clerk auth).
	var subscriptionHandler *handlers.SubscriptionHandler
	var errorHandler *handlers.ErrorHandler
	if cfg.ClerkSecretKey != "" {
		api := server.App.Group("/api/v1")
		api.Use(middleware.RequireAuth(cfg.ClerkSecretKey))
		subscriptionHandler, errorHandler = registerProtectedRoutes(server.App, api, pub, cfg, db, log)
	} else {
		log.Warn("CLERK_SECRET_KEY not set, skipping protected route registration")
	}

	// Public Wompi webhook — outside auth group (Wompi sends no Clerk token)
	if subscriptionHandler != nil {
		routes.RegisterWompiWebhookRoutes(server.App, subscriptionHandler)
		log.Info("wompi webhook registered", zap.String("path", "/webhooks/wompi"))
	}

	// Public error webhook — outside auth group (web/mobile/cron report errors without Clerk token)
	if errorHandler != nil {
		routes.RegisterErrorWebhookRoutes(server.App, errorHandler)
		log.Info("error webhook registered", zap.String("path", "/webhooks/errors"))
	}

	// NATS JetStream athlete session consumer (background worker).
	if cfg.NATSURL != "" && db != nil {
		nc, js, nerr := natsInfra.Connect(cfg.NATSURL)
		if nerr != nil {
			log.Warn("nats consumer disabled", zap.Error(nerr))
		} else {
			defer nc.Close()
			consumer := athleteConsumer.NewConsumer(db.DB, js, log, nil)
			go func() {
				if err := consumer.Start(ctx); err != nil {
					log.Error("nats consumer stopped", zap.Error(err))
				}
			}()
			log.Info("nats athlete session consumer started", zap.String("url", cfg.NATSURL))
		}
	} else {
		log.Warn("NATS_URL not set, skipping athlete session consumer")
	}

	// Outbox worker for running realtime events.
	if db != nil {
		outboxWorker := runningoutbox.NewWorker(db.DB, log)
		go func() {
			if err := outboxWorker.Start(ctx); err != nil {
				log.Error("outbox worker stopped", zap.Error(err))
			}
		}()
		log.Info("outbox worker started")
	}

	// Start HTTP server.
	go func() {
		if err := server.Start(); err != nil {
			log.Error("server error", zap.Error(err))
			stop()
		}
	}()

	log.Info("server started", zap.String("addr", server.Addr))

	// Wait for shutdown signal.
	<-ctx.Done()
	log.Info("shutting down gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("server forced to shutdown", zap.Error(err))
	}

	log.Info("server stopped")
}

// healthHandler returns a simple health check handler.
func healthHandler(appName, appEnv string) func(c *fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		return appresponse.Success(c, map[string]string{
			"status": "ok",
			"app":    appName,
			"env":    appEnv,
		})
	}
}

// readinessHandler returns a readiness check handler.
func readinessHandler(db *sql.DB) func(c *fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		if err := db.PingContext(c.Context()); err != nil {
			return appresponse.Error(c, fiber.StatusServiceUnavailable, "database unreachable")
		}
		return appresponse.Success(c, map[string]string{"status": "ready"})
	}
}
