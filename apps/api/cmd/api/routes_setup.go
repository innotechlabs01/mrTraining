// Package main contains route registration and domain wiring for the API server.
// All domain services, repositories, and handlers are instantiated here and
// registered on the Fiber router. Kept separate from main.go for clarity.
package main

import (
	"context"
	"database/sql"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	alertapp "github.com/innotechlabs01/mr-training-api/internal/application/alert"
	allyapp "github.com/innotechlabs01/mr-training-api/internal/application/ally"
	allycatalogapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_catalog"
	allyopsapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_operations"
	allypaymentdeclarationapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_payment_declaration"
	allypurchaseapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_purchase"
	analyticsapp "github.com/innotechlabs01/mr-training-api/internal/application/analytics"
	athleteapp "github.com/innotechlabs01/mr-training-api/internal/application/athlete"
	blogapp "github.com/innotechlabs01/mr-training-api/internal/application/blog"
	challengeapp "github.com/innotechlabs01/mr-training-api/internal/application/challenge"
	checkinapp "github.com/innotechlabs01/mr-training-api/internal/application/checkin"
	checkoutapp "github.com/innotechlabs01/mr-training-api/internal/application/checkout"
	coachapp "github.com/innotechlabs01/mr-training-api/internal/application/coach"
	coachlandingapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_landing"
	coachsetapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_settlement"
	coachfeedapp "github.com/innotechlabs01/mr-training-api/internal/application/coachfeed"
	commissionapp "github.com/innotechlabs01/mr-training-api/internal/application/commission"
	commissionentryapp "github.com/innotechlabs01/mr-training-api/internal/application/commission_entry"
	communityapp "github.com/innotechlabs01/mr-training-api/internal/application/community"
	crmapp "github.com/innotechlabs01/mr-training-api/internal/application/crm"
	earningsapp "github.com/innotechlabs01/mr-training-api/internal/application/earnings"
	errorapp "github.com/innotechlabs01/mr-training-api/internal/application/error_tracking"
	eventapp "github.com/innotechlabs01/mr-training-api/internal/application/event"
	favoriteapp "github.com/innotechlabs01/mr-training-api/internal/application/favorite"
	formmetricsapp "github.com/innotechlabs01/mr-training-api/internal/application/formmetrics"
	formrecordingapp "github.com/innotechlabs01/mr-training-api/internal/application/formrecording"
	gamificationapp "github.com/innotechlabs01/mr-training-api/internal/application/gamification"
	healthapp "github.com/innotechlabs01/mr-training-api/internal/application/health"
	importapp "github.com/innotechlabs01/mr-training-api/internal/application/import"
	importactivityapp "github.com/innotechlabs01/mr-training-api/internal/application/importactivity"
	inviteapp "github.com/innotechlabs01/mr-training-api/internal/application/invite"
	leaderboardapp "github.com/innotechlabs01/mr-training-api/internal/application/leaderboard"
	membershipapp "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	messageapp "github.com/innotechlabs01/mr-training-api/internal/application/message"
	notificationapp "github.com/innotechlabs01/mr-training-api/internal/application/notification"
	nutritionapp "github.com/innotechlabs01/mr-training-api/internal/application/nutrition"
	onboardingapp "github.com/innotechlabs01/mr-training-api/internal/application/onboarding"
	paymentapp "github.com/innotechlabs01/mr-training-api/internal/application/payment"
	paymentledgersvc "github.com/innotechlabs01/mr-training-api/internal/application/payment_ledger"
	planapp "github.com/innotechlabs01/mr-training-api/internal/application/plan"
	productapp "github.com/innotechlabs01/mr-training-api/internal/application/product"
	routineapp "github.com/innotechlabs01/mr-training-api/internal/application/routine"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	storeapp "github.com/innotechlabs01/mr-training-api/internal/application/store"
	subscriptionapp "github.com/innotechlabs01/mr-training-api/internal/application/subscription"
	supportapp "github.com/innotechlabs01/mr-training-api/internal/application/support"
	testimonialapp "github.com/innotechlabs01/mr-training-api/internal/application/testimonial"
	todayapp "github.com/innotechlabs01/mr-training-api/internal/application/today"
	trainingapp "github.com/innotechlabs01/mr-training-api/internal/application/training"
	trainingaiapp "github.com/innotechlabs01/mr-training-api/internal/application/trainingai"
	trmapp "github.com/innotechlabs01/mr-training-api/internal/application/trm"
	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	vaapp "github.com/innotechlabs01/mr-training-api/internal/application/videoanalytics"
	videoviewapp "github.com/innotechlabs01/mr-training-api/internal/application/videoview"
	wompiavailapp "github.com/innotechlabs01/mr-training-api/internal/application/wompiavailability"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	healthdomain "github.com/innotechlabs01/mr-training-api/internal/domain/health"
	alertinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/alert"
	allyinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally"
	allycataloginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_catalog"
	allyopsinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_operations"
	allypaymentdeclarationinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_payment_declaration"
	analyticsinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/analytics"
	athleteinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/athlete"
	auditinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
	bloginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/blog"
	challengeinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/challenge"
	checkininfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/checkin"
	checkoutinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/checkout"
	coachinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach"
	coachlandinginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach_landing"
	coachsetinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach_settlement"
	coachfeedinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coachfeed"
	commissioninfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/commission"
	commissionentryinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/commission_entry"
	communityinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/community"
	crminfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/crm"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	errorinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/error_tracking"
	eventinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/event"
	expoinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/expo"
	favoriteinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/favorite"
	formmetricsinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/formmetrics"
	formrecordinginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/formrecording"
	gamificationinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/gamification"
	healthinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/health"
	importinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/import"
	inviteinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/invite"
	leaderboardinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/leaderboard"
	membershipinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/membership"
	messageinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/message"
	nutritioninfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/nutrition"
	notificationinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/notification"
	onboardinginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/onboarding"
	paymentledgerinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/payment_ledger"
	planinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/plan"
	productinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/product"
	routineinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/routine"
	runninginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
	storeinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/store"
	subscriptioninfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription"
	wompiinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription/wompi"
	supportinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/support"
	testimonialinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/testimonial"
	todayinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/today"
	traininginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/training"
	trainingaiinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/trainingai"
	userinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/user"
	vainfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/videoanalytics"
	videoviewinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/videoview"
	ws "github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/realtime"
	handlers "github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/routes"
	"github.com/innotechlabs01/mr-training-api/internal/jobs"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
	"github.com/innotechlabs01/mr-training-api/internal/workers"
	firebaseinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/firebase"
	"github.com/nats-io/nats.go"
)

// RouteRuntimeDeps supplies event bus and cluster infrastructure into route wiring.
type RouteRuntimeDeps struct {
	Publisher eventbus.Publisher
	NATSConn  *nats.Conn
}

// RouteWiringResult exposes hooks and worker dependencies created during route registration.
type RouteWiringResult struct {
	SubscriptionHandler *handlers.SubscriptionHandler
	ErrorHandler        *handlers.ErrorHandler
	WSHub               *ws.Hub
	WorkerDeps          workers.WorkerDeps
	RealtimeBridge      *realtime.Bridge
}

// registerProtectedRoutes maintains backward compatibility for direct callers.
func registerProtectedRoutes(app *fiber.App, api fiber.Router, pub fiber.Router, cfg *config.Config, db *database.DB, log *zap.Logger) (*handlers.SubscriptionHandler, *handlers.ErrorHandler) {
	res := registerProtectedRoutesWithDeps(context.Background(), app, api, pub, cfg, db, log, RouteRuntimeDeps{})
	return res.SubscriptionHandler, res.ErrorHandler
}

// registerProtectedRoutesWithDeps wires all domain services, event outbox hooks,
// availability gates, realtime bridge, and routes.
func registerProtectedRoutesWithDeps(
	ctx context.Context,
	app *fiber.App,
	api fiber.Router,
	pub fiber.Router,
	cfg *config.Config,
	db *database.DB,
	log *zap.Logger,
	runtimeDeps RouteRuntimeDeps,
) RouteWiringResult {
	var stdlibDB *sql.DB
	if db != nil {
		stdlibDB = db.DB
	}
	routes.RegisterCriticalIdempotencyMiddleware(api, pub, stdlibDB)

	outboxStore := eventbus.NewSQLOutboxStore(stdlibDB)

	// --- User domain ---
	userRepo := userinfrastructure.NewRepository(stdlibDB)
	clerkIdentity := userinfrastructure.NewClerkClient(cfg.ClerkSecretKey)
	userService := userapp.NewService(userRepo, clerkIdentity).WithMetadataWriter(clerkIdentity)
	userHandler := handlers.NewUserHandler(userService)

	// DB fallback for role lookup when Clerk backend API is slow or circuit is open.
	if stdlibDB != nil {
		middleware.SetRoleFallback(func(fbCtx context.Context, userID string) string {
			tx, txErr := stdlibDB.BeginTx(fbCtx, &sql.TxOptions{ReadOnly: true})
			if txErr != nil {
				return ""
			}
			defer tx.Rollback()
			_, _ = tx.ExecContext(fbCtx, `SELECT set_config('app.internal_execution_context', 'clerk_provisioning', true)`)
			u, uerr := userRepo.WithExecutor(tx).GetByID(fbCtx, userID)
			if uerr != nil || u == nil {
				return ""
			}
			return u.Role
		})
	}

	// Tenant resolver for multi-tenant isolation.
	tenantResolver := userinfrastructure.NewTenantResolver(userRepo, clerkIdentity)
	api.Use(middleware.RequireTenantContext(tenantResolver))

	routes.RegisterUserRoutes(api, userHandler)

	// --- Training domain ---
	trainingExerciseRepo := traininginfrastructure.NewExerciseRepository(stdlibDB)
	trainingWorkoutRepo := traininginfrastructure.NewWorkoutRepository(stdlibDB)
	trainingProgressRepo := traininginfrastructure.NewProgressRepository(stdlibDB)
	trainingSessionRepo := traininginfrastructure.NewSessionRepository(stdlibDB)
	trainingService := trainingapp.NewService(trainingExerciseRepo, trainingWorkoutRepo, trainingProgressRepo, trainingSessionRepo)
	trainingHandler := handlers.NewTrainingHandler(trainingService, stdlibDB).WithOutbox(outboxStore)

	// Gamification (needed by Membership handler for badge milestones).
	gamificationRepo := gamificationinfrastructure.NewRepository(db.DB)
	gamificationService := gamificationapp.NewService(gamificationRepo)

	// Membership domain.
	membershipRepo := membershipinfrastructure.NewRepository(db.DB)
	membershipService := membershipapp.NewService(membershipRepo)
	membershipHandler := handlers.NewMembershipHandler(membershipService, gamificationService, db.DB, tenantResolver)

	// Coach domain.
	coachRepo := coachinfrastructure.NewRepository(db.DB)
	coachService := coachapp.NewService(coachRepo)
	coachHandler := handlers.NewCoachHandler(coachService, stdlibDB)
	routes.RegisterCoachSchedulingRoutes(api, coachHandler)
	routes.RegisterCoachAthleteRoutes(api, coachHandler)

	// Membership status reader.
	statusReader := middleware.NewMembershipStatusReader(membershipService, db.DB)

	routes.RegisterTrainingRoutes(api, trainingHandler, statusReader)

	// --- Training AI ---
	trainingAIRepo := trainingaiinfra.NewRepository(db.DB)
	trainingAIService := trainingaiapp.NewService(trainingAIRepo)
	trainingAIHandler := handlers.NewTrainingAIHandler(trainingAIService)
	routes.RegisterTrainingAIRoutes(api, trainingAIHandler, statusReader)

	// --- Today ---
	todayRepo := todayinfrastructure.NewRepository(db.DB)
	todayService := todayapp.NewService(todayRepo)
	todayHandler := handlers.NewTodayHandler(todayService)
	routes.RegisterTodayRoutes(api, todayHandler, statusReader)

	// --- Invite ---
	inviteRepo := inviteinfrastructure.NewRepository(db.DB)
	inviteService := inviteapp.NewService(inviteRepo)

	// --- Clerk webhook (PUBLIC, outside the auth group) ---
	// Clerk posts user.created / user.updated here. This route is what
	// provisions the users + coaches rows and mirrors role + coachCode into
	// Clerk's PUBLIC metadata. It was never registered, so no account was ever
	// provisioned and every user resolved as "athlete".
	clerkWebhookHandler := handlers.NewClerkWebhookHandler(
		userService,
		inviteService,
		cfg.ClerkSecretKey,
		cfg.ClerkWebhookSecret,
	).WithMetadataWriter(clerkIdentity).WithOutbox(outboxStore)
	routes.RegisterClerkWebhookRoutes(app, clerkWebhookHandler)
	log.Info("clerk webhook registered", zap.String("path", "/webhooks/clerk"))

	// --- Plan & Payment Availability Gate ---
	wompiAvailSvc := wompiavailapp.NewService()
	wompiAvailHandler := handlers.NewWompiAvailabilityHandler(wompiAvailSvc)
	routes.RegisterWompiAvailabilityRoutes(api, wompiAvailHandler)

	trmService := trmapp.NewService(stdlibDB)
	planRepo := planinfrastructure.NewRepository(stdlibDB)
	planService := planapp.NewService(planRepo)
	planHandler := handlers.NewPlanHandler(planService, trmService, inviteService, cfg.PlatformSuperAdminClerkIDs...)

	// --- Subscription ---
	subRepo := subscriptioninfra.NewRepository(stdlibDB)
	wompiProvider := wompiinfra.NewAdapter(cfg)
	ledgerRepo := paymentledgerinfra.NewRepository(stdlibDB)
	ledgerSvc := paymentledgersvc.NewService(ledgerRepo)
	commissionEntryRepo := commissionentryinfra.NewRepository(stdlibDB)
	subscriptionService := subscriptionapp.NewService(cfg, subRepo, wompiProvider, planRepo, ledgerSvc, commissionEntryRepo).
		WithMetadataWriter(clerkIdentity).
		WithAvailabilityGate(wompiAvailSvc).
		WithDB(stdlibDB).
		WithOutbox(outboxStore)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService).WithDB(stdlibDB)

	// --- Hybrid checkout (pay before registering) ---
	checkoutRepo := checkoutinfrastructure.NewRepository(stdlibDB)
	checkoutService := checkoutapp.NewService(cfg, checkoutRepo, wompiProvider, planRepo, userService, subscriptionService).
		WithIdentityReader(clerkIdentity).
		WithAvailabilityGate(wompiAvailSvc).
		WithOutbox(outboxStore)
	subscriptionService.WithCheckoutRecorder(checkoutService)
	checkoutHandler := handlers.NewCheckoutHandler(checkoutService)
	routes.RegisterMembershipRoutes(api, membershipHandler, planHandler, statusReader)
	routes.RegisterSubscriptionRoutes(api, subscriptionHandler)
	routes.RegisterCoachPlatformSubscriptionRoutes(api, subscriptionHandler)
	checkoutHandler.RegisterCheckoutRoutes(api, pub)

	// --- Event (protected + public share/RSVP links) ---
	eventRepo := eventinfrastructure.NewRepository(stdlibDB)
	eventService := eventapp.NewService(eventRepo)
	hub := ws.NewHub()
	go hub.RunWithContext(ctx)
	rtBridge := realtime.NewBridge(runtimeDeps.NATSConn, hub, runningapp.DefaultHub, log)
	if err := rtBridge.Start(ctx); err != nil {
		log.Warn("realtime cross-replica bridge failed to start", zap.Error(err))
	}
	eventHandler := handlers.NewEventHandler(eventService, hub, stdlibDB)
	routes.RegisterEventRoutes(api, eventHandler)
	routes.RegisterPublicEventRoutes(pub, eventHandler)

	// --- Plan routes (coach CRUD + public) ---
	routes.RegisterPlanRoutes(api, planHandler)
	routes.RegisterPublicPlanRoutes(pub, planHandler)

	// --- Product (protected + public store) ---
	productRepo := productinfrastructure.NewRepository(stdlibDB)
	productService := productapp.NewService(productRepo)
	productHandler := handlers.NewProductHandler(productService)
	routes.RegisterProductRoutes(api, productHandler)
	routes.RegisterPublicProductRoutes(pub, productHandler)

	// --- Notification ---
	notifRepo := notificationinfrastructure.NewRepository(stdlibDB)
	pushSender := expoinfra.NewSender()
	var fcmSender workers.FCMPushSender
	if cfg.FirebaseProjectID != "" && cfg.FirebaseClientEmail != "" && cfg.FirebasePrivateKey != "" {
		if fcm, ferr := firebaseinfra.NewFCMSender(cfg.FirebaseProjectID, cfg.FirebaseClientEmail, cfg.FirebasePrivateKey); ferr == nil {
			fcmSender = fcm
		}
	}
	notifService := notificationapp.NewService(notifRepo, pushSender).WithOutbox(outboxStore)
	notifHandler := handlers.NewNotificationHandler(notifService)
	routes.RegisterNotificationRoutes(api, notifHandler)

	// --- Support ---
	supportRepo := supportinfrastructure.NewRepository(stdlibDB)
	supportService := supportapp.NewService(supportRepo, notifService).WithOutbox(outboxStore)
	supportHandler := handlers.NewSupportHandler(supportService, stdlibDB)
	routes.RegisterSupportRoutes(api, supportHandler)

	// --- Analytics ---
	analyticsRepo := analyticsinfrastructure.NewRepository(stdlibDB)
	analyticsService := analyticsapp.NewService(analyticsRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService, stdlibDB, tenantResolver)
	routes.RegisterAnalyticsRoutes(api, analyticsHandler)

	// --- Running ---
	runningRepo := runninginfrastructure.NewRepository(stdlibDB)
	runningService := runningapp.NewService(runningRepo, stdlibDB).WithOutbox(outboxStore)
	runningHandler := handlers.NewRunningHandler(runningService, tenantResolver)
	routes.RegisterRunningRoutes(api, runningHandler)

	runningWorkoutHandler := handlers.NewRunningWorkoutHandler(runningService, stdlibDB)
	routes.RegisterRunningWorkoutRoutes(api, runningWorkoutHandler)

	// --- Import activity ---
	importActivityService := importactivityapp.NewService(runningService)
	importActivityHandler := handlers.NewImportActivityHandler(importActivityService)
	routes.RegisterRunningImportRoutes(api, importActivityHandler)

	// --- Garmin provider & public webhook ---
	runningTokenStore := runninginfrastructure.NewTokenStore(stdlibDB)
	runningService.RegisterProvider(runninginfrastructure.NewGarminProvider(runningTokenStore))
	garminWebhookHandler := handlers.NewGarminWebhookHandler(runningService, os.Getenv("GARMIN_WEBHOOK_SECRET")).
		WithPublisher(runtimeDeps.Publisher).
		WithOutbox(outboxStore)
	routes.RegisterWebhookRoutes(app, garminWebhookHandler)

	// --- Check-in ---
	checkinRepo := checkininfra.NewRepository(db.DB)
	checkinService := checkinapp.NewService(checkinRepo)
	checkinHandler := handlers.NewCheckinHandler(checkinService)
	routes.RegisterCheckinRoutes(api, checkinHandler)

	// --- Health ---
	healthRepo := healthinfrastructure.NewRepository(db.DB)
	healthService := healthapp.NewService(healthRepo)
	runningService.SetHealthRecorder(func(ctx context.Context, athleteID, metricType string, value float64, unit, source string) error {
		return healthService.RecordMetric(ctx, athleteID, &healthdomain.HealthMetric{
			AthleteID:  athleteID,
			MetricType: metricType,
			Value:      value,
			Unit:       unit,
			Source:     source,
			RecordedAt: time.Now().UTC().Format(time.RFC3339),
		})
	})
	healthDataHandler := handlers.NewHealthDataHandler(healthService)
	routes.RegisterHealthRoutes(api, healthDataHandler)

	// --- Onboarding ---
	onboardingRepo := onboardinginfrastructure.NewRepository(db.DB)
	onboardingService := onboardingapp.NewService(onboardingRepo)
	onboardingHandler := handlers.NewOnboardingHandler(onboardingService)
	routes.RegisterOnboardingRoutes(api, onboardingHandler)

	// --- Invite routes (protected + public code preview) ---
	inviteHandler := handlers.NewInviteHandler(inviteService, userService, cfg.ClerkSecretKey, stdlibDB).
		WithClerkClient(clerkIdentity)
	routes.RegisterInviteRoutes(api, inviteHandler)
	routes.RegisterPublicInviteRoutes(app, inviteHandler)

	// --- Favorite ---
	favoriteRepo := favoriteinfrastructure.NewRepository(db.DB)
	favoriteService := favoriteapp.NewService(favoriteRepo)
	favoriteHandler := handlers.NewFavoriteHandler(favoriteService)
	routes.RegisterFavoriteRoutes(api, favoriteHandler)

	// --- Ally domain (Phase B) ---
	allyRepo := allyinfrastructure.NewRepository(db.DB)
	allyService := allyapp.NewService(allyRepo)
	commissionRepo := commissioninfrastructure.NewRepository(db.DB)
	commissionService := commissionapp.NewService(commissionRepo)
	auditRepo := auditinfrastructure.NewRepository(db.DB)
	allyHandler := handlers.NewAllyHandler(allyService, commissionService, inviteService, auditRepo)
	routes.RegisterAllyRoutes(api, allyHandler)
	api.Get("/athlete/allies", middleware.RequireAthlete(), allyHandler.ListAthleteAllies)

	// --- Ally Catalog (Phase C) ---
	allyCatalogRepo := allycataloginfrastructure.NewRepository(db.DB)
	allyCatalogService := allycatalogapp.NewService(allyCatalogRepo)
	allyCatalogHandler := handlers.NewAllyCatalogHandler(allyCatalogService)
	routes.RegisterAllyCatalogRoutes(api, allyCatalogHandler)
	allyCatalogAthleteHandler := handlers.NewAllyCatalogAthleteHandler(allyCatalogService, inviteService)
	routes.RegisterAllyAthleteRoutes(api, allyCatalogAthleteHandler)

	// --- Ally Operations (Phase D) ---
	allyOpsRepo := allyopsinfrastructure.NewRepository(db.DB)
	allyOpsService := allyopsapp.NewService(allyOpsRepo)
	allyOpsHandler := handlers.NewAllyOperationsHandler(allyOpsService)
	routes.RegisterAllyOperationsRoutes(api, allyOpsHandler)

	// --- Ally Payment Declaration (Phase E) ---
	allyPaymentDeclRepo := allypaymentdeclarationinfrastructure.NewRepository(db.DB)
	allyPaymentDeclService := allypaymentdeclarationapp.NewService(allyPaymentDeclRepo)
	allyPaymentDeclHandler := handlers.NewAllyPaymentDeclarationHandler(allyPaymentDeclService)
	routes.RegisterAllyPaymentDeclarationRoutes(api, allyPaymentDeclHandler)

	// --- Commission Entry (Phase E) ---
	commissionEntryRepo = commissionentryinfra.NewRepository(db.DB)
	commissionEntryService := commissionentryapp.NewService(commissionEntryRepo)
	commissionEntryHandler := handlers.NewCommissionEntryHandler(commissionEntryService, db.DB)
	routes.RegisterCommissionEntryRoutes(api, commissionEntryHandler)

	// --- Commercial Policy Engine ---
	commissionPolicyHandler := handlers.NewCommissionPolicyHandler(commissionService, commissionEntryService)
	routes.RegisterPolicyRoutes(api, commissionPolicyHandler)

	// --- Earnings ---
	earningsService := earningsapp.NewService(productRepo, commissionEntryRepo)
	earningsHandler := handlers.NewEarningsHandler(earningsService)
	routes.RegisterEarningsRoutes(api, earningsHandler)

	// --- Ally Purchase ---
	allyPurchaseService := allypurchaseapp.NewService(inviteRepo, allyCatalogRepo, allyRepo, allyOpsRepo, commissionEntryRepo, log).
		WithOutbox(outboxStore).
		WithDB(stdlibDB)
	allyPurchaseHandler := handlers.NewAllyPurchaseHandler(allyPurchaseService)
	routes.RegisterAllyPurchaseRoutes(api, allyPurchaseHandler)

	// --- Coach Settlement (Phase F) ---
	coachSetRepo := coachsetinfrastructure.NewRepository(db.DB)
	coachSetService := coachsetapp.NewService(coachSetRepo)
	coachSetHandler := handlers.NewCoachSettlementHandler(coachSetService, db.DB)
	coachSetDocHandler := handlers.NewCoachSettlementDocumentHandler(coachSetService)
	coachPayHandler := handlers.NewCoachPaymentRecordHandler(coachSetService)
	routes.RegisterSettlementRoutes(api, coachSetHandler)
	routes.RegisterSettlementDocumentRoutes(api, coachSetDocHandler)
	routes.RegisterCoachPaymentRecordRoutes(api, coachPayHandler)

	// --- Landing (coach) ---
	api.Get("/landing", middleware.RequireCoach(), handlers.HandlerGetLanding(db.DB))
	api.Put("/landing", middleware.RequireCoach(), handlers.HandlerPutLanding(db.DB))
	api.Post("/landing/media", middleware.RequireCoach(), handlers.HandlerUploadLandingMedia())

	// --- Coach Landing Pages (slug-based, public serving) ---
	coachLandingRepo := coachlandinginfrastructure.NewRepository(db.DB)
	coachLandingSvc := coachlandingapp.NewService(coachLandingRepo)
	coachLandingHandler := handlers.NewCoachLandingHandler(coachLandingSvc)
	routes.RegisterCoachLandingRoutes(api, coachLandingHandler)
	routes.RegisterPublicLandingRoute(app, coachLandingHandler)

	// --- Testimonials ---
	testimonialRepo := testimonialinfra.NewRepository(db.DB)
	testimonialSvc := testimonialapp.NewService(testimonialRepo)
	testimonialHandler := handlers.NewTestimonialHandler(testimonialSvc)
	routes.RegisterTestimonialRoutes(api, testimonialHandler)
	routes.RegisterPublicTestimonialRoutes(pub, testimonialHandler)

	// --- Admin (registrado antes que CRM para que ListCoaches con búsqueda,
	// paginación y todos los campos de plan tenga prioridad sobre /admin/coaches) ---
	var adminDB *sql.DB
	if db != nil {
		adminDB = db.DB
	}
	adminHandler := handlers.NewAdminHandler(adminDB, clerkIdentity, trmService)
	routes.RegisterAdminRoutes(api, adminHandler, cfg.PlatformSuperAdminClerkIDs)

	// --- CRM Super Admin ---
	crmRepo := crminfrastructure.NewRepository(db.DB)
	crmSvc := crmapp.NewService(crmRepo)
	crmHandler := handlers.NewCRMHandler(crmSvc, cfg.PlatformSuperAdminClerkIDs)
	routes.RegisterCRMRoutes(api, crmHandler)

	// --- Alert ---
	alertRepo := alertinfrastructure.NewRepository(db.DB)
	alertService := alertapp.NewService(alertRepo)
	alertHandler := handlers.NewAlertHandler(alertService)
	routes.RegisterAlertRoutes(api, alertHandler)

	// --- Blog (protected + public articles) ---
	blogRepo := bloginfrastructure.NewRepository(db.DB)
	blogService := blogapp.NewService(blogRepo)
	blogHandler := handlers.NewBlogHandler(blogService)
	routes.RegisterBlogRoutes(api, blogHandler)
	routes.RegisterPublicBlogRoutes(pub, blogHandler)

	// --- Import ---
	importRepo := importinfrastructure.NewRepository(db.DB)
	importService := importapp.NewService(importRepo)
	importHandler := handlers.NewImportHandler(importService)
	routes.RegisterImportRoutes(api, importHandler)

	// --- VideoView ---
	videoViewRepo := videoviewinfrastructure.NewRepository(db.DB)
	videoViewService := videoviewapp.NewService(videoViewRepo)
	videoViewHandler := handlers.NewVideoViewHandler(videoViewService)
	routes.RegisterVideoViewRoutes(api, videoViewHandler)

	// --- Gamification ---
	gamificationHandler := handlers.NewGamificationHandler(gamificationService, notifService).WithDB(stdlibDB)
	routes.RegisterGamificationRoutes(api, gamificationHandler)

	// --- Leaderboard ---
	leaderboardRepo := leaderboardinfrastructure.NewRepository(db.DB)
	leaderboardService := leaderboardapp.NewService(leaderboardRepo)
	leaderboardHandler := handlers.NewLeaderboardHandler(leaderboardService)
	routes.RegisterLeaderboardRoutes(api, leaderboardHandler)

	// --- Community ---
	communityRepo := communityinfrastructure.NewRepository(db.DB)
	communityService := communityapp.NewService(communityRepo)
	communityHandler := handlers.NewCommunityHandler(communityService)
	routes.RegisterCommunityRoutes(api, communityHandler)

	// --- Video Analytics ---
	vaRepo := vainfra.NewRepository(db.DB)
	vaService := vaapp.NewService(vaRepo)
	vaHandler := handlers.NewVideoAnalyticsHandler(vaService)
	routes.RegisterVideoAnalyticsRoutes(api, vaHandler)

	// --- Coach Feed ---
	coachfeedRepo := coachfeedinfrastructure.NewRepository(db.DB)
	coachfeedService := coachfeedapp.NewService(coachfeedRepo)
	coachfeedHandler := handlers.NewCoachFeedHandler(coachfeedService)
	routes.RegisterCoachFeedRoutes(api, coachfeedHandler)

	// --- Form Metrics ---
	formmetricsRepo := formmetricsinfrastructure.NewRepository(db.DB)
	formmetricsService := formmetricsapp.NewService(formmetricsRepo)
	formmetricsHandler := handlers.NewFormMetricsHandler(formmetricsService)
	routes.RegisterFormMetricsRoutes(api, formmetricsHandler)
	api.Get("/coach/form-metrics", formmetricsHandler.GetCoachFormMetrics)

	// --- Form Recording ---
	formrecordingRepo := formrecordinginfrastructure.NewRepository(db.DB)
	formrecordingService := formrecordingapp.NewService(formrecordingRepo)
	formrecordingHandler := handlers.NewFormRecordingHandler(formrecordingService)
	routes.RegisterFormRecordingRoutes(api, formrecordingHandler)

	// --- Notification preferences ---
	routes.RegisterNotificationPreferencesRoutes(api, notifHandler)

	// --- Routine ---
	routineRepo := routineinfrastructure.NewRepository(db.DB)
	routineService := routineapp.NewService(routineRepo)
	routineHandler := handlers.NewRoutineHandler(routineService)
	routes.RegisterRoutineRoutes(api, routineHandler)

	// --- Challenge ---
	challengeRepo := challengeinfrastructure.NewRepository(db.DB)
	challengeService := challengeapp.NewService(challengeRepo)
	challengeHandler := handlers.NewChallengeHandler(challengeService, hub).
		WithGamification(gamificationService, notifService, stdlibDB)
	routes.RegisterChallengeRoutes(api, challengeHandler)

	// --- Store ---
	var storeRepoDB *sql.DB
	if db != nil {
		storeRepoDB = db.DB
	}
	storeRepo := storeinfrastructure.NewRepository(storeRepoDB)
	storeService := storeapp.NewService(storeRepo)
	storeHandler := handlers.NewStoreHandler(storeService)
	routes.RegisterStoreRoutes(api, storeHandler)

	// --- Payments (Wompi cart & athlete membership checkout + public webhook) ---
	paymentService := paymentapp.NewService(cfg, storeRepo, membershipService).
		WithLedger(stdlibDB, ledgerSvc)
	paymentHandler := handlers.NewPaymentHandler(paymentService)
	handlers.RegisterPaymentRoutes(api, paymentHandler)
	handlers.RegisterPublicPaymentRoutes(app, paymentHandler)

	// --- Nutrition ---
	var nutritionRepoDB *sql.DB
	if db != nil {
		nutritionRepoDB = db.DB
	}
	nutritionRepo := nutritioninfrastructure.NewRepository(nutritionRepoDB)
	nutritionService := nutritionapp.NewService(nutritionRepo)
	nutritionHandler := handlers.NewNutritionHandler(nutritionService)
	routes.RegisterNutritionRoutes(api, nutritionHandler)

	// --- Payment Availability Endpoint moved above subscription wiring ---
	_ = nutritionHandler

	// --- Message ---
	var messageRepoDB *sql.DB
	if db != nil {
		messageRepoDB = db.DB
	}
	messageRepo := messageinfrastructure.NewRepository(messageRepoDB)
	messageService := messageapp.NewService(messageRepo)
	messageHandler := handlers.NewMessageHandler(messageService, messageRepoDB)
	routes.RegisterMessageRoutes(api, messageHandler, cfg.ClerkSecretKey)

	// --- Athlete ---
	athleteRepo := athleteinfra.NewRepository(db.DB)
	athleteService := athleteapp.NewService(athleteRepo)
	athleteHandler := handlers.NewAthleteHandler(athleteService)
	routes.RegisterAthleteRoutes(api, athleteHandler)

	// --- Athlete Scheduling & WebRTC P2P Meet ---
	schedulingHandler := handlers.NewAthleteSchedulingHandler(coachService).WithDeps(stdlibDB, notifService)
	routes.RegisterAthleteSchedulingRoutes(api, schedulingHandler)
	meetHandler := handlers.NewMeetSignalingHandler(hub)
	routes.RegisterMeetRoutes(api, pub, meetHandler)

	// --- WebSocket real-time hub (/ws) ---
	app.Get("/ws", middleware.WSAuth(cfg.ClerkSecretKey), handlers.HandleWebSocket(hub))

	// --- Admin (ya registrado arriba con prioridad sobre CRM) ---

	// --- Coach activation ---
	// Server-authoritative coach provisioning: the role is decided by the Go
	// API (the only holder of the Clerk secret key) and mirrored into Clerk's
	// PUBLIC metadata. Both endpoints act on the authenticated caller only.
	coachActivationHandler := handlers.NewCoachActivationHandler(userService)
	coachActivationHandler.RegisterCoachActivationRoutes(api)

	// --- Error Tracking ---
	errorRepo := errorinfrastructure.NewRepository(stdlibDB)
	discordSender := errorinfrastructure.NewDiscordSender(cfg.DiscordWebhookURL)
	errorSvc := errorapp.NewService(errorRepo, discordSender, cfg.PlatformSuperAdminClerkID).
		WithOutbox(outboxStore)
	errorHandler := handlers.NewErrorHandler(errorSvc)
	routes.RegisterErrorRoutes(api, errorHandler)

	log.Info("error tracking routes registered", zap.String("path", "/api/v1/errors"))

	// --- Background jobs runner (single-leader advisory locked) ---
	if cfg.EmbeddedWorker {
		jobRunner := jobs.NewRunner(challengeService, gamificationService, notifService, trmService, log).WithDB(stdlibDB)
		go jobRunner.Start(ctx)
		log.Info("background jobs runner started (embedded worker mode)")
	}

	return RouteWiringResult{
		SubscriptionHandler: subscriptionHandler,
		ErrorHandler:        errorHandler,
		WSHub:               hub,
		RealtimeBridge:      rtBridge,
		WorkerDeps: workers.WorkerDeps{
			DB:               stdlibDB,
			Outbox:           outboxStore,
			Checkouts:        checkoutService,
			Ledger:           ledgerSvc,
			Commission:       commissionEntryRepo,
			Metadata:         clerkIdentity,
			Devices:          notifRepo,
			ExpoPush:         pushSender,
			FCMPush:          fcmSender,
			Discord:          discordSender,
			SuperAdminUserID: cfg.PlatformSuperAdminClerkID,
			Garmin:           runningService,
			Gamification:     gamificationService,
		},
	}
}
