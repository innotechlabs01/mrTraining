package challenge

import (
	"database/sql"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/challenge"
)

type repository struct {
	db *sql.DB
}

// NewRepository creates a new challenge repository.
func NewRepository(db *sql.DB) domain.Repository {
	return &repository{db: db}
}

// --- Challenge CRUD ---

func (r *repository) GetByID(id string) (*domain.Challenge, error) {
	query := `
		SELECT id, coach_id, title, description, exercise_type, video_url,
		       duration_minutes, calories, target_sets, target_reps,
		       scoring_type, difficulty_level, max_attempts, status,
		       start_date, end_date, expires_at, created_at, updated_at
		FROM challenges WHERE id = ?
	`
	ch := &domain.Challenge{}
	err := r.db.QueryRow(query, id).Scan(
		&ch.ID, &ch.CoachID, &ch.Title, &ch.Description,
		&ch.ExerciseType, &ch.VideoURL, &ch.DurationMinutes, &ch.Calories,
		&ch.TargetSets, &ch.TargetReps, &ch.ScoringType, &ch.DifficultyLevel,
		&ch.MaxAttempts, &ch.Status, &ch.StartDate, &ch.EndDate, &ch.ExpiresAt,
		&ch.CreatedAt, &ch.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	ch.DaysLeft = calcDaysLeft(ch.EndDate)
	ch.IsUrgent = ch.DaysLeft <= 1 && ch.DaysLeft > 0
	return ch, nil
}

func (r *repository) ListByCoach(coachID string) ([]*domain.Challenge, error) {
	query := `
		SELECT id, coach_id, title, description, exercise_type, video_url,
		       duration_minutes, calories, target_sets, target_reps,
		       scoring_type, difficulty_level, max_attempts, status,
		       start_date, end_date, expires_at, created_at, updated_at
		FROM challenges WHERE coach_id = ?
		ORDER BY created_at DESC
	`
	return r.listQuery(query, coachID)
}

func (r *repository) ListActiveByCoach(coachID string) ([]*domain.Challenge, error) {
	query := `
		SELECT id, coach_id, title, description, exercise_type, video_url,
		       duration_minutes, calories, target_sets, target_reps,
		       scoring_type, difficulty_level, max_attempts, status,
		       start_date, end_date, expires_at, created_at, updated_at
		FROM challenges WHERE coach_id = ? AND status = 'active'
		ORDER BY created_at DESC
	`
	return r.listQuery(query, coachID)
}

func (r *repository) ListDraftByCoach(coachID string) ([]*domain.Challenge, error) {
	query := `
		SELECT id, coach_id, title, description, exercise_type, video_url,
		       duration_minutes, calories, target_sets, target_reps,
		       scoring_type, difficulty_level, max_attempts, status,
		       start_date, end_date, expires_at, created_at, updated_at
		FROM challenges WHERE coach_id = ? AND status = 'draft'
		ORDER BY created_at DESC
	`
	return r.listQuery(query, coachID)
}

func (r *repository) ListActiveForAthlete(athleteID string) ([]*domain.Challenge, error) {
	query := `
		SELECT c.id, c.coach_id, c.title, c.description, c.exercise_type, c.video_url,
		       c.duration_minutes, c.calories, c.target_sets, c.target_reps,
		       c.scoring_type, c.difficulty_level, c.max_attempts, c.status,
		       c.start_date, c.end_date, c.expires_at, c.created_at, c.updated_at
		FROM challenges c
		INNER JOIN coach_athlete_links cal ON c.coach_id = cal.coach_id
		WHERE cal.athlete_id = ?
		  AND c.status = 'active'
		  AND (c.expires_at IS NULL OR datetime(c.expires_at) > datetime('now'))
		ORDER BY c.created_at DESC
	`
	return r.listQuery(query, athleteID)
}

func (r *repository) GetActiveForAthlete(athleteID string) (*domain.Challenge, error) {
	query := `
		SELECT c.id, c.coach_id, c.title, c.description, c.exercise_type, c.video_url,
		       c.duration_minutes, c.calories, c.target_sets, c.target_reps,
		       c.scoring_type, c.difficulty_level, c.max_attempts, c.status,
		       c.start_date, c.end_date, c.expires_at, c.created_at, c.updated_at
		FROM challenges c
		INNER JOIN coach_athlete_links cal ON c.coach_id = cal.coach_id
		WHERE cal.athlete_id = ?
		  AND c.status = 'active'
		  AND (c.expires_at IS NULL OR datetime(c.expires_at) > datetime('now'))
		ORDER BY c.created_at DESC LIMIT 1
	`
	ch := &domain.Challenge{}
	err := r.db.QueryRow(query, athleteID).Scan(
		&ch.ID, &ch.CoachID, &ch.Title, &ch.Description,
		&ch.ExerciseType, &ch.VideoURL, &ch.DurationMinutes, &ch.Calories,
		&ch.TargetSets, &ch.TargetReps, &ch.ScoringType, &ch.DifficultyLevel,
		&ch.MaxAttempts, &ch.Status, &ch.StartDate, &ch.EndDate, &ch.ExpiresAt,
		&ch.CreatedAt, &ch.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	ch.DaysLeft = calcDaysLeft(ch.EndDate)
	ch.IsUrgent = ch.DaysLeft <= 1 && ch.DaysLeft > 0
	return ch, nil
}

func (r *repository) Create(ch *domain.Challenge) error {
	now := time.Now().UTC()
	query := `
		INSERT INTO challenges (id, coach_id, title, description, exercise_type,
		    video_url, duration_minutes, calories, target_sets, target_reps,
		    scoring_type, difficulty_level, max_attempts, status,
		    start_date, end_date, expires_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	if ch.ID == "" {
		ch.ID = "ch-" + now.Format("20060102150405")
	}
	ch.CreatedAt = now
	ch.UpdatedAt = now
	if ch.Status == "" {
		ch.Status = "draft"
	}
	if ch.MaxAttempts == 0 {
		ch.MaxAttempts = 2
	}

	_, err := r.db.Exec(query,
		ch.ID, ch.CoachID, ch.Title, nullStr(ch.Description), ch.ExerciseType,
		nullStr(ch.VideoURL), ch.DurationMinutes, ch.Calories,
		ch.TargetSets, ch.TargetReps, ch.ScoringType, ch.DifficultyLevel,
		ch.MaxAttempts, ch.Status,
		nullStr(ch.StartDate), nullStr(ch.EndDate), nullStr(ch.ExpiresAt),
		ch.CreatedAt, ch.UpdatedAt,
	)
	return err
}

func (r *repository) Update(ch *domain.Challenge) error {
	query := `
		UPDATE challenges
		SET title = ?, description = ?, exercise_type = ?, video_url = ?,
		    duration_minutes = ?, calories = ?, target_sets = ?, target_reps = ?,
		    scoring_type = ?, difficulty_level = ?, max_attempts = ?,
		    status = ?, start_date = ?, end_date = ?, expires_at = ?, updated_at = ?
		WHERE id = ?
	`
	ch.UpdatedAt = time.Now().UTC()
	_, err := r.db.Exec(query,
		ch.Title, nullStr(ch.Description), ch.ExerciseType, nullStr(ch.VideoURL),
		ch.DurationMinutes, ch.Calories, ch.TargetSets, ch.TargetReps,
		ch.ScoringType, ch.DifficultyLevel, ch.MaxAttempts,
		ch.Status, nullStr(ch.StartDate), nullStr(ch.EndDate), nullStr(ch.ExpiresAt),
		ch.UpdatedAt, ch.ID,
	)
	return err
}

func (r *repository) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM challenges WHERE id = ?`, id)
	return err
}

func (r *repository) HasAttempts(challengeID string) (bool, error) {
	var count int
	err := r.db.QueryRow(
		`SELECT COUNT(*) FROM challenge_attempts WHERE challenge_id = ?`,
		challengeID,
	).Scan(&count)
	return count > 0, err
}

// --- Attempts ---

func (r *repository) CreateAttempt(a *domain.ChallengeAttempt) error {
	now := time.Now().UTC()
	query := `
		INSERT INTO challenge_attempts (id, challenge_id, athlete_id, attempt_number,
		    consent_given_at, video_consent, photo_consent,
		    video_url, form_score, depth_score, alignment_score, tempo_score,
		    sets_completed, reps_completed, total_volume, notes, status,
		    completed_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	if a.ID == "" {
		a.ID = "ca-" + now.Format("20060102150405") + "-" + a.AthleteID
	}
	a.CreatedAt = now

	_, err := r.db.Exec(query,
		a.ID, a.ChallengeID, a.AthleteID, a.AttemptNumber,
		nullTime(a.ConsentGivenAt), boolToInt(a.VideoConsent), boolToInt(a.PhotoConsent),
		nullStr(a.VideoURL), a.FormScore, a.DepthScore, a.AlignmentScore, a.TempoScore,
		a.SetsCompleted, a.RepsCompleted, a.TotalVolume, nullStr(a.Notes), a.Status,
		nullTime(a.CompletedAt), a.CreatedAt,
	)
	return err
}

func (r *repository) GetAttempt(id string) (*domain.ChallengeAttempt, error) {
	query := `
		SELECT id, challenge_id, athlete_id, attempt_number,
		       consent_given_at, video_consent, photo_consent,
		       video_url, form_score, depth_score, alignment_score, tempo_score,
		       sets_completed, reps_completed, total_volume, notes, status,
		       completed_at, created_at
		FROM challenge_attempts WHERE id = ?
	`
	a := &domain.ChallengeAttempt{}
	var consentAt, completedAt sql.NullTime
	err := r.db.QueryRow(query, id).Scan(
		&a.ID, &a.ChallengeID, &a.AthleteID, &a.AttemptNumber,
		&consentAt, &a.VideoConsent, &a.PhotoConsent,
		&a.VideoURL, &a.FormScore, &a.DepthScore, &a.AlignmentScore, &a.TempoScore,
		&a.SetsCompleted, &a.RepsCompleted, &a.TotalVolume, &a.Notes, &a.Status,
		&completedAt, &a.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if consentAt.Valid {
		a.ConsentGivenAt = &consentAt.Time
	}
	if completedAt.Valid {
		a.CompletedAt = &completedAt.Time
	}
	return a, nil
}

func (r *repository) ListAttemptsByChallenge(challengeID string) ([]*domain.ChallengeAttempt, error) {
	query := `
		SELECT id, challenge_id, athlete_id, attempt_number,
		       consent_given_at, video_consent, photo_consent,
		       video_url, form_score, depth_score, alignment_score, tempo_score,
		       sets_completed, reps_completed, total_volume, notes, status,
		       completed_at, created_at
		FROM challenge_attempts WHERE challenge_id = ?
		ORDER BY attempt_number DESC
	`
	return r.listAttempts(query, challengeID)
}

func (r *repository) ListAttemptsByAthlete(athleteID string) ([]*domain.ChallengeAttempt, error) {
	query := `
		SELECT id, challenge_id, athlete_id, attempt_number,
		       consent_given_at, video_consent, photo_consent,
		       video_url, form_score, depth_score, alignment_score, tempo_score,
		       sets_completed, reps_completed, total_volume, notes, status,
		       completed_at, created_at
		FROM challenge_attempts WHERE athlete_id = ?
		ORDER BY created_at DESC
	`
	return r.listAttempts(query, athleteID)
}

func (r *repository) GetAthleteAttemptCount(challengeID, athleteID string) (int, error) {
	var count int
	err := r.db.QueryRow(
		`SELECT COUNT(*) FROM challenge_attempts WHERE challenge_id = ? AND athlete_id = ?`,
		challengeID, athleteID,
	).Scan(&count)
	return count, err
}

func (r *repository) UpdateAttempt(a *domain.ChallengeAttempt) error {
	query := `
		UPDATE challenge_attempts
		SET video_url = ?, form_score = ?, depth_score = ?, alignment_score = ?,
		    tempo_score = ?, sets_completed = ?, reps_completed = ?, total_volume = ?,
		    notes = ?, status = ?, completed_at = ?
		WHERE id = ?
	`
	_, err := r.db.Exec(query,
		nullStr(a.VideoURL), a.FormScore, a.DepthScore, a.AlignmentScore,
		a.TempoScore, a.SetsCompleted, a.RepsCompleted, a.TotalVolume,
		nullStr(a.Notes), a.Status, nullTime(a.CompletedAt), a.ID,
	)
	return err
}

// --- Leaderboard ---

func (r *repository) GetChallengeLeaderboard(challengeID string) ([]*domain.LeaderboardEntry, error) {
	query := `
		SELECT
			cp.athlete_id,
			COALESCE(u.name, 'Athlete') as athlete_name,
			COALESCE(u.avatar_url, '') as avatar_url,
			COUNT(cp.id) as total_attempts,
			CASE
				WHEN c.scoring_type = 'form_score' THEN COALESCE(AVG(cp.form_score), 0)
				WHEN c.scoring_type = 'total_volume' THEN COALESCE(SUM(cp.total_volume), 0)
				WHEN c.scoring_type = 'consistency' THEN COUNT(DISTINCT DATE(cp.created_at))
				ELSE COALESCE(AVG(cp.form_score), 0)
			END as score,
			COALESCE(MAX(
				CASE
					WHEN c.scoring_type = 'form_score' THEN cp.form_score
					WHEN c.scoring_type = 'total_volume' THEN cp.total_volume
					ELSE cp.form_score
				END
			), 0) as best_score
		FROM challenge_attempts cp
		JOIN challenges c ON cp.challenge_id = c.id
		LEFT JOIN users u ON cp.athlete_id = u.id
		WHERE cp.challenge_id = ? AND cp.status = 'completed'
		GROUP BY cp.athlete_id, u.name, u.avatar_url, c.scoring_type
		HAVING COUNT(cp.id) >= 1
		ORDER BY score DESC
	`
	rows, err := r.db.Query(query, challengeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*domain.LeaderboardEntry
	rank := 1
	for rows.Next() {
		e := &domain.LeaderboardEntry{Rank: rank}
		if err := rows.Scan(
			&e.AthleteID, &e.AthleteName, &e.AvatarURL,
			&e.Attempts, &e.Score, &e.BestScore,
		); err != nil {
			return nil, err
		}
		e.Trend = "stable"
		entries = append(entries, e)
		rank++
	}
	return entries, nil
}

// --- Analytics ---

func (r *repository) GetAthleteChallengeAnalytics(athleteID string) (*domain.AthleteChallengeAnalytics, error) {
	query := `
		SELECT
			COUNT(DISTINCT cp.challenge_id) as total_challenges,
			COUNT(DISTINCT CASE WHEN cp.status = 'completed' THEN cp.challenge_id END) as completed,
		COALESCE(AVG(CASE WHEN cp.status = 'completed' THEN cp.form_score END), 0) as avg_form,
		COALESCE(MAX(CASE WHEN cp.status = 'completed' THEN cp.form_score END), 0) as best_form
		FROM challenge_attempts cp
		WHERE cp.athlete_id = ?
	`
	a := &domain.AthleteChallengeAnalytics{AthleteID: athleteID}
	err := r.db.QueryRow(query, athleteID).Scan(
		&a.TotalChallenges, &a.CompletedChallenges, &a.AvgFormScore, &a.BestFormScore,
	)
	if err != nil {
		return nil, err
	}

	// Calculate improvement percentage
	if a.TotalChallenges > 1 {
		a.ImprovementPct = ((a.BestFormScore - a.AvgFormScore) / a.AvgFormScore) * 100
	}

	return a, nil
}

func (r *repository) GetChallengeStats(challengeID string) (map[string]interface{}, error) {
	query := `
		SELECT
			COUNT(*) as total_attempts,
			COUNT(DISTINCT athlete_id) as unique_athletes,
			COALESCE(AVG(form_score), 0) as avg_form_score,
			COALESCE(MAX(form_score), 0) as best_form_score
		FROM challenge_attempts
		WHERE challenge_id = ? AND status = 'completed'
	`
	var totalAttempts, uniqueAthletes int
	var avgFormScore, bestFormScore float64
	err := r.db.QueryRow(query, challengeID).Scan(
		&totalAttempts, &uniqueAthletes, &avgFormScore, &bestFormScore,
	)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"total_attempts":  totalAttempts,
		"unique_athletes": uniqueAthletes,
		"avg_form_score":  avgFormScore,
		"best_form_score": bestFormScore,
	}, nil
}

func (r *repository) GetAthleteProgress(athleteID string, exerciseType string) ([]map[string]interface{}, error) {
	query := `
		SELECT cp.created_at, cp.form_score, cp.depth_score, cp.attempt_number
		FROM challenge_attempts cp
		JOIN challenges c ON cp.challenge_id = c.id
		WHERE cp.athlete_id = ? AND c.exercise_type = ? AND cp.status = 'completed'
		ORDER BY cp.created_at ASC
	`
	rows, err := r.db.Query(query, athleteID, exerciseType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var progress []map[string]interface{}
	for rows.Next() {
		var createdAt time.Time
		var formScore, depthScore sql.NullFloat64
		var attemptNum int
		if err := rows.Scan(&createdAt, &formScore, &depthScore, &attemptNum); err != nil {
			return nil, err
		}
		entry := map[string]interface{}{
			"date":           createdAt,
			"attempt_number": attemptNum,
		}
		if formScore.Valid {
			entry["form_score"] = formScore.Float64
		}
		if depthScore.Valid {
			entry["depth_score"] = depthScore.Float64
		}
		progress = append(progress, entry)
	}
	return progress, nil
}

// --- Expiration ---

func (r *repository) ExpireChallenges() error {
	_, err := r.db.Exec(`
		UPDATE challenges
		SET status = 'expired', updated_at = datetime('now')
		WHERE status = 'active'
		AND expires_at IS NOT NULL
		AND datetime(expires_at) < datetime('now')
	`)
	return err
}

// --- Helpers ---

func (r *repository) listQuery(query string, args ...interface{}) ([]*domain.Challenge, error) {
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var challenges []*domain.Challenge
	for rows.Next() {
		ch := &domain.Challenge{}
		err := rows.Scan(
			&ch.ID, &ch.CoachID, &ch.Title, &ch.Description,
			&ch.ExerciseType, &ch.VideoURL, &ch.DurationMinutes, &ch.Calories,
			&ch.TargetSets, &ch.TargetReps, &ch.ScoringType, &ch.DifficultyLevel,
			&ch.MaxAttempts, &ch.Status, &ch.StartDate, &ch.EndDate, &ch.ExpiresAt,
			&ch.CreatedAt, &ch.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		ch.DaysLeft = calcDaysLeft(ch.EndDate)
		ch.IsUrgent = ch.DaysLeft <= 1 && ch.DaysLeft > 0
		challenges = append(challenges, ch)
	}
	return challenges, nil
}

func (r *repository) listAttempts(query string, args ...interface{}) ([]*domain.ChallengeAttempt, error) {
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attempts []*domain.ChallengeAttempt
	for rows.Next() {
		a := &domain.ChallengeAttempt{}
		var consentAt, completedAt sql.NullTime
		err := rows.Scan(
			&a.ID, &a.ChallengeID, &a.AthleteID, &a.AttemptNumber,
			&consentAt, &a.VideoConsent, &a.PhotoConsent,
			&a.VideoURL, &a.FormScore, &a.DepthScore, &a.AlignmentScore, &a.TempoScore,
			&a.SetsCompleted, &a.RepsCompleted, &a.TotalVolume, &a.Notes, &a.Status,
			&completedAt, &a.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if consentAt.Valid {
			a.ConsentGivenAt = &consentAt.Time
		}
		if completedAt.Valid {
			a.CompletedAt = &completedAt.Time
		}
		attempts = append(attempts, a)
	}
	return attempts, nil
}

func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func nullTime(t *time.Time) sql.NullTime {
	if t == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: *t, Valid: true}
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func calcDaysLeft(endDate string) int {
	if endDate == "" {
		return 0
	}
	end, err := time.Parse("2006-01-02", endDate[:10])
	if err != nil {
		return 0
	}
	days := int(time.Until(end).Hours() / 24)
	if days < 0 {
		return 0
	}
	return days
}
