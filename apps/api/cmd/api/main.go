// Package main is the entrypoint for the MR Training API server.
// It initializes configuration, logging, database, middleware, and routes,
// then starts the Fiber HTTP server with graceful shutdown support.
package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	userdomain "github.com/innotechlabs01/mr-training-api/internal/application/user"
	trainingapp "github.com/innotechlabs01/mr-training-api/internal/application/training"
	membershipapp "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	eventapp "github.com/innotechlabs01/mr-training-api/internal/application/event"
	productapp "github.com/innotechlabs01/mr-training-api/internal/application/product"
	healthapp "github.com/innotechlabs01/mr-training-api/internal/application/health"
	notificationapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	firebaseinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/firebase"
	userinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/user"
	traininginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/training"
	membershipinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/membership"
	eventinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/event"
	productinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/product"
	healthinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/health"
	notificationinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/notification"
	runninginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
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
		trainingService := trainingapp.NewService(trainingExerciseRepo, trainingWorkoutRepo, trainingProgressRepo)
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
