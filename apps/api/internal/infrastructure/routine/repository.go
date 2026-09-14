package routine

import (
	"database/sql"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/routine"
)

type repository struct {
	db *sql.DB
}

// NewRepository creates a new routine repository.
func NewRepository(db *sql.DB) domain.Repository {
	return &repository{db: db}
}

func (r *repository) ListByAthleteID(athleteID string) ([]*domain.Routine, error) {
	query := `
		SELECT id, athlete_id, name, description, exercises, duration_min, created_at, updated_at
		FROM athlete_routines
		WHERE athlete_id = ?
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, athleteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var routines []*domain.Routine
	for rows.Next() {
		rt := &domain.Routine{}
		err := rows.Scan(
			&rt.ID, &rt.AthleteID, &rt.Name, &rt.Description,
			&rt.Exercises, &rt.DurationMin, &rt.CreatedAt, &rt.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		routines = append(routines, rt)
	}
	return routines, nil
}

func (r *repository) GetByID(id string) (*domain.Routine, error) {
	query := `
		SELECT id, athlete_id, name, description, exercises, duration_min, created_at, updated_at
		FROM athlete_routines
		WHERE id = ?
	`

	rt := &domain.Routine{}
	err := r.db.QueryRow(query, id).Scan(
		&rt.ID, &rt.AthleteID, &rt.Name, &rt.Description,
		&rt.Exercises, &rt.DurationMin, &rt.CreatedAt, &rt.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return rt, nil
}

func (r *repository) Create(rt *domain.Routine) error {
	now := time.Now().UTC()
	query := `
		INSERT INTO athlete_routines (id, athlete_id, name, description, exercises, duration_min, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	if rt.ID == "" {
		rt.ID = rt.AthleteID + "-" + time.Now().Format("20060102150405")
	}
	rt.CreatedAt = now
	rt.UpdatedAt = now

	_, err := r.db.Exec(query,
		rt.ID, rt.AthleteID, rt.Name, rt.Description,
		rt.Exercises, rt.DurationMin, rt.CreatedAt, rt.UpdatedAt,
	)
	return err
}

func (r *repository) Update(rt *domain.Routine) error {
	query := `
		UPDATE athlete_routines
		SET name = ?, description = ?, exercises = ?, duration_min = ?, updated_at = ?
		WHERE id = ? AND athlete_id = ?
	`

	rt.UpdatedAt = time.Now().UTC()
	_, err := r.db.Exec(query,
		rt.Name, rt.Description, rt.Exercises, rt.DurationMin,
		rt.UpdatedAt, rt.ID, rt.AthleteID,
	)
	return err
}

func (r *repository) Delete(id, athleteID string) error {
	query := `DELETE FROM athlete_routines WHERE id = ? AND athlete_id = ?`
	_, err := r.db.Exec(query, id, athleteID)
	return err
}
