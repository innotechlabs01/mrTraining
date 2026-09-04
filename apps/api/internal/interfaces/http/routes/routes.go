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
	api.Get("/blog", middleware.RequireAthlete(), middleware.Cache(time.Hour, "blog"), handler.ListArticles)
	api.Get("/blog/:id", middleware.RequireAthlete(), middleware.Cache(time.Hour, "blog"), handler.GetArticle)
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
