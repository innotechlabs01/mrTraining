// Package main contains route registration and domain wiring for the API server.
// All domain services, repositories, and handlers are instantiated here and
// registered on the Fiber router. Kept separate from main.go for clarity.
package main

import (
	"context"
	"database/sql"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	analyticsapp "github.com/innotechlabs01/mr-training-api/internal/application/analytics"
	athleteapp "github.com/innotechlabs01/mr-training-api/internal/application/athlete"
	allyapp "github.com/innotechlabs01/mr-training-api/internal/application/ally"
	allycatalogapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_catalog"
	allyopsapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_operations"
	allypaymentdeclarationapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_payment_declaration"
	allypurchaseapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_purchase"
	blogapp "github.com/innotechlabs01/mr-training-api/internal/application/blog"
	challengeapp "github.com/innotechlabs01/mr-training-api/internal/application/challenge"
	checkinapp "github.com/innotechlabs01/mr-training-api/internal/application/checkin"
	coachapp "github.com/innotechlabs01/mr-training-api/internal/application/coach"
	coachsetapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_settlement"
	coachfeedapp "github.com/innotechlabs01/mr-training-api/internal/application/coachfeed"
	coachlandingapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_landing"
	crmapp "github.com/innotechlabs01/mr-training-api/internal/application/crm"
	commissionapp "github.com/innotechlabs01/mr-training-api/internal/application/commission"
	commissionentryapp "github.com/innotechlabs01/mr-training-api/internal/application/commission_entry"
	communityapp "github.com/innotechlabs01/mr-training-api/internal/application/community"
	errorapp "github.com/innotechlabs01/mr-training-api/internal/application/error_tracking"
	earningsapp "github.com/innotechlabs01/mr-training-api/internal/application/earnings"
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
	onboardingapp "github.com/innotechlabs01/mr-training-api/internal/application/onboarding"
	paymentledgersvc "github.com/innotechlabs01/mr-training-api/internal/application/payment_ledger"
	planapp "github.com/innotechlabs01/mr-training-api/internal/application/plan"
	productapp "github.com/innotechlabs01/mr-training-api/internal/application/product"
	testimonialapp "github.com/innotechlabs01/mr-training-api/internal/application/testimonial"
	routineapp "github.com/innotechlabs01/mr-training-api/internal/application/routine"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	storeapp "github.com/innotechlabs01/mr-training-api/internal/application/store"
	subscriptionapp "github.com/innotechlabs01/mr-training-api/internal/application/subscription"
	supportapp "github.com/innotechlabs01/mr-training-api/internal/application/support"
	todayapp "github.com/innotechlabs01/mr-training-api/internal/application/today"
	trainingapp "github.com/innotechlabs01/mr-training-api/internal/application/training"
	trainingaiapp "github.com/innotechlabs01/mr-training-api/internal/application/trainingai"
	trmapp "github.com/innotechlabs01/mr-training-api/internal/application/trm"
	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	vaapp "github.com/innotechlabs01/mr-training-api/internal/application/videoanalytics"
	wompiavailapp "github.com/innotechlabs01/mr-training-api/internal/application/wompiavailability"
	videoviewapp "github.com/innotechlabs01/mr-training-api/internal/application/videoview"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	alertapp "github.com/innotechlabs01/mr-training-api/internal/application/alert"
	alertinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/alert"
	allyinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally"
	allycataloginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_catalog"
	allyopsinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_operations"
	allypaymentdeclarationinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally_payment_declaration"
	athleteinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/athlete"
	auditinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
	analyticsinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/analytics"
	bloginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/blog"
	challengeinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/challenge"
	checkininfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/checkin"
	coachinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach"
	coachsetinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach_settlement"
	coachfeedinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coachfeed"
	commissioninfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/commission"
	commissionentryinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/commission_entry"
	coachlandinginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/coach_landing"
	crminfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/crm"
	communityinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/community"
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
	notificationinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/notification"
	onboardinginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/onboarding"
	paymentledgerinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/payment_ledger"
	testimonialinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/testimonial"
	planinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/plan"
	productinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/product"
	routineinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/routine"
	runninginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
	storeinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/store"
	subscriptioninfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription"
	wompiinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription/wompi"
	supportinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/support"
	todayinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/today"
	traininginfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/training"
	trainingaiinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/trainingai"
	userinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/user"
	vainfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/videoanalytics"
	videoviewinfrastructure "github.com/innotechlabs01/mr-training-api/internal/infrastructure/videoview"
	ws "github.com/innotechlabs01/mr-training-api/internal/infrastructure/websocket"
	"github.com/innotechlabs01/mr-training-api/internal/jobs"
	handlers "github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/routes"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// registerProtectedRoutes wires all domain services and registers API v1 routes.
// Returns subscription and error handlers for public webhook registration.
func registerProtectedRoutes(app *fiber.App, api fiber.Router, pub fiber.Router, cfg *config.Config, db *database.DB, log *zap.Logger) (*handlers.SubscriptionHandler, *handlers.ErrorHandler) {
	// --- User domain ---
	userRepo := userinfrastructure.NewRepository(db.DB)
	clerkIdentity := userinfrastructure.NewClerkClient(cfg.ClerkSecretKey)
	userService := userapp.NewService(userRepo, clerkIdentity).WithMetadataWriter(clerkIdentity)
	userHandler := handlers.NewUserHandler(userService)

	// Tenant resolver for multi-tenant isolation.
	tenantResolver := userinfrastructure.NewTenantResolver(userRepo, clerkIdentity)
	api.Use(middleware.RequireTenantContext(tenantResolver))

	routes.RegisterUserRoutes(api, userHandler)

	// --- Training domain ---
	trainingExerciseRepo := traininginfrastructure.NewExerciseRepository(db.DB)
	trainingWorkoutRepo := traininginfrastructure.NewWorkoutRepository(db.DB)
	trainingProgressRepo := traininginfrastructure.NewProgressRepository(db.DB)
	trainingSessionRepo := traininginfrastructure.NewSessionRepository(db.DB)
	trainingService := trainingapp.NewService(trainingExerciseRepo, trainingWorkoutRepo, trainingProgressRepo, trainingSessionRepo)
	trainingHandler := handlers.NewTrainingHandler(trainingService, db.DB)

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

	// Membership status reader.
	statusReader := middleware.NewMembershipStatusReader(membershipService)

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
	).WithMetadataWriter(clerkIdentity)
	routes.RegisterClerkWebhookRoutes(app, clerkWebhookHandler)
	log.Info("clerk webhook registered", zap.String("path", "/webhooks/clerk"))

	// --- Plan ---
	trmService := trmapp.NewService()
	planRepo := planinfrastructure.NewRepository(db.DB)
	planService := planapp.NewService(planRepo)
	planHandler := handlers.NewPlanHandler(planService, trmService, inviteService, cfg.PlatformSuperAdminClerkIDs...)

	// --- Subscription ---
	subRepo := subscriptioninfra.NewRepository(db.DB)
	wompiProvider := wompiinfra.NewAdapter(cfg)
	ledgerRepo := paymentledgerinfra.NewRepository(db.DB)
	ledgerSvc := paymentledgersvc.NewService(ledgerRepo)
	commissionEntryRepo := commissionentryinfra.NewRepository(db.DB)
	subscriptionService := subscriptionapp.NewService(cfg, subRepo, wompiProvider, planRepo, ledgerSvc, commissionEntryRepo).
		WithMetadataWriter(clerkIdentity)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService)

	routes.RegisterMembershipRoutes(api, membershipHandler, planHandler, statusReader)
	routes.RegisterSubscriptionRoutes(api, subscriptionHandler)
	routes.RegisterCoachPlatformSubscriptionRoutes(api, subscriptionHandler)

	// --- Event ---
	eventRepo := eventinfrastructure.NewRepository(db.DB)
	eventService := eventapp.NewService(eventRepo)
	hub := ws.NewHub()
	eventHandler := handlers.NewEventHandler(eventService, hub, db.DB)
	routes.RegisterEventRoutes(api, eventHandler)

	// --- Plan routes (coach CRUD + public) ---
	routes.RegisterPlanRoutes(api, planHandler)
	routes.RegisterPublicPlanRoutes(pub, planHandler)

	// --- Product ---
	productRepo := productinfrastructure.NewRepository(db.DB)
	productService := productapp.NewService(productRepo)
	productHandler := handlers.NewProductHandler(productService)
	routes.RegisterProductRoutes(api, productHandler)

	// --- Notification ---
	notifRepo := notificationinfrastructure.NewRepository(db.DB)
	pushSender := expoinfra.NewSender()
	notifService := notificationapp.NewService(notifRepo, pushSender)
	notifHandler := handlers.NewNotificationHandler(notifService)
	routes.RegisterNotificationRoutes(api, notifHandler)

	// --- Support ---
	supportRepo := supportinfrastructure.NewRepository(db.DB)
	supportService := supportapp.NewService(supportRepo, notifService)
	supportHandler := handlers.NewSupportHandler(supportService, db.DB)
	routes.RegisterSupportRoutes(api, supportHandler)

	// --- Analytics ---
	analyticsRepo := analyticsinfrastructure.NewRepository(db.DB)
	analyticsService := analyticsapp.NewService(analyticsRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService, db.DB, tenantResolver)
	routes.RegisterAnalyticsRoutes(api, analyticsHandler)

	// --- Running ---
	runningRepo := runninginfrastructure.NewRepository(db.DB)
	runningService := runningapp.NewService(runningRepo, db.DB)
	runningHandler := handlers.NewRunningHandler(runningService, tenantResolver)
	routes.RegisterRunningRoutes(api, runningHandler)

	runningWorkoutHandler := handlers.NewRunningWorkoutHandler(runningService, db.DB)
	routes.RegisterRunningWorkoutRoutes(api, runningWorkoutHandler)

	// --- Import activity ---
	importActivityService := importactivityapp.NewService(runningService)
	importActivityHandler := handlers.NewImportActivityHandler(importActivityService)
	routes.RegisterRunningImportRoutes(api, importActivityHandler)

	// --- Garmin provider ---
	runningTokenStore := runninginfrastructure.NewTokenStore(db.DB)
	runningService.RegisterProvider(runninginfrastructure.NewGarminProvider(runningTokenStore))

	// --- Check-in ---
	checkinRepo := checkininfra.NewRepository(db.DB)
	checkinService := checkinapp.NewService(checkinRepo)
	checkinHandler := handlers.NewCheckinHandler(checkinService)
	routes.RegisterCheckinRoutes(api, checkinHandler)

	// --- Health ---
	healthRepo := healthinfrastructure.NewRepository(db.DB)
	healthService := healthapp.NewService(healthRepo)
	healthDataHandler := handlers.NewHealthDataHandler(healthService)
	routes.RegisterHealthRoutes(api, healthDataHandler)

	// --- Onboarding ---
	onboardingRepo := onboardinginfrastructure.NewRepository(db.DB)
	onboardingService := onboardingapp.NewService(onboardingRepo)
	onboardingHandler := handlers.NewOnboardingHandler(onboardingService)
	routes.RegisterOnboardingRoutes(api, onboardingHandler)

	// --- Invite routes ---
	inviteHandler := handlers.NewInviteHandler(inviteService, userService, cfg.ClerkSecretKey)
	routes.RegisterInviteRoutes(api, inviteHandler)

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
	allyPurchaseService := allypurchaseapp.NewService(inviteRepo, allyCatalogRepo, allyRepo, allyOpsRepo, commissionEntryRepo, log)
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

	// --- CRM Super Admin ---
	crmRepo := crminfrastructure.NewRepository(db.DB)
	crmSvc := crmapp.NewService(crmRepo)
	crmHandler := handlers.NewCRMHandler(crmSvc)
	routes.RegisterCRMRoutes(api, crmHandler)

	// --- Alert ---
	alertRepo := alertinfrastructure.NewRepository(db.DB)
	alertService := alertapp.NewService(alertRepo)
	alertHandler := handlers.NewAlertHandler(alertService)
	routes.RegisterAlertRoutes(api, alertHandler)

	// --- Blog ---
	blogRepo := bloginfrastructure.NewRepository(db.DB)
	blogService := blogapp.NewService(blogRepo)
	blogHandler := handlers.NewBlogHandler(blogService)
	routes.RegisterBlogRoutes(api, blogHandler)

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
	gamificationHandler := handlers.NewGamificationHandler(gamificationService, notifService)
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
	challengeHandler := handlers.NewChallengeHandler(challengeService, hub)
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

	// --- Payment ---
	wompiAvailSvc := wompiavailapp.NewService()
	wompiAvailHandler := handlers.NewWompiAvailabilityHandler(wompiAvailSvc)
	routes.RegisterWompiAvailabilityRoutes(api, wompiAvailHandler)

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

	// --- Athlete Scheduling ---
	schedulingHandler := handlers.NewAthleteSchedulingHandler(coachService)
	routes.RegisterAthleteSchedulingRoutes(api, schedulingHandler)

	// --- Admin ---
	var adminDB *sql.DB
	if db != nil {
		adminDB = db.DB
	}
	adminHandler := handlers.NewAdminHandler(adminDB, clerkIdentity)
	routes.RegisterAdminRoutes(api, adminHandler, cfg.PlatformSuperAdminClerkIDs)

	// --- Coach activation ---
	// Server-authoritative coach provisioning: the role is decided by the Go
	// API (the only holder of the Clerk secret key) and mirrored into Clerk's
	// PUBLIC metadata. Both endpoints act on the authenticated caller only.
	coachActivationHandler := handlers.NewCoachActivationHandler(userService)
	coachActivationHandler.RegisterCoachActivationRoutes(api)

	// --- Error Tracking ---
	errorRepo := errorinfrastructure.NewRepository(db.DB)
	discordSender := errorinfrastructure.NewDiscordSender(cfg.DiscordWebhookURL)
	errorSvc := errorapp.NewService(errorRepo, discordSender, cfg.PlatformSuperAdminClerkID)
	errorHandler := handlers.NewErrorHandler(errorSvc)
	routes.RegisterErrorRoutes(api, errorHandler)

	log.Info("error tracking routes registered", zap.String("path", "/api/v1/errors"))

	// --- Background jobs runner (challenge expiration, TRM prefetch, inactivity retention) ---
	jobRunner := jobs.NewRunner(challengeService, gamificationService, notifService, trmService, log)
	go jobRunner.Start(context.Background())
	log.Info("background jobs runner started")

	return subscriptionHandler, errorHandler
}
