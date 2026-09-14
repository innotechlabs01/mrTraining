package challenge

import (
	"errors"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/challenge"
)

// Service implements challenge business operations.
type Service struct {
	repo domain.Repository
}

// NewService creates a new challenge service.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

// --- Challenge CRUD ---

// GetChallenge returns a challenge by ID.
func (s *Service) GetChallenge(id string) (*domain.Challenge, error) {
	return s.repo.GetByID(id)
}

// ListByCoach returns all challenges created by a coach.
func (s *Service) ListByCoach(coachID string) ([]*domain.Challenge, error) {
	return s.repo.ListByCoach(coachID)
}

// ListActiveByCoach returns active challenges by coach.
func (s *Service) ListActiveByCoach(coachID string) ([]*domain.Challenge, error) {
	return s.repo.ListActiveByCoach(coachID)
}

// ListDraftByCoach returns draft challenges by coach.
func (s *Service) ListDraftByCoach(coachID string) ([]*domain.Challenge, error) {
	return s.repo.ListDraftByCoach(coachID)
}

// ListActiveForAthlete returns active challenges for an athlete (from their coach).
func (s *Service) ListActiveForAthlete(athleteID string) ([]*domain.Challenge, error) {
	return s.repo.ListActiveForAthlete(athleteID)
}

// GetActiveForAthlete returns the current active challenge for an athlete.
func (s *Service) GetActiveForAthlete(athleteID string) (*domain.Challenge, error) {
	return s.repo.GetActiveForAthlete(athleteID)
}

// CreateChallenge creates a new video challenge in draft status.
func (s *Service) CreateChallenge(ch *domain.Challenge) error {
	if ch.Title == "" {
		return errors.New("title is required")
	}
	if ch.ExerciseType == "" {
		return errors.New("exercise_type is required")
	}
	if ch.EndDate == "" {
		return errors.New("end_date is required")
	}
	end, err := parseEndDate(ch.EndDate)
	if err != nil {
		return errors.New("end_date debe tener formato YYYY-MM-DD")
	}
	if end.Before(time.Now().UTC().Truncate(24 * time.Hour)) {
		return errors.New("end_date debe ser hoy o una fecha futura")
	}
	ch.EndDate = end.Format("2006-01-02")
	ch.ExpiresAt = end.Format("2006-01-02") + "T23:59:59Z"
	return s.repo.Create(ch)
}

// UpdateChallenge updates an existing challenge.
func (s *Service) UpdateChallenge(ch *domain.Challenge) error {
	canEdit, reason, err := s.CanEditChallenge(ch.ID)
	if err != nil {
		return err
	}
	if !canEdit {
		return errors.New(reason)
	}
	return s.repo.Update(ch)
}

// DeleteChallenge deletes a challenge.
func (s *Service) DeleteChallenge(id string) error {
	canDelete, reason, err := s.CanDeleteChallenge(id)
	if err != nil {
		return err
	}
	if !canDelete {
		return errors.New(reason)
	}
	return s.repo.Delete(id)
}

// ActivateChallenge changes status from draft to active.
func (s *Service) ActivateChallenge(id string) error {
	ch, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	if ch.Status != "draft" {
		return errors.New("only drafts can be activated")
	}
	ch.Status = "active"
	if ch.StartDate == "" {
		ch.StartDate = time.Now().UTC().Format("2006-01-02")
	}
	return s.repo.Update(ch)
}

// CanEditChallenge checks if a challenge can be edited.
func (s *Service) CanEditChallenge(challengeID string) (bool, string, error) {
	ch, err := s.repo.GetByID(challengeID)
	if err != nil {
		return false, "", err
	}
	if ch.Status != "draft" {
		return false, "solo los borradores se pueden editar", nil
	}
	hasAttempts, err := s.repo.HasAttempts(challengeID)
	if err != nil {
		return false, "", err
	}
	if hasAttempts {
		return false, "no se puede editar: tiene intentos registrados", nil
	}
	return true, "", nil
}

// CanDeleteChallenge checks if a challenge can be deleted.
func (s *Service) CanDeleteChallenge(challengeID string) (bool, string, error) {
	ch, err := s.repo.GetByID(challengeID)
	if err != nil {
		return false, "", err
	}
	if ch.Status != "draft" {
		return false, "solo los borradores se pueden eliminar", nil
	}
	hasAttempts, err := s.repo.HasAttempts(challengeID)
	if err != nil {
		return false, "", err
	}
	if hasAttempts {
		return false, "no se puede eliminar: tiene intentos registrados", nil
	}
	return true, "", nil
}

// --- Attempts ---

// JoinChallenge creates a new participation attempt for an athlete.
func (s *Service) JoinChallenge(challengeID, athleteID string, videoConsent, photoConsent bool) (*domain.ChallengeAttempt, error) {
	ch, err := s.repo.GetByID(challengeID)
	if err != nil {
		return nil, err
	}
	if ch.Status != "active" {
		return nil, errors.New("challenge is not active")
	}
	if ch.ExpiresAt != "" && time.Now().After(parseTime(ch.ExpiresAt)) {
		return nil, errors.New("challenge has expired")
	}
	attemptCount, err := s.repo.GetAthleteAttemptCount(challengeID, athleteID)
	if err != nil {
		return nil, err
	}
	if attemptCount >= ch.MaxAttempts {
		return nil, errors.New("max attempts reached")
	}

	now := time.Now().UTC()
	attempt := &domain.ChallengeAttempt{
		ChallengeID:    challengeID,
		AthleteID:      athleteID,
		AttemptNumber:  attemptCount + 1,
		ConsentGivenAt: &now,
		VideoConsent:   videoConsent,
		PhotoConsent:   photoConsent,
		Status:         "in_progress",
	}

	if err := s.repo.CreateAttempt(attempt); err != nil {
		return nil, err
	}
	return attempt, nil
}

// SubmitAttempt completes an attempt with form metrics.
func (s *Service) SubmitAttempt(attemptID string, metrics map[string]interface{}) (*domain.ChallengeAttempt, error) {
	a, err := s.repo.GetAttempt(attemptID)
	if err != nil {
		return nil, err
	}

	if formScore, ok := metrics["form_score"].(float64); ok {
		a.FormScore = &formScore
	}
	if depthScore, ok := metrics["depth_score"].(float64); ok {
		a.DepthScore = &depthScore
	}
	if alignmentScore, ok := metrics["alignment_score"].(float64); ok {
		a.AlignmentScore = &alignmentScore
	}
	if tempoScore, ok := metrics["tempo_score"].(float64); ok {
		a.TempoScore = &tempoScore
	}
	if sets, ok := metrics["sets_completed"].(float64); ok {
		a.SetsCompleted = int(sets)
	}
	if reps, ok := metrics["reps_completed"].(float64); ok {
		a.RepsCompleted = int(reps)
	}
	if totalVolume, ok := metrics["total_volume"].(float64); ok {
		a.TotalVolume = &totalVolume
	}
	if notes, ok := metrics["notes"].(string); ok {
		a.Notes = notes
	}
	if a.VideoConsent {
		if videoURL, ok := metrics["video_url"].(string); ok {
			a.VideoURL = videoURL
		}
	}

	now := time.Now().UTC()
	a.CompletedAt = &now
	a.Status = "completed"
	if err := s.repo.UpdateAttempt(a); err != nil {
		return nil, err
	}
	return a, nil
}

// ListAttempts returns all attempts for a challenge.
func (s *Service) ListAttempts(challengeID string) ([]*domain.ChallengeAttempt, error) {
	return s.repo.ListAttemptsByChallenge(challengeID)
}

// AttachAttemptVideo persists a video URL onto an attempt.
func (s *Service) AttachAttemptVideo(attemptID, videoURL string) (*domain.ChallengeAttempt, error) {
	a, err := s.repo.GetAttempt(attemptID)
	if err != nil {
		return nil, err
	}
	a.VideoURL = videoURL
	if err := s.repo.UpdateAttempt(a); err != nil {
		return nil, err
	}
	return a, nil
}

// ListAthleteAttempts returns all attempts by an athlete.
func (s *Service) ListAthleteAttempts(athleteID string) ([]*domain.ChallengeAttempt, error) {
	return s.repo.ListAttemptsByAthlete(athleteID)
}

// --- Leaderboard ---

// GetChallengeLeaderboard returns the leaderboard for a challenge.
func (s *Service) GetChallengeLeaderboard(challengeID string) ([]*domain.LeaderboardEntry, error) {
	return s.repo.GetChallengeLeaderboard(challengeID)
}

// --- Analytics ---

// GetAthleteChallengeAnalytics returns aggregated analytics for an athlete.
func (s *Service) GetAthleteChallengeAnalytics(athleteID string) (*domain.AthleteChallengeAnalytics, error) {
	return s.repo.GetAthleteChallengeAnalytics(athleteID)
}

// GetChallengeStats returns stats for a challenge.
func (s *Service) GetChallengeStats(challengeID string) (map[string]interface{}, error) {
	return s.repo.GetChallengeStats(challengeID)
}

// GetAthleteProgress returns an athlete's progress over time for an exercise type.
func (s *Service) GetAthleteProgress(athleteID, exerciseType string) ([]map[string]interface{}, error) {
	return s.repo.GetAthleteProgress(athleteID, exerciseType)
}

// --- Expiration ---

// ExpireChallenges expires all challenges past their end date.
func (s *Service) ExpireChallenges() error {
	return s.repo.ExpireChallenges()
}

// --- Helpers ---

func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339, s)
	return t
}

// parseEndDate accepts YYYY-MM-DD or RFC3339 and returns a normalized date.
func parseEndDate(s string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, s)
}
