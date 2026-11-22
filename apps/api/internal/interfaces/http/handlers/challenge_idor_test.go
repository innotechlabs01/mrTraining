package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"

	challengeapp "github.com/innotechlabs01/mr-training-api/internal/application/challenge"
	challengedomain "github.com/innotechlabs01/mr-training-api/internal/domain/challenge"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type challengeTestRepo struct {
	challenges map[string]*challengedomain.Challenge
	attempts   map[string]*challengedomain.ChallengeAttempt
}

func newChallengeTestRepo() *challengeTestRepo {
	return &challengeTestRepo{
		challenges: make(map[string]*challengedomain.Challenge),
		attempts:   make(map[string]*challengedomain.ChallengeAttempt),
	}
}

func (r *challengeTestRepo) GetByID(id string) (*challengedomain.Challenge, error) {
	ch, ok := r.challenges[id]
	if !ok {
		return nil, sql.ErrNoRows
	}
	cp := *ch
	return &cp, nil
}
func (r *challengeTestRepo) ListByCoach(_ string) ([]*challengedomain.Challenge, error) {
	return nil, nil
}
func (r *challengeTestRepo) ListActiveByCoach(_ string) ([]*challengedomain.Challenge, error) {
	return nil, nil
}
func (r *challengeTestRepo) ListDraftByCoach(_ string) ([]*challengedomain.Challenge, error) {
	return nil, nil
}
func (r *challengeTestRepo) ListActiveForAthlete(_ string) ([]*challengedomain.Challenge, error) {
	return nil, nil
}
func (r *challengeTestRepo) GetActiveForAthlete(_ string) (*challengedomain.Challenge, error) {
	return nil, nil
}
func (r *challengeTestRepo) Create(ch *challengedomain.Challenge) error {
	r.challenges[ch.ID] = ch
	return nil
}
func (r *challengeTestRepo) Update(ch *challengedomain.Challenge) error {
	cp := *ch
	r.challenges[ch.ID] = &cp
	return nil
}
func (r *challengeTestRepo) Delete(id string) error             { delete(r.challenges, id); return nil }
func (r *challengeTestRepo) HasAttempts(_ string) (bool, error) { return false, nil }
func (r *challengeTestRepo) GetExercisesByChallenge(_ string) ([]*challengedomain.ChallengeExercise, error) {
	return nil, nil
}
func (r *challengeTestRepo) CreateExercise(_ *challengedomain.ChallengeExercise) error { return nil }
func (r *challengeTestRepo) UpdateExercise(_ *challengedomain.ChallengeExercise) error { return nil }
func (r *challengeTestRepo) DeleteExercise(_ string) error                             { return nil }
func (r *challengeTestRepo) DeleteExercisesByChallenge(_ string) error                 { return nil }
func (r *challengeTestRepo) CreateAttempt(a *challengedomain.ChallengeAttempt) error {
	r.attempts[a.ID] = a
	return nil
}
func (r *challengeTestRepo) GetAttempt(id string) (*challengedomain.ChallengeAttempt, error) {
	a, ok := r.attempts[id]
	if !ok {
		return nil, sql.ErrNoRows
	}
	cp := *a
	return &cp, nil
}
func (r *challengeTestRepo) ListAttemptsByChallenge(challengeID string) ([]*challengedomain.ChallengeAttempt, error) {
	var out []*challengedomain.ChallengeAttempt
	for _, a := range r.attempts {
		if a.ChallengeID == challengeID {
			cp := *a
			out = append(out, &cp)
		}
	}
	return out, nil
}
func (r *challengeTestRepo) ListAttemptsByAthlete(_ string) ([]*challengedomain.ChallengeAttempt, error) {
	return nil, nil
}
func (r *challengeTestRepo) GetAthleteAttemptCount(_, _ string) (int, error) { return 0, nil }
func (r *challengeTestRepo) UpdateAttempt(a *challengedomain.ChallengeAttempt) error {
	cp := *a
	r.attempts[a.ID] = &cp
	return nil
}
func (r *challengeTestRepo) GetChallengeLeaderboard(_ string) ([]*challengedomain.LeaderboardEntry, error) {
	return nil, nil
}
func (r *challengeTestRepo) GetAthleteChallengeAnalytics(_ string) (*challengedomain.AthleteChallengeAnalytics, error) {
	return nil, nil
}
func (r *challengeTestRepo) GetChallengeStats(_ string) (map[string]interface{}, error) {
	return nil, nil
}
func (r *challengeTestRepo) GetAthleteProgress(_, _ string) ([]map[string]interface{}, error) {
	return nil, nil
}
func (r *challengeTestRepo) ExpireChallenges() error { return nil }

func setupChallengeTestApp(repo *challengeTestRepo, userID, role string) *fiber.App {
	svc := challengeapp.NewService(repo)
	h := NewChallengeHandler(svc, nil)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		if userID != "" {
			middleware.SetTestAuth(c, middleware.TestAuthConfig{UserID: userID, Role: role})
		}
		return c.Next()
	})
	app.Get("/challenges/:id", h.GetChallenge)
	app.Put("/challenges/:id", h.UpdateChallenge)
	app.Post("/challenges/:id/activate", h.ActivateChallenge)
	app.Get("/coach/challenges", h.ListCoachChallenges)
	app.Post("/athlete/challenges/attempts/:id/submit", h.SubmitAttempt)
	app.Post("/athlete/challenges/attempts/:id/video", h.UploadAttemptVideo)
	return app
}

func TestChallengeHandler_NoPanicOnMissingAuth(t *testing.T) {
	repo := newChallengeTestRepo()
	app := setupChallengeTestApp(repo, "", "")

	for _, tc := range []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/coach/challenges"},
		{http.MethodGet, "/challenges/ch-1"},
		{http.MethodPut, "/challenges/ch-1"},
		{http.MethodPost, "/challenges/ch-1/activate"},
		{http.MethodPost, "/athlete/challenges/attempts/att-1/submit"},
		{http.MethodPost, "/athlete/challenges/attempts/att-1/video"},
	} {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		resp, err := app.Test(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode, "%s %s", tc.method, tc.path)
	}
}

func TestChallengeHandler_UpdateActivateAndAttemptOwnership(t *testing.T) {
	repo := newChallengeTestRepo()
	repo.challenges["ch-1"] = &challengedomain.Challenge{
		ID:      "ch-1",
		CoachID: "coach-owner",
		Title:   "Original",
		Status:  "draft",
	}
	repo.attempts["att-1"] = &challengedomain.ChallengeAttempt{
		ID:          "att-1",
		ChallengeID: "ch-1",
		AthleteID:   "athlete-1",
		Status:      "in_progress",
	}

	// Non-owning coach cannot update or activate
	otherCoach := setupChallengeTestApp(repo, "coach-other", "coach")
	updReq := httptest.NewRequest(http.MethodPut, "/challenges/ch-1", bytes.NewBufferString(`{"title":"Hacked"}`))
	updReq.Header.Set("Content-Type", "application/json")
	updResp, err := otherCoach.Test(updReq)
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, updResp.StatusCode)

	actReq := httptest.NewRequest(http.MethodPost, "/challenges/ch-1/activate", nil)
	actResp, err := otherCoach.Test(actReq)
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, actResp.StatusCode)

	// Other athlete cannot submit or attach video to athlete-1's attempt
	otherAthlete := setupChallengeTestApp(repo, "athlete-2", "athlete")
	subReq := httptest.NewRequest(http.MethodPost, "/athlete/challenges/attempts/att-1/submit", bytes.NewBufferString(`{"form_score":99}`))
	subReq.Header.Set("Content-Type", "application/json")
	subResp, err := otherAthlete.Test(subReq)
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, subResp.StatusCode)

	vidReq := httptest.NewRequest(http.MethodPost, "/athlete/challenges/attempts/att-1/video", bytes.NewBufferString(`{"video_url":"https://evil.test/v.mp4"}`))
	vidReq.Header.Set("Content-Type", "application/json")
	vidResp, err := otherAthlete.Test(vidReq)
	require.NoError(t, err)
	require.Equal(t, http.StatusForbidden, vidResp.StatusCode)

	// Owner coach can update & activate; owner athlete can submit
	ownerCoach := setupChallengeTestApp(repo, "coach-owner", "coach")
	okUpd := httptest.NewRequest(http.MethodPut, "/challenges/ch-1", bytes.NewBufferString(`{"title":"Updated","status":"draft"}`))
	okUpd.Header.Set("Content-Type", "application/json")
	okUpdResp, err := ownerCoach.Test(okUpd)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, okUpdResp.StatusCode)

	okActResp, err := ownerCoach.Test(httptest.NewRequest(http.MethodPost, "/challenges/ch-1/activate", nil))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, okActResp.StatusCode)

	ownerAthlete := setupChallengeTestApp(repo, "athlete-1", "athlete")
	okSub := httptest.NewRequest(http.MethodPost, "/athlete/challenges/attempts/att-1/submit", bytes.NewBufferString(`{"form_score":90}`))
	okSub.Header.Set("Content-Type", "application/json")
	okSubResp, err := ownerAthlete.Test(okSub)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, okSubResp.StatusCode)
}

func TestChallengeHandler_GetChallenge_ScopesAttempts(t *testing.T) {
	repo := newChallengeTestRepo()
	repo.challenges["ch-1"] = &challengedomain.Challenge{
		ID:      "ch-1",
		CoachID: "coach-owner",
		Title:   "Scoped",
		Status:  "active",
	}
	repo.attempts["att-1"] = &challengedomain.ChallengeAttempt{ID: "att-1", ChallengeID: "ch-1", AthleteID: "athlete-1"}
	repo.attempts["att-2"] = &challengedomain.ChallengeAttempt{ID: "att-2", ChallengeID: "ch-1", AthleteID: "athlete-2"}

	decodeAttemptIDs := func(app *fiber.App) []string {
		req := httptest.NewRequest(http.MethodGet, "/challenges/ch-1", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		var payload struct {
			Data struct {
				Attempts []challengedomain.ChallengeAttempt `json:"attempts"`
			} `json:"data"`
		}
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&payload))
		ids := make([]string, 0, len(payload.Data.Attempts))
		for _, a := range payload.Data.Attempts {
			ids = append(ids, a.ID)
		}
		return ids
	}

	require.Equal(t, []string{"att-1"}, decodeAttemptIDs(setupChallengeTestApp(repo, "athlete-1", "athlete")))
	require.Empty(t, decodeAttemptIDs(setupChallengeTestApp(repo, "coach-other", "coach")))
	require.Len(t, decodeAttemptIDs(setupChallengeTestApp(repo, "coach-owner", "coach")), 2)
	require.Len(t, decodeAttemptIDs(setupChallengeTestApp(repo, "admin-1", "admin")), 2)
}
