// Package main is the entrypoint for the MR Training API server.
// It loads config once, initializes Infisical secrets, connects Postgres/Redis/NATS,
// builds the HTTP server via Wire, registers routes & observability, and performs
// coordinated graceful shutdown.
package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nats-io/nats.go"
	"go.uber.org/zap"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	athleteConsumer "github.com/innotechlabs01/mr-training-api/internal/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/handlers"
	cacheinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/infisical"
	natsInfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/nats"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/realtime"
	httphandlers "github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/routes"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/internal/workers"
	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
)

// Version is set at build time via ldflags.
var Version = "0.1.0"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Load configuration once.
	cfg, err := config.Load()
	if err != nil {
		zap.L().Fatal("failed to load config", zap.Error(err))
	}

	// Initialize structured logger once.
	logger.Init(cfg.LogLevel)
	defer logger.Sync()
	log := logger.L()

	log.Info("starting application",
		zap.String("app", cfg.AppName),
		zap.String("env", cfg.AppEnv),
		zap.String("version", Version),
		zap.Bool("embedded_worker", cfg.EmbeddedWorker),
	)

	// Load secrets from Infisical into cfg BEFORE InitializeApp.
	if cfg.InfisicalEnabled {
		infisicalConfig := &infisical.Config{
			Enabled:      cfg.InfisicalEnabled,
			BaseURL:      cfg.InfisicalBaseURL,
			ClientID:     cfg.InfisicalClientID,
			ClientSecret: cfg.InfisicalClientSecret,
			ProjectID:    cfg.InfisicalProjectID,
			Environment:  cfg.InfisicalEnvironment,
			SecretPath:   cfg.InfisicalSecretPath,
			CacheTTL:     5 * time.Minute,
		}

		loader, lerr := infisical.NewSecretLoader(infisicalConfig)
		if lerr != nil {
			log.Warn("failed to create infisical secret loader, continuing with environment variables", zap.Error(lerr))
		} else if lerr := loader.Load(ctx); lerr != nil {
			log.Warn("failed to load secrets from Infisical, falling back to environment variables", zap.Error(lerr))
		} else {
			overrideIfEmpty := func(dst *string, key string) {
				if *dst == "" {
					if val, gerr := loader.Get(ctx, key); gerr == nil {
						*dst = val
					}
				}
			}
			overrideIfEmpty(&cfg.ClerkSecretKey, "CLERK_SECRET_KEY")
			overrideIfEmpty(&cfg.DatabaseURL, "DATABASE_URL")
			overrideIfEmpty(&cfg.RedisURL, "REDIS_URL")
			overrideIfEmpty(&cfg.NATSURL, "NATS_URL")
			overrideIfEmpty(&cfg.WompiPrivateKey, "WOMPI_PRIVATE_KEY")
			overrideIfEmpty(&cfg.WompiEventsSecret, "WOMPI_EVENTS_SECRET")
			overrideIfEmpty(&cfg.WompiIntegritySecret, "WOMPI_INTEGRITY_SECRET")
			overrideIfEmpty(&cfg.ClerkWebhookSecret, "CLERK_WEBHOOK_SECRET")
			overrideIfEmpty(&cfg.R2AccountID, "R2_ACCOUNT_ID")
			overrideIfEmpty(&cfg.R2AccessKeyID, "R2_ACCESS_KEY_ID")
			overrideIfEmpty(&cfg.R2SecretAccessKey, "R2_SECRET_ACCESS_KEY")
			overrideIfEmpty(&cfg.R2Bucket, "R2_BUCKET")
			overrideIfEmpty(&cfg.R2Endpoint, "R2_ENDPOINT")
			log.Info("Infisical secrets loaded successfully")
		}
	}

	var db *database.DB
	var stdlibDB *sql.DB
	if cfg.DatabaseURL != "" {
		db, err = database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Error("failed to connect to database", zap.Error(err))
			os.Exit(1)
		}
		defer db.Close()
		stdlibDB = db.DB
		metrics.RegisterDBStats(stdlibDB)
		log.Info("database connected")
	} else {
		log.Warn("no database URL configured, running without database")
	}
	metrics.RegisterDefaultCollectors()

	// Initialize Redis (cache + distributed rate limit + shared role cache, fail-open).
	var redisPing func(context.Context) error
	if cfg.RedisURL != "" {
		if redisCache, cacheErr := cacheinfrastructure.NewRedis(cfg.RedisURL); cacheErr != nil {
			log.Warn("redis cache disabled, falling back to in-memory", zap.Error(cacheErr))
			middleware.SetCache(cacheinfrastructure.NewMemory(1024))
		} else {
			defer redisCache.Close()
			redisPing = redisCache.Ping
			middleware.SetCache(redisCache)
			middleware.SetRoleCache(redisCache)
			middleware.SetRateLimitRedis(redisCache, cfg.RateLimitBackend)
			log.Info("redis cache, distributed rate limiter & role cache enabled")
		}
	} else {
		middleware.SetCache(cacheinfrastructure.NewMemory(1024))
		log.Warn("REDIS_URL not set, using in-memory response cache (LRU, max TTL 10m)")
	}

	// Connect NATS JetStream ONCE if configured.
	var (
		nc     *nats.Conn
		js     nats.JetStreamContext
		busPub eventbus.Publisher
		busSub eventbus.Subscriber
		natsUp func() bool
	)
	if cfg.NATSURL != "" && stdlibDB != nil {
		var nerr error
		nc, js, nerr = natsInfra.Connect(cfg.NATSURL)
		if nerr != nil {
			log.Warn("nats jetstream unavailable, falling back to in-memory event bus", zap.Error(nerr))
		} else {
			defer nc.Close()
			if serr := natsInfra.EnsureDomainStreams(ctx, js); serr != nil {
				log.Warn("failed ensuring NATS domain streams", zap.Error(serr))
			}
			processedStore := eventbus.NewSQLProcessedEventStore(stdlibDB)
			dlqStore := eventbus.NewSQLDeadLetterStore(stdlibDB)
			jsBus := natsInfra.NewJetStreamBus(js, processedStore, dlqStore, log)
			busPub = jsBus
			busSub = jsBus
			natsUp = nc.IsConnected
			log.Info("nats jetstream connected", zap.String("url", cfg.NATSURL))
		}
	}
	if busPub == nil || busSub == nil {
		memBus := eventbus.NewInMemoryBus()
		busPub = memBus
		busSub = memBus
	}

	// Build HTTP server via Wire using the enriched cfg & log.
	server, err := InitializeApp(ctx, cfg, log)
	if err != nil {
		log.Fatal("failed to initialize application", zap.Error(err))
	}

	// Observability & health endpoints (no auth on /health and /ready; optional METRICS_TOKEN on /metrics).
	server.App.Get("/health", handlers.HealthCheck(cfg.AppName, cfg.AppEnv))
	server.App.Get("/ready", handlers.ReadinessCheckWithDeps(handlers.ReadinessDeps{
		DB:        stdlibDB,
		RedisPing: redisPing,
		NATSAlive: natsUp,
	}))
	server.App.Get("/metrics", middleware.MetricsHandler(cfg.MetricsToken))

	// Static media serving.
	server.App.Static("/uploads", "./uploads")

	// Public routes — no Clerk auth required.
	pub := server.App.Group("/public")
	pub.Get("/landing", middleware.Cache(time.Hour, "landing"), httphandlers.HandlerGetLanding(stdlibDB))
	pub.Post("/landing/contact", httphandlers.HandlerInsertLandingContact(stdlibDB))

	// Protected API group (Clerk auth).
	var wiring RouteWiringResult
	if cfg.ClerkSecretKey != "" {
		api := server.App.Group("/api/v1")
		api.Use(middleware.RequireAuth(cfg.ClerkSecretKey))
		wiring = registerProtectedRoutesWithDeps(ctx, server.App, api, pub, cfg, db, log, RouteRuntimeDeps{
			Publisher: busPub,
			NATSConn:  nc,
		})
	} else {
		log.Warn("CLERK_SECRET_KEY not set, skipping protected route registration")
	}

	// Public Wompi webhook — outside auth group (Wompi sends no Clerk token)
	if wiring.SubscriptionHandler != nil {
		routes.RegisterWompiWebhookRoutes(server.App, wiring.SubscriptionHandler)
		log.Info("wompi webhook registered", zap.String("path", "/webhooks/wompi"))
	}

	// Public error webhook — outside auth group (web/mobile/cron report errors without Clerk token)
	if wiring.ErrorHandler != nil {
		routes.RegisterErrorWebhookRoutes(server.App, wiring.ErrorHandler)
		log.Info("error webhook registered", zap.String("path", "/webhooks/errors"))
	}

	// Start embedded background workers & outbox relay unless separated into cmd/worker.
	if cfg.EmbeddedWorker && stdlibDB != nil {
		if js != nil {
			consumer := athleteConsumer.NewConsumer(stdlibDB, js, log, nil)
			go func() {
				if cerr := consumer.Start(ctx); cerr != nil && ctx.Err() == nil {
					log.Error("nats athlete session consumer stopped", zap.Error(cerr))
				}
			}()
			log.Info("nats athlete session consumer started", zap.String("url", cfg.NATSURL))
		}

		if wiring.SubscriptionHandler != nil {
			subs, serr := workers.StartAll(ctx, busSub, wiring.WorkerDeps, log)
			if serr != nil {
				log.Error("failed starting embedded domain workers", zap.Error(serr))
			} else {
				defer func() {
					for _, sub := range subs {
						_ = sub.Unsubscribe()
					}
				}()
			}
		}

		dlqStore := eventbus.NewSQLDeadLetterStore(stdlibDB)
		relay := eventbus.NewRelay(stdlibDB, busPub, log).
			WithDeadLetterStore(dlqStore).
			WithRealtimeHook(func(_ context.Context, ev eventbus.DomainEvent) {
				realtime.RouteOutboxEventToLocalHubs(runningapp.DefaultHub, wiring.WSHub, ev)
			})
		go func() {
			if rerr := relay.Start(ctx); rerr != nil && ctx.Err() == nil {
				log.Error("outbox relay stopped", zap.Error(rerr))
			}
		}()
		log.Info("unified transactional outbox relay started")
	}

	// Start HTTP server.
	go func() {
		if serr := server.Start(); serr != nil {
			log.Error("server error", zap.Error(serr))
			stop()
		}
	}()

	log.Info("server started", zap.String("addr", server.Addr))

	// Wait for shutdown signal.
	<-ctx.Done()
	log.Info("shutting down gracefully...")

	if wiring.WSHub != nil {
		wiring.WSHub.Stop()
	}
	if wiring.RealtimeBridge != nil {
		wiring.RealtimeBridge.Stop()
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("server forced to shutdown", zap.Error(err))
	}

	log.Info("server stopped")
}
