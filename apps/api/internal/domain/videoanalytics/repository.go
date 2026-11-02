package videoanalytics

import "context"

// Repository defines the video analytics persistence interface.
type Repository interface {
	CreateSession(ctx context.Context, session *SessionAnalysis) error
	GetSession(ctx context.Context, sessionID string) (*SessionAnalysis, error)
	ListSessionsByAthlete(ctx context.Context, athleteID string, limit int, offset int) ([]*SessionAnalysis, error)
	ListSessionsByExercise(ctx context.Context, athleteID string, exerciseID string, limit int) ([]*SessionAnalysis, error)
	GetSummary(ctx context.Context, athleteID string) (*AnalyticsSummary, error)
	GetPerExercise(ctx context.Context, athleteID string) ([]*ExerciseAnalytics, error)
}
