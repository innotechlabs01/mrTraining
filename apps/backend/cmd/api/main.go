package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/mrtraining/backend/internal/api/handlers"
	"github.com/mrtraining/backend/internal/api/router"
	"github.com/mrtraining/backend/internal/athlete"
	"github.com/mrtraining/backend/internal/coach"
	"github.com/mrtraining/backend/internal/training"
	"github.com/mrtraining/backend/infrastructure/postgres"
	"github.com/mrtraining/backend/pkg/auth"
	"github.com/mrtraining/backend/pkg/config"
	"github.com/mrtraining/backend/pkg/health"
	"github.com/mrtraining/backend/pkg/logger"
	"github.com/mrtraining/backend/pkg/metrics"
	"github.com/mrtraining/backend/pkg/middleware"
	"github.com/mrtraining/backend/pkg/tracing"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}

	log := logger.New("api", cfg.Environment)
	ctx := log.WithContext(context.Background())

	var shutdownTracing func(context.Context) error
	if cfg.OTELEndpoint != "" {
		shutdownTracing, err = tracing.InitTracer("mr-training-api", cfg.OTELEndpoint)
		if err != nil {
			log.Warn().Err(err).Msg("failed to init tracing, continuing without tracing")
		} else {
			defer func() {
				if shutdownTracing != nil {
					shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()
					if err := shutdownTracing(shutdownCtx); err != nil {
						log.Error().Err(err).Msg("failed to shutdown tracing")
					}
				}
			}()
		}
	}

	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer dbPool.Close()

	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisURL,
		Password: "",
		DB:       0,
	})
	defer redisClient.Close()

	if err := runMigrations(ctx, dbPool); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	workoutRepo := postgres.NewWorkoutRepository(dbPool)
	athleteRepo := postgres.NewAthleteRepository(dbPool)
	coachRepo := postgres.NewCoachRepository(dbPool)

	uc := training.NewUseCases(workoutRepo, nil, nil)
	athleteUC := athlete.NewUseCases(athleteRepo)
	coachUC := coach.NewUseCases(coachRepo, athleteRepo)

	workoutHandler := handlers.NewWorkoutHandler(uc)
	athleteHandler := handlers.NewAthleteHandler(athleteUC)
	coachHandler := handlers.NewCoachHandler(coachUC)

	clerkCfg := auth.ClerkConfig{
		JWKSURL:          "https://" + cfg.JWTIssuer + "/.well-known/jwks.json",
		Issuer:           cfg.JWTIssuer,
		Audience:         "",
		AllowedClockSkew: 30 * time.Second,
		RefreshInterval:  1 * time.Hour,
		Logger:           &log,
	}

	clerkMW, err := auth.NewClerkMiddleware(clerkCfg)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create clerk middleware")
	}
	defer clerkMW.Stop()

	r := router.New(workoutHandler, athleteHandler, coachHandler)

	rateLimiter := middleware.NewRateLimiter(100, 1*time.Minute, &log)
	defer rateLimiter.Stop()

	dbHealth := health.NewDBHealthChecker(dbPool)
	redisHealth := health.NewRedisHealthChecker(redisClient)
	healthHandler := health.NewHealthHandler(dbHealth, redisHealth)

	app := fiber.New(fiber.Config{
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			log.Error().Err(err).Str("path", c.Path()).Msg("request error")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal server error"})
		},
	})

	app.Use(recover.New())
	app.Use(middleware.FiberRequestIDMiddleware())
	app.Use(middleware.FiberLoggingMiddleware(&log))
	app.Use(metrics.MetricsMiddleware())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.CORSMiddleware([]string{"*"}))
	app.Use(rateLimiter.Middleware())

	app.Get("/health", healthHandler.FiberLiveness)
	app.Get("/ready", healthHandler.FiberReadiness)
	app.Get("/metrics", metrics.FiberMetricsHandler())

	r.Register(app, clerkMW.FiberHandler())

	go func() {
		log.Info().Str("port", cfg.Port).Msg("Server starting")
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatal().Err(err).Msg("failed to start server")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exiting")
}

func runMigrations(ctx context.Context, db *pgxpool.Pool) error {
	return nil
}
