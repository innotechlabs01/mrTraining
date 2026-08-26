// Package routes provides route registration for the MR Training API.
package routes

import (
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
	api.Get("/exercises", handler.ListExercises)
	api.Get("/exercises/:id", handler.GetExercise)
	api.Post("/exercises", middleware.RequireCoach(), handler.CreateExercise)

	// Workout templates (coach only)
	api.Get("/workout-templates", middleware.RequireCoach(), handler.ListWorkoutTemplates)
	api.Get("/workout-templates/:id", handler.GetWorkoutTemplate)
	api.Post("/workout-templates", middleware.RequireCoach(), handler.CreateWorkoutTemplate)

	// Workouts (assignment and tracking)
	api.Post("/workouts/assign", middleware.RequireCoach(), handler.AssignWorkout)
	api.Get("/workouts", middleware.RequireAthlete(), handler.GetAssignedWorkouts)
	api.Post("/workouts/:id/sets", middleware.RequireAthlete(), handler.LogWorkoutSet)

	// Progress
	api.Get("/progress", middleware.RequireAthlete(), handler.GetProgress)
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
	api.Get("/events", handler.ListEvents)
	api.Get("/events/:id", handler.GetEvent)
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
	api.Get("/products", handler.ListProducts)
	api.Get("/products/:id", handler.GetProduct)
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
