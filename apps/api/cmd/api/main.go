// Package main is the entrypoint for the MR Training API server.
// It initializes configuration, logging, database, middleware, and routes,
// then starts the Fiber HTTP server with graceful shutdown support.
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

	alertapp "github.com/innotechlabs01/mr-training-api/internal/application/alert"
	blogapp "github.com/innotechlabs01/mr-training-api/internal/application/blog"
	coachapp "github.com/innotechlabs01/mr-training-api/internal/application/coach"
	communityapp "github.com/innotechlabs01/mr-training-api/internal/application/community"
	eventapp "github.com/innotechlabs01/mr-training-api/internal/application/event"
	favoriteapp "github.com/innotechlabs01/mr-training-api/internal/application/favorite"
	healthapp "github.com/innotechlabs01/mr-training-api/internal/application/health"
	importapp "github.com/innotechlabs01/mr-training-api/internal/application/import"
	inviteapp "github.com/innotechlabs01/mr-training-api/internal/application/invite"
	membershipapp "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	notificationapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	onboardingapp "github.com/innotechlabs01/mr-training-api/internal/application/onboarding"
	polarapp "github.com/innotechlabs01/mr-training-api/internal/application/polar"
	productapp "github.com/innotechlabs01/mr-training-api/internal/application/product"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	storeapp "github.com/innotechlabs01/mr-training-api/internal/application/store"
	todayapp "github.com/innotechlabs01/mr-training-api/internal/application/today"
	trainingapp "github.com/innotechlabs01/mr-training-api/internal/application/training"
	userdomain "github.com/innotechlabs01/mr-training-api/internal/application/user"
	videoviewapp "github.com/innotechlabs01/mr-training-api/internal/application/videoview"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/handlers"
	alertinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/alert"
	bloginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/blog"
	cacheinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/cache"
	coachinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach"
	communityinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/community"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	eventinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/event"
	favoriteinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/favorite"
	firebaseinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/firebase"
	healthinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/health"
	importinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/import"
	inviteinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/invite"
	membershipinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/membership"
	notificationinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/notification"
	onboardinginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/onboarding"
	polarinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/polar"
	productinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/product"
	runninginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
	storeinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/store"
	todayinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/today"
	traininginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/training"
	userinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/user"
	videoviewinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/videoview"
	ws "github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
	userhttp "github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/routes"
	"github.com/innotechlabs01/mr-training-api/internal/logger"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// Version is set at build time via ldflags.
var Version = "0.1.0"

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		panic("failed to load config: " + err.Error())
	}

	// Initialize structured logger
	logger.Init(cfg.LogLevel)
	defer logger.Sync()

	log := logger.L()
	log.Info("starting application",
		zap.String("app", cfg.AppName),
		zap.String("env", cfg.AppEnv),
		zap.String("version", Version),
	)

	// Initialize database connection
	var db *database.DB
	if cfg.DatabaseURL != "" {
		db, err = database.Connect(cfg.DatabaseURL, cfg.TursoAuthToken)
		if err != nil {
			log.Error("failed to connect to database", zap.Error(err))
			os.Exit(1)
		}
		defer db.Close()
		log.Info("database connected")
	} else {
		log.Warn("no database URL configured, running without database")
	}

	// Initialize WebSocket hub for realtime events
	hub := ws.NewHub()
	go hub.Run()
	log.Info("websocket hub initialized")

	// Initialize optional Redis response cache. Fail-open: if Redis is
	// unavailable or unconfigured, the cache stays a transparent no-op.
	if cfg.RedisURL != "" {
		redisCache, cacheErr := cacheinfrastructure.NewRedis(cfg.RedisURL)
		if cacheErr != nil {
			log.Warn("redis cache disabled, continuing without cache", zap.Error(cacheErr))
			middleware.SetCache(nil)
		} else {
			middleware.SetCache(redisCache)
			log.Info("redis response cache enabled")
		}
	} else {
		middleware.SetCache(nil)
		log.Warn("REDIS_URL not set, response caching disabled")
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      cfg.AppName,
		ErrorHandler: customErrorHandler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
		BodyLimit:    10 * 1024 * 1024, // 10MB
	})

	// Global middleware — order matters.
	// 1. Recover: catch panics first so all downstream middleware is protected.
	// 2. SecurityHeaders: set hardening headers before any response is sent.
	// 3. RequestID: assign a tracing ID early for logging and error correlation.
	// 4. Logger: log every request/response cycle.
	// 5. CORS: handle cross-origin requests before rate limiting or auth.
	// 6. RateLimit: throttle by IP to prevent abuse.
	// 7. Timeout: enforce a maximum handler duration.
	// 8. BodyLimit: reject oversized request bodies.
	app.Use(middleware.Recover())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.RequestID())
	app.Use(middleware.Logger())
	app.Use(middleware.CORS(cfg.CORSOrigins))
	app.Use(middleware.RateLimit(100, 60))
	app.Use(middleware.Timeout(30))
	app.Use(middleware.BodyLimit(10))

	// Health check routes (no auth required)
	app.Get("/health", handlers.HealthCheck(cfg.AppName, cfg.AppEnv))
	if db != nil {
		app.Get("/ready", handlers.ReadinessCheck(db.DB))
	} else {
		app.Get("/ready", handlers.ReadinessCheck(nil))
	}

	// WebSocket route (Clerk auth via query param)
	if cfg.ClerkSecretKey != "" {
		app.Get("/ws",
			middleware.WSAuth(cfg.ClerkSecretKey),
			userhttp.HandleWebSocket(hub),
		)
		log.Info("websocket endpoint registered", zap.String("path", "/ws"))
	} else {
		log.Warn("CLERK_SECRET_KEY not set, skipping websocket endpoint")
	}

	// Protected API routes (require Clerk authentication)
	if cfg.ClerkSecretKey != "" {
		api := app.Group("/api/v1")
		api.Use(middleware.RequireAuth(cfg.ClerkSecretKey))

		// Wire User domain
		userRepo := userinfrastructure.NewRepository(db.DB)
		userService := userdomain.NewService(userRepo)
		userHandler := userhttp.NewUserHandler(userService)

		// Register user routes
		routes.RegisterUserRoutes(api, userHandler)

		// Wire Training domain
		trainingExerciseRepo := traininginfrastructure.NewExerciseRepository(db.DB)
		trainingWorkoutRepo := traininginfrastructure.NewWorkoutRepository(db.DB)
		trainingProgressRepo := traininginfrastructure.NewProgressRepository(db.DB)
		trainingSessionRepo := traininginfrastructure.NewTrainingSessionRepository()
		trainingService := trainingapp.NewService(trainingExerciseRepo, trainingWorkoutRepo, trainingProgressRepo, trainingSessionRepo)
		trainingHandler := userhttp.NewTrainingHandler(trainingService)

		// Register training routes
		routes.RegisterTrainingRoutes(api, trainingHandler)

		// Wire Membership domain
		membershipRepo := membershipinfrastructure.NewRepository(db.DB)
		membershipService := membershipapp.NewService(membershipRepo)
		membershipHandler := userhttp.NewMembershipHandler(membershipService)

		// Register membership routes
		routes.RegisterMembershipRoutes(api, membershipHandler)

		// Wire Event domain
		eventRepo := eventinfrastructure.NewRepository(db.DB)
		eventService := eventapp.NewService(eventRepo)
		eventHandler := userhttp.NewEventHandler(eventService)

		// Register event routes
		routes.RegisterEventRoutes(api, eventHandler)

		// Wire Product domain
		productRepo := productinfrastructure.NewRepository(db.DB)
		productService := productapp.NewService(productRepo)
		productHandler := userhttp.NewProductHandler(productService)

		// Register product routes
		routes.RegisterProductRoutes(api, productHandler)

		// Wire Notification domain
		notifRepo := notificationinfrastructure.NewRepository(db.DB)
		fcmSender, _ := firebaseinfra.NewFCMSender(
			cfg.FirebaseProjectID,
			cfg.FirebaseClientEmail,
			cfg.FirebasePrivateKey,
		)
		notifService := notificationapp.NewService(notifRepo, fcmSender)
		notifHandler := userhttp.NewNotificationHandler(notifService)

		// Register notification routes
		routes.RegisterNotificationRoutes(api, notifHandler)

		// Wire Running domain
		runningRepo := runninginfrastructure.NewRepository(db.DB)
		runningService := runningapp.NewService(runningRepo)
		runningHandler := userhttp.NewRunningHandler(runningService)

		// Register running routes
		routes.RegisterRunningRoutes(api, runningHandler)

		// Wire Health domain
		healthRepo := healthinfrastructure.NewRepository(db.DB)
		healthService := healthapp.NewService(healthRepo)
		healthDataHandler := userhttp.NewHealthDataHandler(healthService)

		// Register health routes
		routes.RegisterHealthRoutes(api, healthDataHandler)

		// Wire Today domain
		todayRepo := todayinfrastructure.NewRepository(db.DB)
		todayService := todayapp.NewService(todayRepo)
		todayHandler := userhttp.NewTodayHandler(todayService)

		// Register today routes
		routes.RegisterTodayRoutes(api, todayHandler)

		// Wire Onboarding domain
		onboardingRepo := onboardinginfrastructure.NewRepository(db.DB)
		onboardingService := onboardingapp.NewService(onboardingRepo)
		onboardingHandler := userhttp.NewOnboardingHandler(onboardingService)

		// Register onboarding routes
		routes.RegisterOnboardingRoutes(api, onboardingHandler)

		// Wire Invite domain
		inviteRepo := inviteinfrastructure.NewRepository(db.DB)
		inviteService := inviteapp.NewService(inviteRepo)
		inviteHandler := userhttp.NewInviteHandler(inviteService)

		// Register invite routes
		routes.RegisterInviteRoutes(api, inviteHandler)

		// Wire Favorite domain
		favoriteRepo := favoriteinfrastructure.NewRepository(db.DB)
		favoriteService := favoriteapp.NewService(favoriteRepo)
		favoriteHandler := userhttp.NewFavoriteHandler(favoriteService)

		// Register favorite routes
		routes.RegisterFavoriteRoutes(api, favoriteHandler)

		// Wire Alert domain
		alertRepo := alertinfrastructure.NewRepository(db.DB)
		alertService := alertapp.NewService(alertRepo)
		alertHandler := userhttp.NewAlertHandler(alertService)

		// Register alert routes
		routes.RegisterAlertRoutes(api, alertHandler)

		// Wire Blog domain
		blogRepo := bloginfrastructure.NewRepository(db.DB)
		blogService := blogapp.NewService(blogRepo)
		blogHandler := userhttp.NewBlogHandler(blogService)

		// Register blog routes
		routes.RegisterBlogRoutes(api, blogHandler)

		// Wire Polar domain
		polarRepo := polarinfrastructure.NewRepository(db.DB)
		polarService := polarapp.NewService(polarRepo)
		polarHandler := userhttp.NewPolarHandler(polarService)

		// Register polar routes
		routes.RegisterPolarRoutes(api, polarHandler)

		// Wire Import domain
		importRepo := importinfrastructure.NewRepository(db.DB)
		importService := importapp.NewService(importRepo)
		importHandler := userhttp.NewImportHandler(importService)

		// Register import routes
		routes.RegisterImportRoutes(api, importHandler)

		// Wire VideoView domain
		videoViewRepo := videoviewinfrastructure.NewRepository(db.DB)
		videoViewService := videoviewapp.NewService(videoViewRepo)
		videoViewHandler := userhttp.NewVideoViewHandler(videoViewService)

		// Register video view routes
		routes.RegisterVideoViewRoutes(api, videoViewHandler)

		// Wire Community domain
		communityRepo := communityinfrastructure.NewRepository(db.DB)
		communityService := communityapp.NewService(communityRepo)
		communityHandler := userhttp.NewCommunityHandler(communityService)

		// Register community routes
		routes.RegisterCommunityRoutes(api, communityHandler)

		// Wire Store domain (athlete-facing)
		var storeRepoDB *sql.DB
		if db != nil {
			storeRepoDB = db.DB
		}
		storeRepo := storeinfrastructure.NewRepository(storeRepoDB)
		storeService := storeapp.NewService(storeRepo)
		storeHandler := userhttp.NewStoreHandler(storeService)

		// Register store routes
		routes.RegisterStoreRoutes(api, storeHandler)

		// Wire Athlete Scheduling (availability/appointments)
		var coachRepoDB *sql.DB
		if db != nil {
			coachRepoDB = db.DB
		}
		coachRepo := coachinfrastructure.NewRepository(coachRepoDB)
		coachService := coachapp.NewService(coachRepo)
		schedulingHandler := userhttp.NewAthleteSchedulingHandler(coachService)
		routes.RegisterAthleteSchedulingRoutes(api, schedulingHandler)
	} else {
		log.Warn("CLERK_SECRET_KEY not set, skipping protected route registration")
	}

	// Start server
	addr := ":" + cfg.AppPort
	log.Info("server starting", zap.String("addr", addr))

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Info("shutting down gracefully...")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := app.ShutdownWithContext(ctx); err != nil {
			log.Error("server forced to shutdown", zap.Error(err))
		}
	}()

	if err := app.Listen(addr); err != nil {
		log.Error("server error", zap.Error(err))
		os.Exit(1)
	}

	log.Info("server stopped")
}

// customErrorHandler returns a Fiber error handler that uses structured
// response formatting for all error types.
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
