// Package routes provides route registration for the MR Training API.
package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/handlers"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

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
	api.Get("/coaches/:id/athletes", handler.GetAthletesByCoach)

	// Coach self-update (requires coach role)
	api.Put("/coaches/me", middleware.RequireCoach(), handler.UpdateCoachProfile)

	// Athlete self-update (requires athlete role)
	api.Put("/athletes/me", middleware.RequireAthlete(), handler.UpdateAthleteProfile)
}

// RegisterTrainingRoutes registers all training-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterTrainingRoutes(api fiber.Router, handler *handlers.TrainingHandler) {
	// Exercises
	api.Get("/exercises", middleware.Cache(24*time.Hour, "exercises"), handler.ListExercises)
	api.Get("/exercises/:id", middleware.Cache(24*time.Hour, "exercises"), handler.GetExercise)
	api.Post("/exercises", middleware.RequireCoach(), handler.CreateExercise)

	// Workout templates (coach only)
	api.Get("/workout-templates", middleware.RequireCoach(), middleware.Cache(24*time.Hour, "workout-templates"), handler.ListWorkoutTemplates)
	api.Get("/workout-templates/:id", middleware.Cache(24*time.Hour, "workout-templates"), handler.GetWorkoutTemplate)
	api.Put("/workout-templates/:id", middleware.RequireCoach(), handler.UpdateWorkoutTemplate)
	api.Post("/workout-templates", middleware.RequireCoach(), handler.CreateWorkoutTemplate)

	// Workouts (assignment and tracking)
	api.Post("/workouts/assign", middleware.RequireCoach(), handler.AssignWorkout)
	api.Get("/workouts", middleware.RequireAthlete(), handler.GetAssignedWorkouts)
	api.Get("/workouts/:id", middleware.RequireAthlete(), handler.GetAssignedWorkoutDetail)
	api.Get("/workouts/:id/detail", middleware.RequireAthlete(), handler.GetAssignedWorkoutDetail)
	api.Get("/workouts/:id/prescription", middleware.RequireAthlete(), handler.GetWorkoutPrescription)
	api.Post("/workouts/:id/session", middleware.RequireAthlete(), handler.CreateWorkoutSession)
	api.Post("/workouts/:id/sets", middleware.RequireAthlete(), handler.LogWorkoutSet)

	// Workout sessions (execution)
	api.Get("/workouts/sessions/:id", middleware.RequireAthlete(), handler.GetWorkoutSession)
	api.Post("/workouts/sessions/:id/complete", middleware.RequireAthlete(), handler.CompleteSession)

	// Progress
	api.Get("/progress", middleware.RequireAthlete(), handler.GetProgress)
	api.Get("/progress/summary", middleware.RequireAthlete(), handler.GetProgressSummary)

	// Training Sessions
	api.Get("/training/sessions", handler.ListTrainingSessions)
	api.Post("/training/sessions", middleware.RequireCoach(), handler.CreateTrainingSession)
}

// RegisterMembershipRoutes registers all membership-related routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterMembershipRoutes(api fiber.Router, handler *handlers.MembershipHandler) {
	// Athlete's membership
	api.Get("/memberships", handler.GetMembership)

	// Create membership (requires coach role)
	api.Post("/memberships", middleware.RequireCoach(), handler.CreateMembership)

	// Cancel membership (requires coach role)
	api.Put("/memberships/:id/cancel", middleware.RequireCoach(), handler.CancelMembership)

	// Renew membership (requires coach role)
	api.Put("/memberships/:id/renew", middleware.RequireCoach(), handler.RenewMembership)

	// Payment history (authenticated user)
	api.Get("/memberships/:id/payments", handler.GetPaymentHistory)

	// Coach's all memberships
	api.Get("/coaches/memberships", middleware.RequireCoach(), handler.ListMembershipsByCoach)
}

// RegisterEventRoutes registers all event-related routes on the given API group.
func RegisterEventRoutes(api fiber.Router, handler *handlers.EventHandler) {
	// Events (coach)
	api.Get("/events", middleware.Cache(5*time.Minute, "events"), handler.ListEvents)
	api.Get("/events/:id", middleware.Cache(5*time.Minute, "events"), handler.GetEvent)
	api.Post("/events", middleware.RequireCoach(), handler.CreateEvent)
	api.Put("/events/:id", middleware.RequireCoach(), handler.UpdateEvent)
	api.Delete("/events/:id", middleware.RequireCoach(), handler.DeleteEvent)

	// Event registration (athlete)
	api.Post("/events/:id/register", middleware.RequireAthlete(), handler.RegisterForEvent)
	api.Delete("/events/:id/register", middleware.RequireAthlete(), handler.CancelRegistration)

	// Athlete's registered events
	api.Get("/athletes/events", middleware.RequireAthlete(), handler.GetMyRegistrations)
}

// RegisterProductRoutes registers all product-related routes on the given API group.
func RegisterProductRoutes(api fiber.Router, handler *handlers.ProductHandler) {
	// Products (coach)
	api.Get("/products", middleware.Cache(time.Hour, "products"), handler.ListProducts)
	api.Get("/products/:id", middleware.Cache(time.Hour, "products"), handler.GetProduct)
	api.Post("/products", middleware.RequireCoach(), handler.CreateProduct)
	api.Put("/products/:id", middleware.RequireCoach(), handler.UpdateProduct)
	api.Delete("/products/:id", middleware.RequireCoach(), handler.DeleteProduct)

	// Sales (coach)
	api.Get("/coaches/sales", middleware.RequireCoach(), handler.GetSales)
	api.Post("/coaches/sales", middleware.RequireCoach(), handler.RecordSale)
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
	api.Post("/running/sessions", handler.LogSession)
	api.Get("/running/sessions", handler.ListSessions)
	api.Get("/running/stats", handler.GetStats)

	// Device connections
	api.Post("/running/devices", handler.ConnectDevice)
	api.Delete("/running/devices/:id", handler.DisconnectDevice)
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
func RegisterTodayRoutes(api fiber.Router, handler *handlers.TodayHandler) {
	api.Get("/athletes/today", middleware.RequireAthlete(), handler.GetToday)
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
	api.Post("/invites/accept", handler.AcceptInvite)
	api.Post("/invites/validate", handler.ValidateInvite)
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
	api.Get("/coach/blog", middleware.RequireCoach(), handler.ListCoachArticles)
	api.Post("/blog", middleware.RequireCoach(), handler.CreateArticle)
	api.Put("/blog/:id", middleware.RequireCoach(), handler.UpdateArticle)
	api.Delete("/blog/:id", middleware.RequireCoach(), handler.DeleteArticle)
}

// RegisterPolarRoutes registers Polar payment routes on the given API group.
// The calling code must have already applied auth middleware to the api group.
func RegisterPolarRoutes(api fiber.Router, handler *handlers.PolarHandler) {
	api.Post("/polar/checkout", middleware.RequireAthlete(), handler.CreateCheckout)
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

	// Badges
	api.Get("/gamification/badges", middleware.RequireAthlete(), handler.ListBadges)
	api.Post("/gamification/badges/check", middleware.RequireAthlete(), handler.CheckBadges)

	// Personal Records
	api.Get("/gamification/prs", middleware.RequireAthlete(), handler.ListPRs)
	api.Post("/gamification/prs", middleware.RequireAthlete(), handler.RecordPR)
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
	api.Post("/challenges", middleware.RequireCoach(), handler.CreateChallenge)
	api.Get("/coach/challenges", middleware.RequireCoach(), handler.ListCoachChallenges)
	api.Get("/coach/challenges/draft", middleware.RequireCoach(), handler.ListDraftChallenges)
	api.Get("/coach/challenges/active", middleware.RequireCoach(), handler.ListActiveChallengesByCoach)
	api.Get("/challenges/:id", handler.GetChallenge)
	api.Put("/challenges/:id", middleware.RequireCoach(), handler.UpdateChallenge)
	api.Delete("/challenges/:id", middleware.RequireCoach(), handler.DeleteChallenge)
	api.Post("/challenges/:id/activate", middleware.RequireCoach(), handler.ActivateChallenge)

	// Coach analytics
	api.Get("/challenges/:id/stats", middleware.RequireCoach(), handler.GetChallengeStats)
	api.Get("/coach/athletes/:id/challenge-analytics", middleware.RequireCoach(), handler.GetAthleteChallengeAnalytics)

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
