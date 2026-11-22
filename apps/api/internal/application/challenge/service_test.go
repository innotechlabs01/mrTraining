package challenge

import (
	"database/sql"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/challenge"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
)

type stubChallengeRepo struct {
	challenges map[string]*domain.Challenge
	attempts   map[string]*domain.ChallengeAttempt
}

func newStubChallengeRepo() *stubChallengeRepo {
	return &stubChallengeRepo{
		challenges: make(map[string]*domain.Challenge),
		attempts:   make(map[string]*domain.ChallengeAttempt),
	}
}

func (r *stubChallengeRepo) GetByID(id string) (*domain.Challenge, error) {
	ch, ok := r.challenges[id]
	if !ok {
		return nil, sql.ErrNoRows
	}
	cp := *ch
	return &cp, nil
}
func (r *stubChallengeRepo) ListByCoach(_ string) ([]*domain.Challenge, error)       { return nil, nil }
func (r *stubChallengeRepo) ListActiveByCoach(_ string) ([]*domain.Challenge, error) { return nil, nil }
func (r *stubChallengeRepo) ListDraftByCoach(_ string) ([]*domain.Challenge, error)  { return nil, nil }
func (r *stubChallengeRepo) ListActiveForAthlete(_ string) ([]*domain.Challenge, error) {
	return nil, nil
}
func (r *stubChallengeRepo) GetActiveForAthlete(_ string) (*domain.Challenge, error) { return nil, nil }
func (r *stubChallengeRepo) Create(ch *domain.Challenge) error                       { r.challenges[ch.ID] = ch; return nil }
func (r *stubChallengeRepo) Update(ch *domain.Challenge) error {
	cp := *ch
	r.challenges[ch.ID] = &cp
	return nil
}
func (r *stubChallengeRepo) Delete(id string) error             { delete(r.challenges, id); return nil }
func (r *stubChallengeRepo) HasAttempts(_ string) (bool, error) { return false, nil }
func (r *stubChallengeRepo) GetExercisesByChallenge(_ string) ([]*domain.ChallengeExercise, error) {
	return nil, nil
}
func (r *stubChallengeRepo) CreateExercise(_ *domain.ChallengeExercise) error { return nil }
func (r *stubChallengeRepo) UpdateExercise(_ *domain.ChallengeExercise) error { return nil }
func (r *stubChallengeRepo) DeleteExercise(_ string) error                    { return nil }
func (r *stubChallengeRepo) DeleteExercisesByChallenge(_ string) error        { return nil }
func (r *stubChallengeRepo) CreateAttempt(a *domain.ChallengeAttempt) error {
	r.attempts[a.ID] = a
	return nil
}
func (r *stubChallengeRepo) GetAttempt(id string) (*domain.ChallengeAttempt, error) {
	a, ok := r.attempts[id]
	if !ok {
		return nil, sql.ErrNoRows
	}
	cp := *a
	return &cp, nil
}
func (r *stubChallengeRepo) ListAttemptsByChallenge(challengeID string) ([]*domain.ChallengeAttempt, error) {
	var out []*domain.ChallengeAttempt
	for _, a := range r.attempts {
		if a.ChallengeID == challengeID {
			cp := *a
			out = append(out, &cp)
		}
	}
	return out, nil
}
func (r *stubChallengeRepo) ListAttemptsByAthlete(_ string) ([]*domain.ChallengeAttempt, error) {
	return nil, nil
}
func (r *stubChallengeRepo) GetAthleteAttemptCount(_, _ string) (int, error) { return 0, nil }
func (r *stubChallengeRepo) UpdateAttempt(a *domain.ChallengeAttempt) error {
	cp := *a
	r.attempts[a.ID] = &cp
	return nil
}
func (r *stubChallengeRepo) GetChallengeLeaderboard(_ string) ([]*domain.LeaderboardEntry, error) {
	return nil, nil
}
func (r *stubChallengeRepo) GetAthleteChallengeAnalytics(_ string) (*domain.AthleteChallengeAnalytics, error) {
	return nil, nil
}
func (r *stubChallengeRepo) GetChallengeStats(_ string) (map[string]interface{}, error) {
	return nil, nil
}
func (r *stubChallengeRepo) GetAthleteProgress(_, _ string) ([]map[string]interface{}, error) {
	return nil, nil
}
func (r *stubChallengeRepo) ExpireChallenges() error { return nil }

func TestService_ChallengeOwnershipAndAttemptScoping(t *testing.T) {
	repo := newStubChallengeRepo()
	repo.challenges["ch-1"] = &domain.Challenge{
		ID:      "ch-1",
		CoachID: "coach-a",
		Title:   "Squat Challenge",
		Status:  "draft",
	}
	repo.attempts["att-1"] = &domain.ChallengeAttempt{
		ID:          "att-1",
		ChallengeID: "ch-1",
		AthleteID:   "athlete-1",
		Status:      "in_progress",
	}
	repo.attempts["att-2"] = &domain.ChallengeAttempt{
		ID:          "att-2",
		ChallengeID: "ch-1",
		AthleteID:   "athlete-2",
		Status:      "completed",
	}
	svc := NewService(repo)

	t.Run("UpdateChallenge denies non-owning coach", func(t *testing.T) {
		err := svc.UpdateChallenge("coach-b", &domain.Challenge{ID: "ch-1", Title: "Hijacked"})
		require.Error(t, err)
		var appErr *apperrors.AppError
		require.True(t, errors.As(err, &appErr))
		require.Equal(t, 403, appErr.Status)
		require.Equal(t, "Squat Challenge", repo.challenges["ch-1"].Title)
	})

	t.Run("ActivateChallenge denies non-owning coach and allows owner", func(t *testing.T) {
		err := svc.ActivateChallenge("coach-b", "ch-1")
		require.Error(t, err)
		var appErr *apperrors.AppError
		require.True(t, errors.As(err, &appErr))
		require.Equal(t, 403, appErr.Status)
		require.Equal(t, "draft", repo.challenges["ch-1"].Status)

		require.NoError(t, svc.ActivateChallenge("coach-a", "ch-1"))
		require.Equal(t, "active", repo.challenges["ch-1"].Status)
	})

	t.Run("SubmitAttempt and AttachAttemptVideo verify athlete ownership", func(t *testing.T) {
		_, err := svc.SubmitAttempt("athlete-2", "att-1", map[string]interface{}{"form_score": 95.0})
		require.Error(t, err)
		var appErr *apperrors.AppError
		require.True(t, errors.As(err, &appErr))
		require.Equal(t, 403, appErr.Status)

		_, err = svc.AttachAttemptVideo("athlete-2", "att-1", "r2://hacked.mp4")
		require.Error(t, err)
		require.True(t, errors.As(err, &appErr))
		require.Equal(t, 403, appErr.Status)

		updated, err := svc.SubmitAttempt("athlete-1", "att-1", map[string]interface{}{"form_score": 88.0})
		require.NoError(t, err)
		require.Equal(t, "completed", updated.Status)
	})

	t.Run("ListAttemptsForChallenge scopes to caller unless owner or admin", func(t *testing.T) {
		scoped, err := svc.ListAttemptsForChallenge("ch-1", "athlete-1", false)
		require.NoError(t, err)
		require.Len(t, scoped, 1)
		require.Equal(t, "athlete-1", scoped[0].AthleteID)

		all, err := svc.ListAttemptsForChallenge("ch-1", "coach-a", true)
		require.NoError(t, err)
		require.Len(t, all, 2)
	})
}
