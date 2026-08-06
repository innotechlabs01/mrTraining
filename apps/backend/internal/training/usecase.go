package training

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/mrtraining/backend/pkg/apperror"
)

type UseCases struct {
	workoutRepo WorkoutRepository
	programRepo ProgramRepository
	exRepo      ExerciseRepository
}

func NewUseCases(workoutRepo WorkoutRepository, programRepo ProgramRepository, exRepo ExerciseRepository) *UseCases {
	return &UseCases{
		workoutRepo: workoutRepo,
		programRepo: programRepo,
		exRepo:      exRepo,
	}
}

type CreateWorkoutCommand struct {
	Name          string
	Description   string
	SportType     string
	ScheduledDate string
	AthleteID     string
	ProgramID     *string
	Exercises     []WorkoutExerciseDTO
}

type WorkoutExerciseDTO struct {
	ExerciseID  string
	Section     string
	SortOrder   int
	Notes       string
	RestSeconds int
	Tempo       string
	Sets        []ExerciseSetDTO
}

type ExerciseSetDTO struct {
	SetNumber    int
	SetType      string
	PrescribedReps  *int
	PrescribedWeight *float64
	PrescribedRPE  *float64
}

type WorkoutResponse struct {
	ID           string
	Name         string
	Description  string
	SportType    string
	Status       string
	ScheduledDate string
	CoachNote     string
	Exercises    []WorkoutExerciseResponse
}

type WorkoutExerciseResponse struct {
	ID         string
	ExerciseID string
	Name       string
	Section    string
	Sets       []ExerciseSetResponse
}

type ExerciseSetResponse struct {
	SetNumber       int
	SetType         string
	PrescribedReps  *int
	PrescribedWeight *float64
	ActualReps      *int
	ActualWeight    *float64
	IsCompleted     bool
}

func (uc *UseCases) CreateWorkout(ctx context.Context, cmd CreateWorkoutCommand, coachID, orgID uuid.UUID) (*WorkoutResponse, error) {
	scheduledDate, err := time.Parse("2006-01-02", cmd.ScheduledDate)
	if err != nil {
		return nil, apperror.ErrInvalidInput("scheduled_date", "must be YYYY-MM-DD")
	}

	athleteID, err := uuid.Parse(cmd.AthleteID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("athlete_id", "must be a valid UUID")
	}

	var programID *uuid.UUID
	if cmd.ProgramID != nil {
		pid, err := uuid.Parse(*cmd.ProgramID)
		if err != nil {
			return nil, apperror.ErrInvalidInput("program_id", "must be a valid UUID")
		}
		programID = &pid
	}

	w := NewWorkout(cmd.Name, cmd.Description, cmd.SportType, scheduledDate, athleteID, orgID, &coachID)
	w.SetProgramID(programID)

	for _, exDTO := range cmd.Exercises {
		exID, err := uuid.Parse(exDTO.ExerciseID)
		if err != nil {
			return nil, apperror.ErrInvalidInput("exercises", "invalid exercise ID")
		}
		w.AddExercise(exID, exDTO.Section, exDTO.SortOrder, exDTO.Notes, exDTO.RestSeconds, exDTO.Tempo)
		for _, setDTO := range exDTO.Sets {
			w.AddSet(len(w.Exercises())-1, setDTO.SetNumber, setDTO.SetType, setDTO.PrescribedReps, setDTO.PrescribedWeight, setDTO.PrescribedRPE)
		}
	}

	if err := uc.workoutRepo.Save(ctx, w); err != nil {
		return nil, apperror.ErrInternal(err)
	}

	return toWorkoutResponse(w), nil
}

func (uc *UseCases) GetWorkout(ctx context.Context, workoutID, orgID string) (*WorkoutResponse, error) {
	wid, err := uuid.Parse(workoutID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("workout_id", "must be a valid UUID")
	}

	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("org_id", "must be a valid UUID")
	}

	w, err := uc.workoutRepo.FindByID(ctx, wid, orgUUID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}

	for _, ex := range w.Exercises() {
		for _, set := range ex.sets {
			_ = set
		}
	}

	return toWorkoutResponse(w), nil
}

func (uc *UseCases) CompleteWorkout(ctx context.Context, workoutID, orgID string, rpe int, notes string) (*WorkoutResponse, error) {
	wid, err := uuid.Parse(workoutID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("workout_id", "must be a valid UUID")
	}

	w, err := uc.workoutRepo.FindByID(ctx, wid, uuid.MustParse(orgID))
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}

	w.Complete(rpe, notes)

	if err := uc.workoutRepo.Save(ctx, w); err != nil {
		return nil, apperror.ErrInternal(err)
	}

	return toWorkoutResponse(w), nil
}

func (uc *UseCases) GetAthleteWorkouts(ctx context.Context, athleteID, orgID string, dateFrom, dateTo string) ([]*WorkoutResponse, error) {
	aid, err := uuid.Parse(athleteID)
	if err != nil {
		return nil, apperror.ErrInvalidInput("athlete_id", "must be a valid UUID")
	}

	start, err := time.Parse("2006-01-02", dateFrom)
	if err != nil {
		start = time.Now().AddDate(0, -3, 0)
	}

	end, err := time.Parse("2006-01-02", dateTo)
	if err != nil {
		end = time.Now()
	}

	workouts, err := uc.workoutRepo.FindByAthlete(ctx, aid, DateRangeFilter{Start: start, End: end})
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}

	var responses []*WorkoutResponse
	for _, w := range workouts {
		responses = append(responses, toWorkoutResponse(w))
	}

	return responses, nil
}

func toWorkoutResponse(w *Workout) *WorkoutResponse {
	var exs []WorkoutExerciseResponse
	for _, ex := range w.Exercises() {
		var sets []ExerciseSetResponse
		for _, s := range ex.sets {
			sets = append(sets, ExerciseSetResponse{
				SetNumber:        s.setNumber,
				SetType:          s.setType,
				PrescribedReps:   s.prescribedReps,
				PrescribedWeight: s.prescribedWeight,
				ActualReps:       s.actualReps,
				ActualWeight:     s.actualWeight,
				IsCompleted:      s.isCompleted,
			})
		}
		// In production, fetch exercise name from exercise library
		exs = append(exs, WorkoutExerciseResponse{
			ID:         ex.id.String(),
			ExerciseID: ex.exerciseID.String(),
			Name:       "Exercise", // Placeholder, would come from Exercise Library
			Section:    ex.section,
			Sets:       sets,
		})
	}

	return &WorkoutResponse{
		ID:           w.ID().String(),
		Name:         w.Name(),
		Description:  w.Description(),
		SportType:    w.SportType(),
		Status:       string(w.Status()),
		ScheduledDate: w.ScheduledDate().Format("2006-01-02"),
		CoachNote:     w.CoachNotes(),
		Exercises:    exs,
	}
}

func (uc *UseCases) GetPendingReviews(ctx context.Context, coachID, orgID uuid.UUID) ([]*WorkoutResponse, error) {
	workouts, err := uc.workoutRepo.FindPendingReview(ctx, coachID, orgID)
	if err != nil {
		return nil, apperror.ErrInternal(err)
	}

	var responses []*WorkoutResponse
	for _, w := range workouts {
		responses = append(responses, toWorkoutResponse(w))
	}

	return responses, nil
}
