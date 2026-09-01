package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Repository implements user.Repository using database/sql with Turso/libsql.
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new user repository with the given database connection.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetByID retrieves a user by their unique identifier.
func (r *Repository) GetByID(ctx context.Context, id string) (*user.User, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, role, is_active, created_at, updated_at
		 FROM users WHERE id = ?`, id)

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
	row := r.db.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, role, is_active, created_at, updated_at
		 FROM users WHERE email = ?`, email)

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
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO users (id, email, name, avatar_url, role, is_active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
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
	result, err := r.db.ExecContext(ctx,
		`UPDATE users SET email = ?, name = ?, avatar_url = ?, role = ?, is_active = ?,
		 updated_at = datetime('now') WHERE id = ?`,
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
	row := r.db.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, specializations, certifications, bio,
		 experience_years, max_athletes, is_accepting_athletes, is_active, created_at, updated_at
		 FROM coaches WHERE id = ?`, userID)

	c := &user.Coach{}
	var avatarURL, specializations, certifications sql.NullString
	err := row.Scan(&c.ID, &c.Email, &c.Name, &avatarURL, &specializations, &certifications,
		&c.Bio, &c.ExperienceYears, &c.MaxAthletes, &c.IsAcceptingAthletes, &c.IsActive,
		&c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, errors.NotFound("Coach", userID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get coach: %w", err)
	}
	if avatarURL.Valid {
		c.AvatarURL = avatarURL.String
	}
	c.Specializations = parseJSONArray(specializations)
	c.Certifications = parseJSONArray(certifications)
	return c, nil
}

// GetAthleteProfile retrieves the athlete profile for a user.
func (r *Repository) GetAthleteProfile(ctx context.Context, userID string) (*user.AthleteProfile, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, email, name, avatar_url, sport, experience_level, height_cm, weight_kg,
		 emergency_contact, emergency_phone, modality, schedule_days, schedule_time,
		 is_active, created_at, updated_at
		 FROM athlete_profiles WHERE id = ?`, userID)

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
	result, err := r.db.ExecContext(ctx,
		`UPDATE athlete_profiles SET email = ?, name = ?, avatar_url = ?, sport = ?,
		 experience_level = ?, height_cm = ?, weight_kg = ?, emergency_contact = ?,
		 emergency_phone = ?, modality = ?, schedule_days = ?, schedule_time = ?,
		 updated_at = datetime('now') WHERE id = ?`,
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
	rows, err := r.db.QueryContext(ctx,
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
	rows, err := r.db.QueryContext(ctx,
		`SELECT ap.id, ap.email, ap.name, ap.avatar_url, ap.sport, ap.experience_level,
		 ap.height_cm, ap.weight_kg, ap.emergency_contact, ap.emergency_phone,
		 ap.is_active, ap.created_at, ap.updated_at
		 FROM athlete_profiles ap
		 INNER JOIN coach_athlete_links cal ON ap.id = cal.athlete_id
		 WHERE cal.coach_id = ? AND cal.status = 'active' AND ap.is_active = 1`, coachID)
	if err != nil {
		return nil, fmt.Errorf("failed to list athletes by coach: %w", err)
	}
	defer rows.Close()

	var athletes []*user.AthleteProfile
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
