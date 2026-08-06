package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/mrtraining/backend/internal/api/handlers"
)

type Router struct {
	workoutHandler *handlers.WorkoutHandler
	athleteHandler *handlers.AthleteHandler
	coachHandler   *handlers.CoachHandler
}

func New(workoutHandler *handlers.WorkoutHandler, athleteHandler *handlers.AthleteHandler, coachHandler *handlers.CoachHandler) *Router {
	return &Router{
		workoutHandler: workoutHandler,
		athleteHandler: athleteHandler,
		coachHandler:   coachHandler,
	}
}

func (r *Router) Register(app *fiber.App, authMiddleware fiber.Handler) {
	api := app.Group("/api")
	v1 := api.Group("/v1")

	auth := v1.Use(authMiddleware)

	// Profile routes
	auth.Get("/athlete/profile", r.athleteHandler.GetProfile)
	auth.Put("/athlete/profile", r.athleteHandler.UpdateProfile)
	auth.Get("/coach/profile", r.coachHandler.GetProfile)
	auth.Put("/coach/profile", r.coachHandler.UpdateProfile)

	// Coach-athlete routes
	auth.Post("/coach/athletes/assign", r.coachHandler.AssignAthlete)
	auth.Get("/coach/athletes", r.coachHandler.ListAthletes)

	// Workout routes
	workouts := auth.Group("/workouts")
	{
		workouts.Post("/", r.workoutHandler.CreateWorkout)
		workouts.Get("/:id", r.workoutHandler.GetWorkout)
		workouts.Post("/:id/complete", r.workoutHandler.CompleteWorkout)
		workouts.Get("/pending-reviews", r.workoutHandler.ListPendingReviews)
	}

	// Athlete workout routes
	athletes := auth.Group("/athletes")
	{
		athletes.Get("/:athleteId/workouts", r.workoutHandler.ListAthleteWorkouts)
		athletes.Get("/:athleteId/today", r.workoutHandler.GetTodayWorkout)
	}
}
