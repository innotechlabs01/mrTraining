// Package routes provides route registration for the MR Training API.
package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// RegisterAthleteRoutes registers athlete-scoped routes on the given API group.
// Routes: GET /athletes/:id/workouts, /metrics, /messages.
// The calling code must have already applied auth middleware to the api group.
// Authorization (athlete self or managing coach) is enforced inside the handler.
func RegisterAthleteRoutes(api fiber.Router, handler *handlers.AthleteHandler) {
	athletes := api.Group("/athletes")
	athletes.Get("/:id/workouts", handler.GetWorkouts)
	athletes.Get("/:id/metrics", handler.GetMetrics)
	athletes.Get("/:id/messages", handler.GetMessages)
}

// RegisterUserRoutes registers all user-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterUserRoutes(api fiber.Router, handler *handlers.UserHandler) {
	// Current user profile
	api.Get("/users/me", handler.GetCurrentUser)
	api.Put("/users/me", handler.UpdateProfile)

	// Admin: get any user by ID
	api.Get("/users/:id", middleware.RequireAdmin(), handler.GetUserByID)

	// Coaches (list is public within auth)
	api.Get("/coaches", handler.ListCoaches)
	api.Get("/coaches/:id/athletes", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetAthletesByCoach)

	// Coach self-update (requires coach role)
	api.Put("/coaches/me", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateCoachProfile)

	// Athlete self-update (requires athlete role)
	api.Put("/athletes/me", middleware.RequireAthlete(), handler.UpdateAthleteProfile)
}

// RegisterEarningsRoutes registers coach earnings routes on the given API group.
func RegisterEarningsRoutes(api fiber.Router, handler *handlers.EarningsHandler) {
	api.Get("/coach/earnings-summary", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetEarningsSummary)
	api.Get("/coach/earnings-live", middleware.RequireCoach(), middleware.RequireCoachID(), handler.EarningsLive)
}

// RegisterTrainingAIRoutes registers the workout AI-insights endpoint
// (athlete-scoped; ownership is checked in the handler).
func RegisterTrainingAIRoutes(api fiber.Router, handler *handlers.TrainingAIHandler, statusReader middleware.MembershipStatusReader) {
	api.Get("/workouts/:id/ai-insights",
		middleware.RequireAthlete(),
		middleware.RequireActiveMembership(statusReader),
		handler.GetWorkoutInsights)
}

// RegisterTrainingRoutes registers all training-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterTrainingRoutes(api fiber.Router, handler *handlers.TrainingHandler, statusReader middleware.MembershipStatusReader) {
	// Exercises
	api.Get("/exercises", middleware.Cache(24*time.Hour, "exercises"), handler.ListExercises)
	api.Get("/exercises/:id", middleware.Cache(24*time.Hour, "exercises"), handler.GetExercise)
	api.Post("/exercises", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateExercise)
	api.Put("/exercises/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateExercise)
	api.Delete("/exercises/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteExercise)

	// Workout templates (coach only)
	api.Get("/workout-templates", middleware.RequireCoach(), middleware.RequireCoachID(), middleware.Cache(24*time.Hour, "workout-templates"), handler.ListWorkoutTemplates)
	api.Get("/workout-templates/:id", middleware.Cache(24*time.Hour, "workout-templates"), handler.GetWorkoutTemplate)
	api.Put("/workout-templates/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateWorkoutTemplate)
	api.Post("/workout-templates", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateWorkoutTemplate)

	// Workouts (assignment and tracking)
	api.Post("/workouts/assign", middleware.RequireCoach(), middleware.RequireCoachID(), handler.AssignWorkout)
	api.Get("/workouts", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetAssignedWorkouts)
	api.Get("/workouts/:id", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetAssignedWorkoutDetail)
	api.Get("/workouts/:id/detail", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetAssignedWorkoutDetail)
	api.Get("/workouts/:id/prescription", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetWorkoutPrescription)
	api.Post("/workouts/:id/session", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.CreateWorkoutSession)
	api.Post("/workouts/:id/sets", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.LogWorkoutSet)

	// Workout sessions (execution)
	api.Get("/workouts/sessions/:id", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetWorkoutSession)
	api.Post("/workouts/sessions/:id/complete", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.CompleteSession)
	api.Post("/workouts/:id/complete-running", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.CompleteRunningWorkout)
	api.Get("/workouts/:id/running-complete", handler.GetCompletedRunningWorkout)
	// Live running progress (Server-Sent Events). Coach or athlete may
	// subscribe; ownership is enforced inside the handler.
	api.Get("/workouts/:id/running-live", handler.RunningLive)
	// Mobile reports per-interval progress while the workout is in progress.
	api.Post("/workouts/:id/running-progress", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.ReportRunningProgress)

	// Progress
	api.Get("/progress", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetProgress)
	api.Get("/progress/summary", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetProgressSummary)

	// Training Sessions
	api.Get("/athletes/sessions", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetUpcomingSessions)
	api.Post("/training/sessions", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateTrainingSession)
}

// RegisterMembershipRoutes registers all membership-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterMembershipRoutes(api fiber.Router, handler *handlers.MembershipHandler, planHandler *handlers.PlanHandler, statusReader middleware.MembershipStatusReader) {
	// Athlete's membership
	api.Get("/memberships", handler.GetMembership)

	// Athlete's normalized membership state (backend-authoritative, never 404).
	// Used by Web/Mobile to drive checkout/access state instead of redirect success.
	api.Get("/athletes/membership/status", middleware.RequireAthlete(), handler.GetMembershipStatus)

	// Athlete's available plans for purchase (linked coach's plans)
	api.Get("/athletes/membership/plans", middleware.RequireAthlete(), planHandler.ListActivePlansForAthlete)

	// Create membership (requires coach role)
	api.Post("/memberships", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateMembership)

	// Cancel membership (requires coach role)
	api.Put("/memberships/:id/cancel", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CancelMembership)

	// Start a trial (athlete self-service, default 7 days)
	api.Post("/memberships/trial", middleware.RequireAthlete(), middleware.RateLimit(3, 3600), handler.StartTrial)

	// Renew membership (requires coach role)
	api.Put("/memberships/:id/renew", middleware.RequireCoach(), middleware.RequireCoachID(), handler.RenewMembership)

	// Payment history (authenticated user)
	api.Get("/memberships/:id/payments", handler.GetPaymentHistory)

	// Coach's all memberships
	api.Get("/coaches/memberships", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListMembershipsByCoach)
}

// RegisterAllyAthleteRoutes registers athlete-facing ally catalog routes.
// The calling code must have already applied auth middleware to the api group.
func RegisterAllyAthleteRoutes(api fiber.Router, handler *handlers.AllyCatalogAthleteHandler) {
	api.Get("/athlete/ally/products", middleware.RequireAthlete(), handler.ListProductsForAthlete)
	api.Get("/athlete/ally/services", middleware.RequireAthlete(), handler.ListServicesForAthlete)
}

// RegisterAllyPurchaseRoutes registers the ally product purchase route.
// The calling code must have already applied auth middleware to the api group.
func RegisterAllyPurchaseRoutes(api fiber.Router, handler *handlers.AllyPurchaseHandler) {
	api.Post("/athlete/ally/products/:id/purchase", middleware.RequireAthlete(), handler.CreateAllyPurchase)
}

// RegisterEventRoutes registers all event-related routes on the given API group.
func RegisterEventRoutes(api fiber.Router, handler *handlers.EventHandler) {
	// Events (coach)
	api.Get("/events", middleware.Cache(5*time.Minute, "events"), handler.ListEvents)
	api.Get("/events/:id", middleware.Cache(5*time.Minute, "events"), handler.GetEvent)
	api.Get("/events/:id/registrations", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListEventRegistrations)
	api.Get("/events/:id/form-responses", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListEventFormResponses)
	api.Post("/events", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateEvent)
	api.Put("/events/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateEvent)
	api.Delete("/events/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteEvent)

	// Event registration (athlete)
	api.Post("/events/:id/register", middleware.RequireAthlete(), handler.RegisterForEvent)
	api.Delete("/events/:id/register", middleware.RequireAthlete(), handler.CancelRegistration)

	// Athlete's registered events
	api.Get("/athletes/events", middleware.RequireAthlete(), handler.GetMyRegistrations)

	// Athlete event detail + respond (mobile)
	api.Get("/athletes/events/:id", middleware.RequireAthlete(), handler.GetAthleteEvent)
	api.Post("/athletes/events/:id/respond", middleware.RequireAthlete(), handler.RespondToEvent)
}

// RegisterProductRoutes registers all product-related routes on the given API group.
func RegisterProductRoutes(api fiber.Router, handler *handlers.ProductHandler) {
	// Products (coach)
	api.Get("/products", middleware.Cache(time.Hour, "products"), handler.ListProducts)
	api.Get("/products/:id", middleware.Cache(time.Hour, "products"), handler.GetProduct)
	api.Post("/products", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateProduct)
	api.Put("/products/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateProduct)
	api.Delete("/products/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteProduct)

	// Sales (coach)
	api.Get("/coaches/sales", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetSales)
	api.Post("/coaches/sales", middleware.RequireCoach(), middleware.RequireCoachID(), handler.RecordSale)
	api.Delete("/coaches/sales/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteSale)
}

// RegisterPublicProductRoutes registers unauthenticated public product routes.
// Lives outside /api/v1 so anonymous landing visitors can fetch shop products
// without a Clerk token.
func RegisterPublicProductRoutes(api fiber.Router, handler *handlers.ProductHandler) {
	api.Get("/products", handler.ListPublicProducts)
}

// RegisterNotificationRoutes registers all notification-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterNotificationRoutes(api fiber.Router, handler *handlers.NotificationHandler) {
	// Device registration
	api.Post("/devices", handler.RegisterDevice)
	api.Delete("/devices/:id", handler.RemoveDevice)
	api.Get("/devices", handler.ListDevices)

	// Notifications
	api.Get("/notifications", handler.ListNotifications)
	api.Patch("/notifications/:id/read", handler.MarkRead)
	api.Patch("/notifications/read-all", handler.MarkAllRead)
}

// RegisterRunningRoutes registers all running-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterRunningRoutes(api fiber.Router, handler *handlers.RunningHandler) {
	// Sessions
	// live-location: clients batch points every ~15s; 60/min leaves headroom
	// for retries without letting a rogue client flood the GPS table.
	api.Post("/running/sessions", middleware.RateLimit(30, 60), handler.LogSession)
	api.Get("/running/sessions", handler.ListSessions)
	api.Get("/running/sessions/:id", handler.GetSession)
	api.Patch("/running/sessions/:id", handler.UpdateSession)
	api.Delete("/running/sessions/:id", handler.DeleteSession)
	api.Post("/running/sessions/:id/live-location", middleware.RateLimit(60, 60), handler.LogGpsPoint)
	// Device syncs (Apple Watch / Health Connect) push batches; 20/min fits a
	// full-history backfill without letting a client flood the table.
	api.Post("/running/sessions/import", middleware.RateLimit(20, 60), handler.ImportDeviceSessions)
	api.Get("/running/stats", handler.GetStats)

	// Coach scoped — ver running de un atleta específico
	api.Get("/coach/athletes/:id/running/sessions", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CoachListSessionsByAthlete)
	api.Get("/coach/athletes/:id/running/stats", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CoachGetStatsByAthlete)
	api.Get("/coach/athletes/:id/running/weekly-trend", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CoachGetWeeklyTrendByAthlete)
	api.Get("/coach/athletes/:id/running/export", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CoachExportSessionsByAthlete)

	// Device connections
	api.Post("/running/devices", handler.ConnectDevice)
	api.Delete("/running/devices/:id", handler.DisconnectDevice)
	api.Post("/running/providers/garmin/sync", middleware.RateLimit(6, 60), handler.SyncGarmin)
}

// RegisterRunningWorkoutRoutes registers structured running workout routes
// (templates, assignments, guided sessions).
func RegisterRunningWorkoutRoutes(api fiber.Router, handler *handlers.RunningWorkoutHandler) {
	// Templates — coach-owned
	api.Post("/running/workouts/templates", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateTemplate)
	api.Get("/running/workouts/templates/:id", handler.GetTemplate)
	api.Get("/running/workouts/templates", handler.ListTemplatesByCoach)
	api.Delete("/running/workouts/templates/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteTemplate)

	// Assignments — coach assigns to athlete
	api.Post("/running/workouts/assignments", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateAssignment)
	api.Get("/running/workouts/assignments", middleware.RequireAthlete(), handler.ListMyAssignments)
	api.Get("/running/workouts/assignments/:id", handler.GetAssignment)
	api.Get("/coach/athletes/:id/running/assignments", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListAssignmentsByAthlete)
	api.Get("/coach/running/assignments", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListAssignmentsByCoach)
	api.Patch("/running/workouts/assignments/:id/status", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateAssignmentStatus)

	// Sessions — athlete executes
	api.Post("/running/workouts/sessions/start", middleware.RequireAthlete(), handler.StartSession)
	api.Post("/running/workouts/sessions/:id/complete", middleware.RequireAthlete(), handler.CompleteSession)
}

// RegisterCheckinRoutes registers morning readiness check-in routes.
func RegisterCheckinRoutes(api fiber.Router, handler *handlers.CheckinHandler) {
	api.Post("/athletes/checkin", middleware.RequireAthlete(), handler.SaveCheckin)
	api.Get("/athletes/checkin/today", middleware.RequireAthlete(), handler.GetToday)
	api.Get("/athletes/checkins", middleware.RequireAthlete(), handler.ListRecent)
}

// RegisterWebhookRoutes registers public provider webhooks (outside the auth
// middleware group; each handler validates its own signature).
func RegisterWebhookRoutes(app fiber.Router, garmin *handlers.GarminWebhookHandler) {
	app.Post("/webhooks/garmin", middleware.RateLimit(120, 60), garmin.Handle)
}

// RegisterClerkWebhookRoutes registers the public Clerk webhook endpoint
// outside the auth group (Clerk webhooks carry no bearer token). The handler
// validates its own svix signature when CLERK_WEBHOOK_SECRET is configured.
func RegisterClerkWebhookRoutes(app fiber.Router, clerk *handlers.ClerkWebhookHandler) {
	app.Post("/webhooks/clerk", middleware.RateLimit(120, 60), clerk.Handle)
}

// RegisterRunningImportRoutes registers activity-file import (GPX/TCX/FIT).
func RegisterRunningImportRoutes(api fiber.Router, handler *handlers.ImportActivityHandler) {
	api.Post("/running/import", middleware.RateLimit(10, 60), handler.ImportRunningActivity)
}

// RegisterHealthRoutes registers all health-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterHealthRoutes(api fiber.Router, handler *handlers.HealthDataHandler) {
	// Health metrics
	api.Get("/health/metrics", handler.GetMetrics)
	api.Post("/health/metrics", handler.RecordMetric)

	// Sleep logs
	api.Get("/health/sleep", handler.GetSleepLogs)
	api.Post("/health/sleep", handler.RecordSleepLog)

	// Wearable devices
	api.Get("/health/devices", handler.GetDevices)
	api.Post("/health/devices", handler.RegisterDevice)
	api.Delete("/health/devices/:id", handler.RemoveDevice)
}

// RegisterAnalyticsRoutes registers analytics routes.
func RegisterAnalyticsRoutes(api fiber.Router, handler *handlers.AnalyticsHandler) {
	api.Get("/coach/dashboard/summary", handler.GetDashboardSummary)
	api.Get("/coach/training/summary", handler.GetTrainingSummary)
	api.Get("/athlete/:athleteId/analytics/hr-zones", handler.GetHRZones)
	api.Get("/athlete/:athleteId/analytics/fatigue-map", handler.GetFatigueMap)
	api.Get("/athlete/:athleteId/analytics/one-rm", handler.GetOneRM)
	api.Get("/athlete/:athleteId/analytics/effort", handler.GetEffort)
}

// RegisterTodayRoutes registers Today dashboard routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterTodayRoutes(api fiber.Router, handler *handlers.TodayHandler, statusReader middleware.MembershipStatusReader) {
	api.Get("/athletes/today", middleware.RequireAthlete(), middleware.RequireActiveMembership(statusReader), handler.GetToday)
}

// RegisterOnboardingRoutes registers athlete onboarding routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterOnboardingRoutes(api fiber.Router, handler *handlers.OnboardingHandler) {
	api.Post("/athletes/onboard", middleware.RequireAthlete(), handler.SaveOnboarding)
	api.Get("/athletes/onboard", middleware.RequireAthlete(), handler.GetOnboarding)
}

// RegisterInviteRoutes registers coach invitation routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterInviteRoutes(api fiber.Router, handler *handlers.InviteHandler) {
	// Invite acceptance is rate-limited and protected against repeated failures.
	api.Post("/invites/accept", middleware.RateLimit(5, 60), middleware.FailedAttemptLockout(), handler.AcceptInvite)

	// Coach-issued invite: verify coach, check capacity, create Clerk invitation,
	// persist pending invite record. Requires coach role.
	api.Post("/coach/invite", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CoachInvite)
}

// RegisterPublicInviteRoutes registers public invite routes outside the auth
// group. Code validation is read-only and used by unauthenticated invite
// landing pages, so it does not require a Clerk token.
func RegisterPublicInviteRoutes(app fiber.Router, handler *handlers.InviteHandler) {
	app.Post("/invites/validate", middleware.RateLimit(20, 60), middleware.FailedAttemptLockout(), handler.ValidateInvite)
}

// RegisterFavoriteRoutes registers athlete favorite routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterFavoriteRoutes(api fiber.Router, handler *handlers.FavoriteHandler) {
	api.Get("/favorites", middleware.RequireAthlete(), handler.ListFavorites)
	api.Post("/favorites", middleware.RequireAthlete(), handler.CreateFavorite)
	api.Delete("/favorites/:id", middleware.RequireAthlete(), handler.DeleteFavorite)
}

// RegisterAlertRoutes registers alert routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterAlertRoutes(api fiber.Router, handler *handlers.AlertHandler) {
	api.Get("/alerts", middleware.RequireAthlete(), handler.ListAlerts)
}

// RegisterBlogRoutes registers blog/marketing routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterBlogRoutes(api fiber.Router, handler *handlers.BlogHandler) {
	// Athlete-facing (published articles only, newest-first)
	api.Get("/blog", middleware.RequireAthlete(), middleware.Cache(time.Hour, "blog"), handler.ListArticles)
	api.Get("/blog/:id", middleware.RequireAthlete(), middleware.Cache(time.Hour, "blog"), handler.GetArticle)

	// Coach CRUD
	api.Get("/coach/blog", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListCoachArticles)
	api.Post("/blog", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateArticle)
	api.Put("/blog/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateArticle)
	api.Delete("/blog/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteArticle)
}

// RegisterPublicBlogRoutes registers unauthenticated public blog routes.
// Lives outside /api/v1 so anonymous landing visitors can fetch published
// articles without a Clerk token.
func RegisterPublicBlogRoutes(api fiber.Router, handler *handlers.BlogHandler) {
	api.Get("/blog", middleware.Cache(time.Hour, "blog"), handler.ListArticles)
	api.Get("/blog/:slug", middleware.Cache(time.Hour, "blog"), handler.GetArticleBySlug)
}

// RegisterImportRoutes registers data import routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterImportRoutes(api fiber.Router, handler *handlers.ImportHandler) {
	api.Post("/import", middleware.RequireAthlete(), handler.ImportData)
}

// RegisterVideoViewRoutes registers video view tracking routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterVideoViewRoutes(api fiber.Router, handler *handlers.VideoViewHandler) {
	api.Post("/video-views", middleware.RequireAthlete(), handler.RecordVideoView)
}

// RegisterCommunityRoutes registers community routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterCommunityRoutes(api fiber.Router, handler *handlers.CommunityHandler) {
	api.Get("/athlete/community", middleware.RequireAthlete(), handler.GetCommunity)
	api.Get("/athlete/community/messages", middleware.RequireAthlete(), handler.ListMessages)
	api.Post("/athlete/community/messages", middleware.RequireAthlete(), handler.CreateMessage)
}

// RegisterMessageRoutes registers messaging routes on the given API group.
func RegisterMessageRoutes(api fiber.Router, handler *handlers.MessageHandler, clerkSecretKey string) {
	authMw := middleware.RequireAuth(clerkSecretKey)
	api.Get("/messages", authMw, handler.ListThreads)
	api.Get("/messages/:id", authMw, handler.GetThread)
	api.Post("/messages", authMw, handler.CreateThread)
	api.Post("/messages/:id/messages", authMw, handler.AddMessage)
	api.Patch("/messages/:id/read", authMw, handler.MarkRead)
}

// RegisterStoreRoutes registers athlete store routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterStoreRoutes(api fiber.Router, handler *handlers.StoreHandler) {
	api.Get("/athlete/store", middleware.RequireAthlete(), handler.ListStore)
	api.Post("/athlete/store/purchase", middleware.RequireAthlete(), handler.Purchase)
}

// RegisterAthleteSchedulingRoutes registers athlete-facing scheduling routes.
func RegisterAthleteSchedulingRoutes(api fiber.Router, handler *handlers.AthleteSchedulingHandler) {
	api.Get("/athlete/availability", middleware.RequireAthlete(), handler.GetAvailability)
	api.Post("/athlete/appointments", middleware.RequireAthlete(), handler.CreateAppointment)
}

// RegisterGamificationRoutes registers gamification-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterGamificationRoutes(api fiber.Router, handler *handlers.GamificationHandler) {
	// Streaks
	api.Get("/gamification/streak", middleware.RequireAthlete(), handler.GetStreak)
	api.Post("/gamification/streak/log", middleware.RequireAthlete(), handler.LogStreak)
	api.Get("/gamification/typical-workout-time", middleware.RequireAthlete(), handler.GetTypicalWorkoutTime)
	api.Get("/gamification/inactivity", middleware.RequireAthlete(), handler.GetInactivity)

	// Badges
	api.Get("/gamification/badges", middleware.RequireAthlete(), handler.ListBadges)
	api.Post("/gamification/badges/check", middleware.RequireAthlete(), handler.CheckBadges)

	// Personal Records
	api.Get("/gamification/prs", middleware.RequireAthlete(), handler.ListPRs)
	api.Post("/gamification/prs", middleware.RequireAthlete(), handler.RecordPR)
	api.Post("/gamification/prs/record", middleware.RequireAthlete(), handler.RecordPR)
}

// RegisterLeaderboardRoutes registers leaderboard-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterLeaderboardRoutes(api fiber.Router, handler *handlers.LeaderboardHandler) {
	leaderboard := api.Group("/leaderboard")
	leaderboard.Get("/group/:groupId", handler.GetGroupLeaderboard)
	leaderboard.Get("/weekly", handler.GetWeeklyLeaderboard)
	leaderboard.Get("/history", handler.GetUserHistory)
}

// RegisterVideoAnalyticsRoutes registers video analytics endpoints on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterVideoAnalyticsRoutes(api fiber.Router, handler *handlers.VideoAnalyticsHandler) {
	va := api.Group("/video-analytics")
	va.Post("/track", handler.TrackSession)
	va.Get("/summary", handler.GetSummary)
	va.Get("/per-exercise", handler.GetPerExercise)
	va.Get("/sessions", handler.GetSessions)
}

// RegisterCoachFeedRoutes registers coach feed endpoints on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterCoachFeedRoutes(api fiber.Router, handler *handlers.CoachFeedHandler) {
	feed := api.Group("/coach/feed")
	feed.Get("", handler.ListPosts)
	feed.Post("", handler.CreatePost)
	feed.Get("/:postId", handler.GetPost)
	feed.Delete("/:postId", handler.DeletePost)
	feed.Post("/:postId/react", handler.AddReaction)
	feed.Delete("/:postId/react", handler.RemoveReaction)
	feed.Post("/:postId/comment", handler.AddComment)
	feed.Get("/:postId/comments", handler.ListComments)
}

// RegisterFormMetricsRoutes registers form metrics endpoints on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterFormMetricsRoutes(api fiber.Router, handler *handlers.FormMetricsHandler) {
	fm := api.Group("/form-metrics")
	fm.Post("/sync", middleware.RequireAthlete(), handler.SyncMetrics)
	fm.Get("", middleware.RequireAthlete(), handler.GetByAthlete)
	fm.Get("/athlete/:id", handler.GetAthleteMetrics)
}

// RegisterFormRecordingRoutes registers form recording endpoints on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterFormRecordingRoutes(api fiber.Router, handler *handlers.FormRecordingHandler) {
	fr := api.Group("/form-recordings")
	fr.Post("/upload", middleware.RequireAthlete(), handler.UploadRecording)
}

// RegisterNotificationPreferencesRoutes registers notification preferences endpoints on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterNotificationPreferencesRoutes(api fiber.Router, handler *handlers.NotificationHandler) {
	api.Get("/athlete/notification-preferences", middleware.RequireAthlete(), handler.GetPreferences)
	api.Put("/athlete/notification-preferences", middleware.RequireAthlete(), handler.UpdatePreferences)
}

// RegisterRoutineRoutes registers routine endpoints on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterRoutineRoutes(api fiber.Router, handler *handlers.RoutineHandler) {
	api.Get("/athlete/routines", middleware.RequireAthlete(), handler.ListRoutines)
	api.Get("/athlete/routines/:id", middleware.RequireAthlete(), handler.GetRoutine)
	api.Post("/athlete/routines", middleware.RequireAthlete(), handler.CreateRoutine)
	api.Put("/athlete/routines/:id", middleware.RequireAthlete(), handler.UpdateRoutine)
	api.Delete("/athlete/routines/:id", middleware.RequireAthlete(), handler.DeleteRoutine)
}

// RegisterChallengeRoutes registers challenge endpoints on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterChallengeRoutes(api fiber.Router, handler *handlers.ChallengeHandler) {
	// --- Coach endpoints ---
	// Challenge CRUD
	api.Post("/challenges", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateChallenge)
	api.Get("/coach/challenges", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListCoachChallenges)
	api.Get("/coach/challenges/draft", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListDraftChallenges)
	api.Get("/coach/challenges/active", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListActiveChallengesByCoach)
	api.Get("/challenges/:id", handler.GetChallenge)
	api.Put("/challenges/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateChallenge)
	api.Delete("/challenges/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteChallenge)
	api.Post("/challenges/:id/activate", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ActivateChallenge)

	// Coach analytics
	api.Get("/challenges/:id/stats", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetChallengeStats)
	api.Get("/coach/athletes/:id/challenge-analytics", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetAthleteChallengeAnalytics)

	// --- Athlete endpoints ---
	api.Get("/athlete/challenges", middleware.RequireAthlete(), handler.ListAthleteChallenges)
	api.Get("/athlete/challenges/active", middleware.RequireAthlete(), handler.GetActiveChallenge)
	api.Get("/athlete/challenges/progress/:exerciseType", middleware.RequireAthlete(), handler.GetAthleteProgress)
	api.Post("/athlete/challenges/:id/join", middleware.RequireAthlete(), handler.JoinChallenge)
	api.Post("/athlete/challenges/:id/attempts", middleware.RequireAthlete(), handler.CreateAttempt)
	api.Post("/athlete/challenges/attempts/:id/submit", middleware.RequireAthlete(), handler.SubmitAttempt)
	api.Post("/athlete/challenges/attempts/:id/video", middleware.RequireAthlete(), handler.UploadAttemptVideo)
	api.Get("/athlete/challenges/:id/attempts", middleware.RequireAthlete(), handler.ListAthleteAttempts)

	// --- Leaderboard (shared) ---
	api.Get("/challenges/:id/leaderboard", handler.GetLeaderboard)

	// --- Legacy compatibility ---
	api.Get("/athlete/community/challenges/weekly", middleware.RequireAthlete(), handler.GetActiveChallenge)
	api.Get("/athlete/community/challenges", middleware.RequireAthlete(), handler.ListAthleteChallenges)
	api.Get("/athlete/community/challenges/:id", middleware.RequireAthlete(), handler.GetChallenge)
	api.Post("/athlete/community/challenges/:id/join", middleware.RequireAthlete(), handler.JoinChallenge)
}

// RegisterPublicEventRoutes registers unauthenticated public event routes.
// These live outside the Clerk-protected /api/v1 group so anonymous
// visitors with a share link can view a public event and RSVP.
func RegisterPublicEventRoutes(api fiber.Router, handler *handlers.EventHandler) {
	api.Get("/events/:id", handler.GetPublicEvent)
	api.Post("/events/:id/rsvp", handler.RsvpEventPublic)
}

// RegisterPlanRoutes registers plan-related routes on the given API group.
func RegisterPlanRoutes(api fiber.Router, handler *handlers.PlanHandler) {
	// Coach CRUD (own plans, all statuses)
	api.Get("/plans", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListPlans)
	api.Post("/plans", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreatePlan)
	api.Put("/plans/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdatePlan)
	api.Delete("/plans/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeletePlan)
}

// RegisterPublicPlanRoutes registers unauthenticated public plan routes.
// Lives OUTSIDE the /public group so anonymous landing visitors can fetch
// published plans and the current TRM without a Clerk token (/api/v1/* is
// behind a group-wide Clerk middleware in main.go).
func RegisterPublicPlanRoutes(pub fiber.Router, handler *handlers.PlanHandler) {
	pub.Get("/coaches/:coachId/plans", handler.ListPublicPlans)
	pub.Get("/plans", handler.ListAllPublicPlans)
	pub.Get("/trm", handler.GetTRM)
}

// RegisterPublicCoachLandingRoutes registers unauthenticated public coach
// landing routes. Lives outside /api/v1 so anonymous visitors can fetch a
// coach's public profile and plans without a Clerk token.
func RegisterPublicCoachLandingRoutes(api fiber.Router, handler *handlers.CoachLandingHandler) {
	api.Get("/coach/:slug", handler.GetCoachLanding)
	api.Get("/coach/:slug/plans", handler.GetCoachPlans)
}

// RegisterSupportRoutes registers support ticket routes on the given API group.
func RegisterSupportRoutes(api fiber.Router, handler *handlers.SupportHandler) {
	// Coach endpoints
	api.Get("/tickets", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListTickets)
	api.Post("/tickets", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateTicket)
	api.Get("/tickets/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetTicket)
	api.Put("/tickets/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateTicket)
	api.Delete("/tickets/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.DeleteTicket)

	// Athlete endpoints
	api.Get("/athlete/tickets", middleware.RequireAthlete(), handler.ListAthleteTickets)
	api.Post("/athlete/tickets", middleware.RequireAthlete(), handler.CreateAthleteTicket)
	api.Get("/athlete/tickets/:id", middleware.RequireAthlete(), handler.GetAthleteTicket)

	// Messages (coach, athlete, support)
	api.Get("/tickets/:ticketId/messages", middleware.RequireAuth(""), handler.ListMessages)
	api.Post("/tickets/:ticketId/messages", middleware.RequireAuth(""), handler.AddMessage)
	api.Post("/tickets/:ticketId/read", middleware.RequireAuth(""), handler.MarkRead)
	api.Get("/tickets/:ticketId/unread", middleware.RequireAuth(""), handler.GetUnreadCount)
}

// RegisterAllyRoutes registers the Alianzas (ally network) routes on the given
// API group. The calling code must have already applied auth middleware.
// Phase B scope: ally CRUD (coach side + ally self view), commission-agreement
// creation and the admin financial-audit listing.
func RegisterAllyRoutes(api fiber.Router, handler *handlers.AllyHandler) {
	// Coach side: register and view allies for your own relationships.
	api.Post("/coach/allies", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateAlly)
	api.Get("/coach/allies", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListCoachAllies)
	api.Get("/coach/allies/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetCoachAlly)

	// Coach side: create a new commission-agreement version for one of your allies.
	api.Put("/coach/allies/:id/commission-agreement", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateCommissionAgreement)

	// Ally side: view your own allies (owned or member).
	api.Get("/ally/me", middleware.RequireAlly(), handler.GetMyAlly)

	// Admin: append-only financial audit trail (read-only).
	api.Get("/admin/financial-audit", middleware.RequireAdmin(), handler.ListFinancialAudit)
}

// RegisterAllyCatalogRoutes registers the ally catalog routes (products and
// services) on the given API group. All routes require the ally role and are
// scoped to the ally the authenticated user owns or belongs to (ownership is
// resolved server-side; the client never supplies a trusted ally_id).
func RegisterAllyCatalogRoutes(api fiber.Router, handler *handlers.AllyCatalogHandler) {
	api.Get("/ally/products", middleware.RequireAlly(), handler.ListProducts)
	api.Post("/ally/products", middleware.RequireAlly(), handler.CreateProduct)
	api.Put("/ally/products/:id", middleware.RequireAlly(), handler.UpdateProduct)
	api.Get("/ally/services", middleware.RequireAlly(), handler.ListServices)
	api.Post("/ally/services", middleware.RequireAlly(), handler.CreateService)
	api.Put("/ally/services/:id", middleware.RequireAlly(), handler.UpdateService)
}

// RegisterAllyOperationsRoutes registers ally operations routes (orders,
// reservations, redemptions) on the given API group.
func RegisterAllyOperationsRoutes(api fiber.Router, handler *handlers.AllyOperationsHandler) {
	// Athlete: create orders and reservations
	api.Post("/athlete/orders", middleware.RequireAthlete(), handler.CreateOrder)
	api.Post("/athlete/reservations", middleware.RequireAthlete(), handler.CreateReservation)
	api.Get("/athlete/operations/:id", middleware.RequireAthlete(), handler.GetOperation)

	// Ally: view operations and manage redemptions
	api.Get("/ally/operations", middleware.RequireAlly(), handler.ListAllyOperations)
	api.Post("/ally/operations/:id/items", middleware.RequireAlly(), handler.AddOperationItem)
	api.Get("/ally/operations/:id/items", middleware.RequireAlly(), handler.ListOperationItems)
	api.Post("/ally/redemptions", middleware.RequireAlly(), handler.CreateRedemption)
	api.Post("/ally/redemptions/:token/redeem", middleware.RequireAlly(), handler.RedeemRedemption)
}

// RegisterAllyPaymentDeclarationRoutes registers payment declaration routes
// on the given API group.
func RegisterAllyPaymentDeclarationRoutes(api fiber.Router, handler *handlers.AllyPaymentDeclarationHandler) {
	api.Post("/ally/payment-declarations", middleware.RequireAlly(), handler.CreateDeclaration)
	api.Get("/ally/payment-declarations", middleware.RequireAlly(), handler.ListDeclarations)
	api.Get("/ally/payment-declarations/:id", middleware.RequireAlly(), handler.GetDeclaration)
	api.Put("/ally/payment-declarations/:id/review", middleware.RequireAlly(), handler.ReviewDeclaration)
	api.Post("/ally/payment-declarations/:id/reverse", middleware.RequireAlly(), handler.ReverseDeclaration)
}

// RegisterPolicyRoutes registers commercial policy engine routes on the given
// API group. Endpoints: POST /policies/commission, GET /commissions.
func RegisterPolicyRoutes(api fiber.Router, handler *handlers.CommissionPolicyHandler) {
	api.Post("/policies/commission", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ConfigureCommission)
	api.Get("/commissions", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListCommissions)
}

// RegisterCommissionEntryRoutes registers commission entry routes on the
// given API group.
func RegisterCommissionEntryRoutes(api fiber.Router, handler *handlers.CommissionEntryHandler) {
	api.Post("/coach/commission-entries", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateCommissionEntry)
	api.Get("/coach/commission-entries", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListCommissionEntries)
	api.Get("/coach/commission-entries/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetCommissionEntry)
	api.Post("/coach/commission-entries/:id/reverse", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ReverseCommissionEntry)
	api.Post("/coach/commission-entries/:id/adjustments", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateFinancialAdjustment)
	api.Get("/coach/commission-entries/:id/adjustments", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListFinancialAdjustments)
}

// RegisterSettlementRoutes registers settlement routes on the given API group.
func RegisterSettlementRoutes(api fiber.Router, handler *handlers.CoachSettlementHandler) {
	api.Post("/coach/settlements", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateSettlement)
	api.Get("/coach/settlements", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListSettlements)
	api.Get("/coach/settlements/:id", middleware.RequireCoach(), middleware.RequireCoachID(), handler.GetSettlement)
	api.Put("/coach/settlements/:id/status", middleware.RequireCoach(), middleware.RequireCoachID(), handler.UpdateSettlementStatus)
	api.Post("/coach/settlements/:id/void", middleware.RequireCoach(), middleware.RequireCoachID(), handler.VoidSettlement)
	api.Get("/coach/settlements/:id/items", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListSettlementItems)
}

// RegisterSettlementDocumentRoutes registers settlement document routes.
func RegisterSettlementDocumentRoutes(api fiber.Router, handler *handlers.CoachSettlementDocumentHandler) {
	api.Post("/coach/settlements/:id/documents", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateDocument)
	api.Get("/coach/settlements/:id/documents", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListDocuments)
}

// RegisterCoachPaymentRecordRoutes registers coach payment record routes.
func RegisterCoachPaymentRecordRoutes(api fiber.Router, handler *handlers.CoachPaymentRecordHandler) {
	api.Post("/coach/payment-records", middleware.RequireCoach(), middleware.RequireCoachID(), handler.CreateRecord)
	api.Post("/coach/payment-records/:id/confirm", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ConfirmRecord)
	api.Get("/coach/payment-records", middleware.RequireCoach(), middleware.RequireCoachID(), handler.ListRecords)
}

// RegisterSubscriptionRoutes registers subscription endpoints (subscribe, cancel,
// list, my subscription) on the auth-protected api group.
func RegisterSubscriptionRoutes(api fiber.Router, handler *handlers.SubscriptionHandler) {
	handler.RegisterSubscriptionRoutes(api)
}

// RegisterMercadoPagoWebhookRoutes registers the public MercadoPago webhook
// outside the auth group (MP notifications carry no Clerk token).
func RegisterMercadoPagoWebhookRoutes(app fiber.Router, handler *handlers.SubscriptionHandler) {
	handler.RegisterMercadoPagoWebhook(app)
}

// RegisterWompiWebhookRoutes registers the public Wompi webhook outside the
// auth group.
func RegisterWompiWebhookRoutes(app fiber.Router, handler *handlers.SubscriptionHandler) {
	handler.RegisterWompiWebhook(app)
}

// RegisterCoachPlatformSubscriptionRoutes registers coach platform subscription endpoints.
// Route: POST /coach/subscription/checkout
func RegisterCoachPlatformSubscriptionRoutes(api fiber.Router, handler *handlers.SubscriptionHandler) {
	handler.RegisterCoachPlatformSubscriptionRoutes(api)
}

// RegisterCoachAthleteRoutes registers coach-scoped athlete CRUD routes.
// Routes: GET/PUT/DELETE /coach/athletes/:id
func RegisterCoachAthleteRoutes(api fiber.Router, handler *handlers.CoachHandler) {
	athletes := api.Group("/coach/athletes")
	athletes.Get("/:id", handler.GetAthleteById)
	athletes.Put("/:id", handler.SaveAthlete)
	athletes.Delete("/:id", handler.DeleteAthlete)
}

// RegisterCoachFormMetricsRoutes registers coach form-metrics aggregate route.
// Route: GET /coach/form-metrics
func RegisterCoachFormMetricsRoutes(api fiber.Router, handler *handlers.FormMetricsHandler) {
	api.Get("/coach/form-metrics", handler.GetCoachFormMetrics)
}

// RegisterWompiAvailabilityRoutes registers the Wompi availability gate endpoint.
func RegisterWompiAvailabilityRoutes(api fiber.Router, handler *handlers.WompiAvailabilityHandler) {
	api.Get("/payments/availability", handler.Handle)
}

// RegisterAdminRoutes registers read-only platform administration routes.
// The supplied allowlist (optional) is passed to RequirePlatformSuperAdmin and
// may be a string, []string, or variadic list of IDs.
func RegisterAdminRoutes(api fiber.Router, handler *handlers.AdminHandler, allowed ...interface{}) {
	admin := api.Group("/admin")
	admin.Use(middleware.RequirePlatformSuperAdmin(allowed...))
	admin.Get("/dashboard", handler.GetDashboard)
	admin.Get("/coaches", handler.ListCoaches)
	admin.Get("/coaches/:id", handler.GetCoach)
	admin.Post("/coaches/:id/skip-subscription", handler.ToggleSkipSubscription)
	admin.Get("/services/health", handler.GetServicesHealth)
	// Planes y configuración de plataforma (super admin).
	admin.Get("/plans", handler.ListAdminPlans)
	admin.Post("/plans", handler.CreateAdminPlan)
	admin.Put("/plans/:id", handler.UpdateAdminPlan)
	admin.Delete("/plans/:id", handler.DeleteAdminPlan)
	admin.Get("/settings", handler.GetSettings)
	admin.Put("/settings", handler.PutSettings)
}

// RegisterErrorRoutes registers error tracking routes on the auth-protected API group.
// Super admin only: create, list, get, resolve errors, and stats.
func RegisterErrorRoutes(api fiber.Router, handler *handlers.ErrorHandler) {
	handler.RegisterErrorRoutes(api)
}

// RegisterErrorWebhookRoutes registers public error webhook routes outside auth.
// Used by web/mobile/cron to report errors without Clerk token.
func RegisterErrorWebhookRoutes(app fiber.Router, handler *handlers.ErrorHandler) {
	app.Post("/webhooks/errors", handler.CreateError)
}

// RegisterCRMRoutes registers super admin CRM routes on the auth-protected API group.
// Routes: GET /admin/coaches, /admin/coaches/expiring, /admin/coaches/expired,
//         /admin/revenue, /admin/coaches/:id/payments.
func RegisterCRMRoutes(api fiber.Router, handler *handlers.CRMHandler) {
	handler.RegisterRoutes(api)
}

// RegisterCoachLandingRoutes registers coach landing page routes (auth-protected).
// Routes: POST /coach/landing, GET /coach/landing, PUT/DELETE /coach/landing/:id, PUT /coach/landing/:id/publish.
func RegisterCoachLandingRoutes(api fiber.Router, handler *handlers.CoachLandingHandler) {
	handler.RegisterRoutes(api)
}

// RegisterPublicLandingRoute registers the public landing page route by slug (no auth).
func RegisterPublicLandingRoute(app fiber.Router, handler *handlers.CoachLandingHandler) {
	app.Get("/l/:slug", handler.GetBySlug)
}

// RegisterTestimonialRoutes registers testimonial routes on the auth-protected API group.
// Routes: POST /testimonials, GET /testimonials/:coachID, PUT/DELETE /testimonials/:id.
func RegisterTestimonialRoutes(api fiber.Router, handler *handlers.TestimonialHandler) {
	handler.RegisterRoutes(api)
}

// RegisterPublicTestimonialRoutes registers public testimonial routes (no auth).
// Lives OUTSIDE the /api/v1/* prefix — that group carries a group-wide Clerk
// middleware, so public read paths must live under /public instead.
// Used by public landing pages to fetch testimonials for a coach.
func RegisterPublicTestimonialRoutes(pub fiber.Router, handler *handlers.TestimonialHandler) {
	handler.RegisterPublicTestimonialRoutes(pub)
}
