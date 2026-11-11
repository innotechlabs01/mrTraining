package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// Repository implements user.Repository using database/sql with Turso/libsql.
type Repository struct {
	db   *sql.DB
	exec database.Executor
}

// NewRepository creates a new user repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, exec: db}
}

// SetExecutor injects a SQL executor (typically *sql.Tx from a UnitOfWork).
func (r *Repository) SetExecutor(exec database.Executor) {
	r.exec = exec
}

// WithExecutor returns a new Repository instance sharing the same connection
// pool but using the given executor for all queries.
func (r *Repository) WithExecutor(exec database.Executor) user.Repository {
	return &Repository{
		db:   r.db,
		exec: exec,
	}
}

// isTx reports whether the current executor is a *sql.Tx.
func (r *Repository) isTx() bool {
	_, ok := r.exec.(*sql.Tx)
	return ok
}

// GetByID retrieves a user by their unique identifier.
func (r *Repository) GetByID(ctx context.Context, id string) (*user.User, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, role, is_active, created_at, updated_at
		 FROM users WHERE id = $1`, id)

	u := &user.User{}
	var avatarURL sql.NullString
	err := row.Scan(&u.ID, &u.Email, &u.Name, &avatarURL, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("User", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	if avatarURL.Valid {
		u.AvatarURL = avatarURL.String
	}
	return u, nil
}

// GetByEmail retrieves a user by their email address.
func (r *Repository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, role, is_active, created_at, updated_at
		 FROM users WHERE email = $1`, email)

	u := &user.User{}
	var avatarURL sql.NullString
	err := row.Scan(&u.ID, &u.Email, &u.Name, &avatarURL, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("User", email)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	if avatarURL.Valid {
		u.AvatarURL = avatarURL.String
	}
	return u, nil
}

// Create inserts a new user record.
func (r *Repository) Create(ctx context.Context, u *user.User) error {
	_, err := r.exec.ExecContext(ctx,
		`INSERT INTO users (id, email, name, avatar_url, role, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
		u.ID, u.Email, u.Name, nullString(u.AvatarURL), u.Role, u.IsActive)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "duplicate") {
			return errors.Conflict(fmt.Sprintf("user with email %s already exists", u.Email))
		}
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// Update modifies an existing user record.
func (r *Repository) Update(ctx context.Context, u *user.User) error {
	result, err := r.exec.ExecContext(ctx,
		`UPDATE users SET email = $1, name = $2, avatar_url = $3, role = $4, is_active = $5,
		 updated_at = NOW() WHERE id = $6`,
		u.Email, u.Name, nullString(u.AvatarURL), u.Role, u.IsActive, u.ID)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("User", u.ID)
	}
	return nil
}

// GetCoach retrieves the coach profile for a user.
func (r *Repository) GetCoach(ctx context.Context, userID string) (*user.Coach, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, coach_code, specializations, certifications, bio,
		 experience_years, max_athletes, is_accepting_athletes, is_active, created_at, updated_at,
		 sports, team_name, team_size, age_group, experience_level
		 FROM coaches WHERE id = $1`, userID)

	c := &user.Coach{}
	var avatarURL, specializations, certifications, coachCode sql.NullString
	var sports, teamName, ageGroup, experienceLevel sql.NullString
	var teamSize sql.NullInt64
	err := row.Scan(&c.ID, &c.Email, &c.Name, &avatarURL, &coachCode, &specializations, &certifications,
		&c.Bio, &c.ExperienceYears, &c.MaxAthletes, &c.IsAcceptingAthletes, &c.IsActive,
		&c.CreatedAt, &c.UpdatedAt,
		&sports, &teamName, &teamSize, &ageGroup, &experienceLevel)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Coach", userID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get coach: %w", err)
	}
	if avatarURL.Valid {
		c.AvatarURL = avatarURL.String
	}
	if coachCode.Valid {
		c.CoachCode = coachCode.String
	}
	c.Specializations = parseJSONArray(specializations)
	c.Certifications = parseJSONArray(certifications)
	c.Sports = parseJSONArray(sports)
	if teamName.Valid {
		c.TeamName = teamName.String
	}
	if teamSize.Valid {
		c.TeamSize = int(teamSize.Int64)
	}
	if ageGroup.Valid {
		c.AgeGroup = ageGroup.String
	}
	if experienceLevel.Valid {
		c.ExperienceLevel = experienceLevel.String
	}

	// Self-heal legacy coach rows created before coach_code provisioning:
	// generate a unique code and persist it so every coach keeps exactly one
	// stable invite code after their first sign-in.
	if c.CoachCode == "" {
		code, cerr := r.uniqueCoachCode(ctx)
		if cerr != nil {
			return c, nil // never break the login read path on backfill failure
		}
		_, uerr := r.exec.ExecContext(ctx,
			`UPDATE coaches SET coach_code = $1, updated_at = NOW()
			 WHERE id = $2 AND (coach_code IS NULL OR coach_code = '')`,
			code, userID)
		if uerr == nil {
			c.CoachCode = code
		}
	}
	return c, nil
}

// UpdateCoachOnboarding persists the answers collected by the coach
// onboarding flow. Only the onboarding columns are touched so a concurrent
// profile edit (bio, avatar, max athletes) is never overwritten.
func (r *Repository) UpdateCoachOnboarding(ctx context.Context, userID string, c *user.Coach) error {
	result, err := r.exec.ExecContext(ctx,
		`UPDATE coaches SET sports = $1, specializations = $2, certifications = $3,
		 experience_level = $4, team_name = $5, team_size = $6, age_group = $7,
		 updated_at = NOW()
		 WHERE id = $8`,
		mustJSON(c.Sports), mustJSON(c.Specializations), mustJSON(c.Certifications),
		c.ExperienceLevel, c.TeamName, c.TeamSize, c.AgeGroup, userID)
	if err != nil {
		return fmt.Errorf("update coach onboarding: %w", err)
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return errors.NotFound("Coach", userID)
	}
	return nil
}

// mustJSON marshals a string slice for a JSON text column. A marshalling
// failure is impossible for []string, so the fallback keeps the column valid.
func mustJSON(v []string) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	return string(b)
}

// uniqueCoachCode generates a coach code that is not taken by any active coach.
func (r *Repository) uniqueCoachCode(ctx context.Context) (string, error) {
	for attempt := 0; attempt < 20; attempt++ {
		code := GenerateCoachCode()
		var one int
		err := r.exec.QueryRowContext(ctx,
			`SELECT 1 FROM coaches WHERE UPPER(coach_code) = $1 AND is_active = 1`, code).Scan(&one)
		if err == sql.ErrNoRows {
			return code, nil
		}
		if err != nil {
			return "", fmt.Errorf("check coach code uniqueness: %w", err)
		}
	}
	return "", fmt.Errorf("could not find a unique coach code after 20 attempts")
}

// GetAthleteProfile retrieves the athlete profile for a user.
func (r *Repository) GetAthleteProfile(ctx context.Context, userID string) (*user.AthleteProfile, error) {
	row := r.exec.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, sport, experience_level, height_cm, weight_kg,
		 emergency_contact, emergency_phone, modality, schedule_days, schedule_time,
		 is_active, created_at, updated_at
		 FROM athlete_profiles WHERE id = $1`, userID)

	ap := &user.AthleteProfile{}
	var avatarURL, sport, experienceLevel, emergencyContact, emergencyPhone sql.NullString
	var modality, scheduleDays, scheduleTime sql.NullString
	err := row.Scan(&ap.ID, &ap.Email, &ap.Name, &avatarURL, &sport, &experienceLevel,
		&ap.HeightCm, &ap.WeightKg, &emergencyContact, &emergencyPhone, &modality,
		&scheduleDays, &scheduleTime, &ap.IsActive, &ap.CreatedAt, &ap.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("AthleteProfile", userID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get athlete profile: %w", err)
	}
	if avatarURL.Valid {
		ap.AvatarURL = avatarURL.String
	}
	if sport.Valid {
		ap.Sport = sport.String
	}
	if experienceLevel.Valid {
		ap.ExperienceLevel = experienceLevel.String
	}
	if emergencyContact.Valid {
		ap.EmergencyContact = emergencyContact.String
	}
	if emergencyPhone.Valid {
		ap.EmergencyPhone = emergencyPhone.String
	}
	if modality.Valid {
		ap.Modality = modality.String
	}
	if scheduleDays.Valid {
		ap.ScheduleDays = scheduleDays.String
	}
	if scheduleTime.Valid {
		ap.ScheduleTime = scheduleTime.String
	}
	return ap, nil
}

// UpdateAthleteProfile updates the athlete's extended profile fields.
func (r *Repository) UpdateAthleteProfile(ctx context.Context, userID string, ap *user.AthleteProfile) error {
	result, err := r.exec.ExecContext(ctx,
		`UPDATE athlete_profiles SET email = $1, name = $2, avatar_url = $3, sport = $4,
		 experience_level = $5, height_cm = $6, weight_kg = $7, emergency_contact = $8,
		 emergency_phone = $9, modality = $10, schedule_days = $11, schedule_time = $12,
		 updated_at = NOW() WHERE id = $13`,
		ap.Email, ap.Name, nullString(ap.AvatarURL), ap.Sport, ap.ExperienceLevel,
		ap.HeightCm, ap.WeightKg, nullString(ap.EmergencyContact), nullString(ap.EmergencyPhone),
		ap.Modality, ap.ScheduleDays, ap.ScheduleTime, userID)
	if err != nil {
		return fmt.Errorf("failed to update athlete profile: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return errors.NotFound("AthleteProfile", userID)
	}
	return nil
}

// ListCoaches retrieves all active coaches.
func (r *Repository) ListCoaches(ctx context.Context) ([]*user.Coach, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT id, email, name, avatar_url, specializations, certifications, bio,
		 experience_years, max_athletes, is_accepting_athletes, is_active, created_at, updated_at
		 FROM coaches WHERE is_active = 1`)
	if err != nil {
		return nil, fmt.Errorf("failed to list coaches: %w", err)
	}
	defer rows.Close()

	var coaches []*user.Coach
	for rows.Next() {
		c := &user.Coach{}
		var avatarURL, specializations, certifications sql.NullString
		if err := rows.Scan(&c.ID, &c.Email, &c.Name, &avatarURL, &specializations, &certifications,
			&c.Bio, &c.ExperienceYears, &c.MaxAthletes, &c.IsAcceptingAthletes, &c.IsActive,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan coach: %w", err)
		}
		if avatarURL.Valid {
			c.AvatarURL = avatarURL.String
		}
		c.Specializations = parseJSONArray(specializations)
		c.Certifications = parseJSONArray(certifications)
		coaches = append(coaches, c)
	}
	return coaches, nil
}

// ListAthletesByCoach retrieves all athletes linked to a specific coach.
func (r *Repository) ListAthletesByCoach(ctx context.Context, coachID string) ([]*user.AthleteProfile, error) {
	rows, err := r.exec.QueryContext(ctx,
		`SELECT ap.id, ap.email, ap.name, ap.avatar_url, ap.sport, ap.experience_level,
		 ap.height_cm, ap.weight_kg, ap.emergency_contact, ap.emergency_phone,
		 ap.is_active, ap.created_at, ap.updated_at
		 FROM athlete_profiles ap
		 INNER JOIN coach_athlete_links cal ON ap.id = cal.athlete_id
		 WHERE cal.coach_id = $1 AND cal.status = 'active' AND ap.is_active = 1`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list athletes by coach: %w", err)
	}
	defer rows.Close()

	athletes := make([]*user.AthleteProfile, 0)
	for rows.Next() {
		ap := &user.AthleteProfile{}
		var avatarURL, sport, experienceLevel, emergencyContact, emergencyPhone sql.NullString
		if err := rows.Scan(&ap.ID, &ap.Email, &ap.Name, &avatarURL, &sport, &experienceLevel,
			&ap.HeightCm, &ap.WeightKg, &emergencyContact, &emergencyPhone, &ap.IsActive,
			&ap.CreatedAt, &ap.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan athlete profile: %w", err)
		}
		if avatarURL.Valid {
			ap.AvatarURL = avatarURL.String
		}
		if sport.Valid {
			ap.Sport = sport.String
		}
		if experienceLevel.Valid {
			ap.ExperienceLevel = experienceLevel.String
		}
		if emergencyContact.Valid {
			ap.EmergencyContact = emergencyContact.String
		}
		if emergencyPhone.Valid {
			ap.EmergencyPhone = emergencyPhone.String
		}
		athletes = append(athletes, ap)
	}
	return athletes, nil
}

// parseJSONArray parses a nullable JSON array string (e.g., '["a","b"]') into a string slice.
func parseJSONArray(nullStr sql.NullString) []string {
	if !nullStr.Valid || nullStr.String == "" {
		return []string{}
	}
	var result []string
	if err := json.Unmarshal([]byte(nullStr.String), &result); err != nil {
		return []string{}
	}
	return result
}

// nullString converts an empty string to sql.NullString with Valid=false.
func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

// IsActiveCoach verifies that the given user ID corresponds to an active coach
// row in the coaches table. Returns false if no such row exists.
func (r *Repository) IsActiveCoach(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.exec.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM coaches WHERE id = $1 AND is_active = 1)`, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check active coach: %w", err)
	}
	return exists, nil
}

// AthleteHasActiveCoach verifies that an active coach_athlete_links row exists
// between the athlete and the requested coach. Returns false if no such row exists.
func (r *Repository) AthleteHasActiveCoach(ctx context.Context, athleteID, coachID string) (bool, error) {
	var exists bool
	err := r.exec.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM coach_athlete_links WHERE coach_id = $1 AND athlete_id = $2 AND status = 'active')`,
		coachID, athleteID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check coach-athlete relationship: %w", err)
	}
	return exists, nil
}
