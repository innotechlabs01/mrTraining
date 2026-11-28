package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	challengeapp "github.com/innotechlabs01/mr-training-api/internal/application/challenge"
	checkoutapp "github.com/innotechlabs01/mr-training-api/internal/application/checkout"
	gamificationapp "github.com/innotechlabs01/mr-training-api/internal/application/gamification"
	notificationapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	paymentledgersvc "github.com/innotechlabs01/mr-training-api/internal/application/payment_ledger"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	subscriptionapp "github.com/innotechlabs01/mr-training-api/internal/application/subscription"
	trmapp "github.com/innotechlabs01/mr-training-api/internal/application/trm"
	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	athleteConsumer "github.com/innotechlabs01/mr-training-api/internal/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/handlers"
	cacheinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	challengeinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/challenge"
	checkoutinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/checkout"
	commissionentryinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/commission_entry"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	errorinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/error_tracking"
	expoinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/expo"
	firebaseinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/firebase"
	gamificationinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/gamification"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/infisical"
	natsinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/nats"
	notificationinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/notification"
	paymentledgerinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/payment_ledger"
	planinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/plan"
	runninginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
	subscriptioninfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription"
	wompiinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription/wompi"
	userinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/user"
	"github.com/innotechlabs01/mr-training-api/internal/jobs"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/internal/workers"
	"github.com/innotechlabs01/mr-training-api/pkg/metrics"
)

// Version is injected at build time via -ldflags -X main.Version.
var Version = "0.0.3"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		zap.L().Fatal("failed to load config", zap.Error(err))
	}

	logger.Init(cfg.LogLevel)
	defer logger.Sync()
	log := logger.L()

	if cfg.InfisicalEnabled {
		loader, lerr := infisical.NewSecretLoader(&infisical.Config{
			Enabled:      cfg.InfisicalEnabled,
			BaseURL:      cfg.InfisicalBaseURL,
			ClientID:     cfg.InfisicalClientID,
			ClientSecret: cfg.InfisicalClientSecret,
			ProjectID:    cfg.InfisicalProjectID,
			Environment:  cfg.InfisicalEnvironment,
			SecretPath:   cfg.InfisicalSecretPath,
			CacheTTL:     5 * time.Minute,
		})
		if lerr != nil {
			log.Warn("failed to create infisical loader, continuing with environment variables", zap.Error(lerr))
		} else if lerr := loader.Load(ctx); lerr != nil {
			log.Warn("failed to load infisical secrets, falling back to environment variables", zap.Error(lerr))
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
		}
	}

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required for worker process")
	}
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to connect database", zap.Error(err))
	}
	defer db.Close()
	metrics.RegisterDefaultCollectors()
	metrics.RegisterDBStats(db.DB)

	var redisCache *cacheinfra.RedisCache
	if cfg.RedisURL != "" {
		rc, rerr := cacheinfra.NewRedis(cfg.RedisURL)
		if rerr != nil {
			log.Warn("redis cache unavailable for worker", zap.Error(rerr))
		} else {
			redisCache = rc
			defer redisCache.Close()
			middleware.SetRoleCache(redisCache)
		}
	}

	outboxStore := eventbus.NewSQLOutboxStore(db.DB)
	processedStore := eventbus.NewSQLProcessedEventStore(db.DB)
	dlqStore := eventbus.NewSQLDeadLetterStore(db.DB)

	var (
		busPub eventbus.Publisher
		busSub eventbus.Subscriber
		natsUp func() bool
	)

	if cfg.NATSURL != "" {
		nc, js, nerr := natsinfra.Connect(cfg.NATSURL)
		if nerr != nil {
			log.Warn("nats unavailable, falling back to in-memory bus for local worker", zap.Error(nerr))
		} else {
			defer nc.Close()
			if serr := natsinfra.EnsureDomainStreams(ctx, js); serr != nil {
				log.Warn("failed ensuring NATS domain streams", zap.Error(serr))
			}
			jsBus := natsinfra.NewJetStreamBus(js, processedStore, dlqStore, log)
			busPub = jsBus
			busSub = jsBus
			natsUp = nc.IsConnected

			athleteSub := athleteConsumer.NewConsumer(db.DB, js, log, nil)
			go func() {
				if cerr := athleteSub.Start(ctx); cerr != nil && ctx.Err() == nil {
					log.Error("athlete session consumer exited", zap.Error(cerr))
				}
			}()
		}
	}
	if busPub == nil || busSub == nil {
		memBus := eventbus.NewInMemoryBus()
		busPub = memBus
		busSub = memBus
	}

	// Build domain dependencies for consumers & scheduled jobs.
	userRepo := userinfra.NewRepository(db.DB)
	clerkIdentity := userinfra.NewClerkClient(cfg.ClerkSecretKey)
	userService := userapp.NewService(userRepo, clerkIdentity).WithMetadataWriter(clerkIdentity)

	planRepo := planinfra.NewRepository(db.DB)
	subRepo := subscriptioninfra.NewRepository(db.DB)
	wompiProvider := wompiinfra.NewAdapter(cfg)
	ledgerSvc := paymentledgersvc.NewService(paymentledgerinfra.NewRepository(db.DB))
	commissionRepo := commissionentryinfra.NewRepository(db.DB)
	subSvc := subscriptionapp.NewService(cfg, subRepo, wompiProvider, planRepo, ledgerSvc, commissionRepo).
		WithMetadataWriter(clerkIdentity).
		WithDB(db.DB).
		WithOutbox(outboxStore)

	checkoutRepo := checkoutinfra.NewRepository(db.DB)
	checkoutSvc := checkoutapp.NewService(cfg, checkoutRepo, wompiProvider, planRepo, userService, subSvc).
		WithIdentityReader(clerkIdentity).
		WithOutbox(outboxStore)

	notifRepo := notificationinfra.NewRepository(db.DB)
	expoSender := expoinfra.NewSender()
	var fcmSender workers.FCMPushSender
	if cfg.FirebaseProjectID != "" && cfg.FirebaseClientEmail != "" && cfg.FirebasePrivateKey != "" {
		if fcm, ferr := firebaseinfra.NewFCMSender(cfg.FirebaseProjectID, cfg.FirebaseClientEmail, cfg.FirebasePrivateKey); ferr == nil {
			fcmSender = fcm
		}
	}
	notifSvc := notificationapp.NewService(notifRepo, expoSender).WithOutbox(outboxStore)
	discordSender := errorinfra.NewDiscordSender(cfg.DiscordWebhookURL)

	runningRepo := runninginfra.NewRepository(db.DB)
	runningSvc := runningapp.NewService(runningRepo, db.DB).WithOutbox(outboxStore)
	runningSvc.RegisterProvider(runninginfra.NewGarminProvider(runninginfra.NewTokenStore(db.DB)))

	gamifSvc := gamificationapp.NewService(gamificationinfra.NewRepository(db.DB))
	challengeSvc := challengeapp.NewService(challengeinfra.NewRepository(db.DB))
	trmSvc := trmapp.NewService(db.DB)

	deps := workers.WorkerDeps{
		DB:               db.DB,
		Outbox:           outboxStore,
		Checkouts:        checkoutSvc,
		Ledger:           ledgerSvc,
		Commission:       commissionRepo,
		Metadata:         clerkIdentity,
		Devices:          notifRepo,
		ExpoPush:         expoSender,
		FCMPush:          fcmSender,
		Discord:          discordSender,
		SuperAdminUserID: cfg.PlatformSuperAdminClerkID,
		Garmin:           runningSvc,
		Gamification:     gamifSvc,
	}

	subs, err := workers.StartAll(ctx, busSub, deps, log)
	if err != nil {
		log.Fatal("failed starting domain workers", zap.Error(err))
	}
	defer func() {
		for _, sub := range subs {
			_ = sub.Unsubscribe()
		}
	}()

	relay := eventbus.NewRelay(db.DB, busPub, log).WithDeadLetterStore(dlqStore)
	go func() {
		if rerr := relay.Start(ctx); rerr != nil && ctx.Err() == nil {
			log.Error("outbox relay stopped", zap.Error(rerr))
		}
	}()

	jobRunner := jobs.NewRunner(challengeSvc, gamifSvc, notifSvc, trmSvc, log).WithDB(db.DB)
	go func() {
		if jerr := jobRunner.Start(ctx); jerr != nil && ctx.Err() == nil {
			log.Error("scheduled jobs runner exited", zap.Error(jerr))
		}
	}()

	healthPort := os.Getenv("WORKER_HEALTH_PORT")
	if healthPort == "" {
		healthPort = "9092"
	}
	healthApp := fiber.New(fiber.Config{DisableStartupMessage: true})
	healthApp.Get("/health", handlers.HealthCheck(cfg.AppName+"-worker", cfg.AppEnv, Version))
	var redisPing func(context.Context) error
	if redisCache != nil {
		redisPing = redisCache.Ping
	}
	healthApp.Get("/ready", handlers.ReadinessCheckWithDeps(handlers.ReadinessDeps{
		DB:        db.DB,
		RedisPing: redisPing,
		NATSAlive: natsUp,
	}))
	healthApp.Get("/metrics", middleware.MetricsHandler(cfg.MetricsToken))

	go func() {
		if lerr := healthApp.Listen(":" + healthPort); lerr != nil {
			log.Warn("worker health server stopped", zap.Error(lerr))
		}
	}()

	log.Info("mr-training worker started", zap.String("health_port", healthPort))
	<-ctx.Done()
	log.Info("worker shutting down gracefully...")

	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = healthApp.ShutdownWithContext(shutCtx)
	log.Info("worker stopped")
}
