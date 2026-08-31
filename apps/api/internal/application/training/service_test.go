package training

import (
	"context"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// mockExerciseRepository is a test double for training.ExerciseRepository.
type mockExerciseRepository struct {
	exercises []*training.ExerciseEntry
	total     int
	createErr error
}

func (m *mockExerciseRepository) List(ctx context.Context, filter training.ExerciseFilter, offset, limit int) ([]*training.ExerciseEntry, int, error) {
	if m.createErr != nil {
		return nil, 0, m.createErr
	}
	return m.exercises, m.total, nil
}

func (m *mockExerciseRepository) GetByID(ctx context.Context, id string) (*training.ExerciseEntry, error) {
	for _, e := range m.exercises {
		if e.ID == id {
			return e, nil
		}
	}
	return nil, training.ErrNotFound
}

func (m *mockExerciseRepository) Create(ctx context.Context, exercise *training.ExerciseEntry) error {
	return m.createErr
}

// mockWorkoutRepository is a test double for training.WorkoutRepository.
type mockWorkoutRepository struct {
	templates    []*training.WorkoutTemplate
	assignments  []*training.AssignedWorkout
	detail       *training.WorkoutDetail
	createErr    error
	assignErr    error
	logSetErr    error
	detailErr    error
}

func (m *mockWorkoutRepository) ListTemplates(ctx context.Context, coachID string) ([]*training.WorkoutTemplate, error) {
	return m.templates, nil
}

func (m *mockWorkoutRepository) GetTemplate(ctx context.Context, id string) (*training.WorkoutTemplate, error) {
	for _, t := range m.templates {
		if t.ID == id {
			return t, nil
		}
	}
	return nil, training.ErrNotFound
}

func (m *mockWorkoutRepository) CreateTemplate(ctx context.Context, template *training.WorkoutTemplate) error {
	return m.createErr
}

func (m *mockWorkoutRepository) AssignWorkout(ctx context.Context, assigned *training.AssignedWorkout) error {
	return m.assignErr
}

func (m *mockWorkoutRepository) ListAssignedWorkouts(ctx context.Context, athleteID string) ([]*training.AssignedWorkout, error) {
	return m.assignments, nil
}

func (m *mockWorkoutRepository) GetAssignedWorkout(ctx context.Context, id string) (*training.AssignedWorkout, error) {
	for _, a := range m.assignments {
		if a.ID == id {
			return a, nil
		}
	}
	return nil, training.ErrNotFound
}

func (m *mockWorkoutRepository) LogWorkoutSet(ctx context.Context, set *training.WorkoutSet, workoutID, athleteID string) (*training.WorkoutSet, error) {
	if m.logSetErr != nil {
		return nil, m.logSetErr
	}
	set.ID = "mock-set-id"
	set.SessionID = "mock-session-id"
	return set, nil
}

func (m *mockWorkoutRepository) GetAssignedWorkoutDetail(ctx context.Context, id string) (*training.WorkoutDetail, error) {
	if m.detailErr != nil {
		return nil, m.detailErr
	}
	if m.detail != nil {
		return m.detail, nil
	}
	for _, a := range m.assignments {
		if a.ID == id {
			return &training.WorkoutDetail{Workout: a}, nil
		}
	}
	return nil, training.ErrNotFound
}

func (m *mockWorkoutRepository) GetWorkoutSession(ctx context.Context, sessionID string) (*training.WorkoutSession, error) {
	return nil, training.ErrNotFound
}

func (m *mockWorkoutRepository) CreateWorkoutSession(ctx context.Context, workoutID, athleteID string) (*training.WorkoutSession, error) {
	return &training.WorkoutSession{ID: "mock-session-id", WorkoutID: workoutID, AthleteID: athleteID}, nil
}

func (m *mockWorkoutRepository) CompleteSession(ctx context.Context, sessionID string, durationSeconds int) error {
	return nil
}

func (m *mockWorkoutRepository) GetPrescription(ctx context.Context, workoutID string) ([]training.WorkoutExercise, error) {
	return nil, nil
}

func (m *mockWorkoutRepository) ListAssignedWorkoutsByCoach(ctx context.Context, coachID string) ([]*training.AssignedWorkout, error) {
	return m.assignments, nil
}

func (m *mockWorkoutRepository) UpdateAssignedWorkout(ctx context.Context, id string, aw *training.AssignedWorkout) error {
	return nil
}

func (m *mockWorkoutRepository) DeleteAssignedWorkout(ctx context.Context, id string) error {
	return nil
}

func (m *mockWorkoutRepository) DeleteTemplate(ctx context.Context, id string) error {
	return nil
}

func (m *mockWorkoutRepository) UpdateTemplate(ctx context.Context, template *training.WorkoutTemplate) error {
	return m.createErr
}

// mockProgressRepository is a test double for training.ProgressRepository.
type mockProgressRepository struct {
	entries []*training.ProgressEntry
}

func (m *mockProgressRepository) GetProgress(ctx context.Context, athleteID string, dateRange training.ProgressDateRange) ([]*training.ProgressEntry, error) {
	return m.entries, nil
}

// mockTrainingSessionRepository is a test double for training.TrainingSessionRepository.
type mockTrainingSessionRepository struct {
	sessions []*training.TrainingSession
}

func (m *mockTrainingSessionRepository) Create(ctx context.Context, session *training.TrainingSession) error {
	return nil
}

func (m *mockTrainingSessionRepository) List(ctx context.Context, coachID, athleteID string) ([]*training.TrainingSession, error) {
	return m.sessions, nil
}

// Test helper to create a service with mocks.
func newTestService() (*Service, *mockExerciseRepository, *mockWorkoutRepository, *mockProgressRepository) {
	exerciseRepo := &mockExerciseRepository{}
	workoutRepo := &mockWorkoutRepository{}
	progressRepo := &mockProgressRepository{}
	sessionRepo := &mockTrainingSessionRepository{}
	return NewService(exerciseRepo, workoutRepo, progressRepo, sessionRepo), exerciseRepo, workoutRepo, progressRepo
}

// TestListExercises verifies that ListExercises returns paginated results.
func TestListExercises(t *testing.T) {
	svc, exerciseRepo, _, _ := newTestService()

	exerciseRepo.exercises = []*training.ExerciseEntry{
		{ID: "1", Name: "Bench Press"},
		{ID: "2", Name: "Squat"},
	}
	exerciseRepo.total = 2

	exercises, total, err := svc.ListExercises(context.Background(), 1, 20, training.ExerciseFilter{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 2 {
		t.Errorf("expected total 2, got %d", total)
	}
	if len(exercises) != 2 {
		t.Errorf("expected 2 exercises, got %d", len(exercises))
	}
}

// TestGetExercise verifies that GetExercise returns a single exercise.
func TestGetExercise(t *testing.T) {
	svc, exerciseRepo, _, _ := newTestService()

	exerciseRepo.exercises = []*training.ExerciseEntry{
		{ID: "1", Name: "Bench Press"},
	}

	exercise, err := svc.GetExercise(context.Background(), "1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if exercise.Name != "Bench Press" {
		t.Errorf("expected name 'Bench Press', got '%s'", exercise.Name)
	}
}

// TestGetExerciseNotFound verifies that GetExercise returns an error for unknown IDs.
func TestGetExerciseNotFound(t *testing.T) {
	svc, _, _, _ := newTestService()

	_, err := svc.GetExercise(context.Background(), "unknown")
	if err == nil {
		t.Fatal("expected error for unknown exercise ID")
	}
}

// TestCreateExercise verifies that CreateExercise generates a slug and sets coach ID.
func TestCreateExercise(t *testing.T) {
	svc, _, _, _ := newTestService()

	req := dto.CreateExerciseRequest{
		Name: "My Custom Exercise",
		Mode: "reps",
	}

	exercise, err := svc.CreateExercise(context.Background(), "coach-123", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if exercise.Name != "My Custom Exercise" {
		t.Errorf("expected name 'My Custom Exercise', got '%s'", exercise.Name)
	}
	if exercise.CoachID == nil || *exercise.CoachID != "coach-123" {
		t.Errorf("expected coach_id 'coach-123', got %v", exercise.CoachID)
	}
	if !exercise.IsCustom {
		t.Error("expected is_custom to be true")
	}
	if exercise.Slug == "" {
		t.Error("expected slug to be generated")
	}
}

// TestCreateExerciseEmptyName verifies that CreateExercise rejects empty names.
func TestCreateExerciseEmptyName(t *testing.T) {
	svc, _, _, _ := newTestService()

	req := dto.CreateExerciseRequest{
		Name: "  ",
	}

	_, err := svc.CreateExercise(context.Background(), "coach-123", req)
	if err == nil {
		t.Fatal("expected error for empty exercise name")
	}
}

// TestListWorkoutTemplates verifies that ListWorkoutTemplates returns coach's templates.
func TestListWorkoutTemplates(t *testing.T) {
	svc, _, workoutRepo, _ := newTestService()

	workoutRepo.templates = []*training.WorkoutTemplate{
		{ID: "1", Name: "Strength Day"},
		{ID: "2", Name: "Hypertrophy Day"},
	}

	templates, err := svc.ListWorkoutTemplates(context.Background(), "coach-123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(templates) != 2 {
		t.Errorf("expected 2 templates, got %d", len(templates))
	}
}

// TestCreateWorkoutTemplate verifies that CreateWorkoutTemplate creates a template with exercises.
func TestCreateWorkoutTemplate(t *testing.T) {
	svc, _, _, _ := newTestService()

	req := dto.CreateWorkoutTemplateRequest{
		Name: "Push Day",
		Exercises: []dto.CreateWorkoutExerciseRequest{
			{Name: "Bench Press", Sets: 3, Reps: 10},
			{Name: "Overhead Press", Sets: 3, Reps: 8},
		},
	}

	template, err := svc.CreateWorkoutTemplate(context.Background(), "coach-123", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if template.Name != "Push Day" {
		t.Errorf("expected name 'Push Day', got '%s'", template.Name)
	}
	if template.CoachID != "coach-123" {
		t.Errorf("expected coach_id 'coach-123', got '%s'", template.CoachID)
	}
	if len(template.Exercises) != 2 {
		t.Errorf("expected 2 exercises, got %d", len(template.Exercises))
	}
}

// TestAssignWorkout verifies that AssignWorkout creates an assignment.
func TestAssignWorkout(t *testing.T) {
	svc, _, workoutRepo, _ := newTestService()

	workoutRepo.templates = []*training.WorkoutTemplate{
		{ID: "template-1", CoachID: "coach-123", Name: "Push Day"},
	}

	req := dto.AssignWorkoutRequest{
		AthleteID:   "athlete-1",
		TemplateID:  "template-1",
		StartDate:   "2026-01-01",
		EndDate:     "2026-01-31",
		DaysOfWeek:  []int{1, 3, 5},
	}

	assigned, err := svc.AssignWorkout(context.Background(), "coach-123", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if assigned.AthleteID != "athlete-1" {
		t.Errorf("expected athlete_id 'athlete-1', got '%s'", assigned.AthleteID)
	}
	if assigned.ContentName != "Push Day" {
		t.Errorf("expected content_name 'Push Day', got '%s'", assigned.ContentName)
	}
}

// TestAssignWorkoutWrongCoach verifies that a coach cannot assign another coach's template.
func TestAssignWorkoutWrongCoach(t *testing.T) {
	svc, _, workoutRepo, _ := newTestService()

	workoutRepo.templates = []*training.WorkoutTemplate{
		{ID: "template-1", CoachID: "other-coach", Name: "Push Day"},
	}

	req := dto.AssignWorkoutRequest{
		AthleteID:  "athlete-1",
		TemplateID: "template-1",
	}

	_, err := svc.AssignWorkout(context.Background(), "coach-123", req)
	if err == nil {
		t.Fatal("expected error when assigning another coach's template")
	}
}

// TestGetAssignedWorkouts verifies that GetAssignedWorkouts returns athlete's workouts.
func TestGetAssignedWorkouts(t *testing.T) {
	svc, _, workoutRepo, _ := newTestService()

	workoutRepo.assignments = []*training.AssignedWorkout{
		{ID: "1", AthleteID: "athlete-1", ContentName: "Push Day"},
	}

	workouts, err := svc.GetAssignedWorkouts(context.Background(), "athlete-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(workouts) != 1 {
		t.Errorf("expected 1 workout, got %d", len(workouts))
	}
}

// TestLogWorkoutSet verifies that LogWorkoutSet creates a set log.
func TestLogWorkoutSet(t *testing.T) {
	svc, _, _, _ := newTestService()

	req := dto.LogWorkoutSetRequest{
		AthleteID:  "athlete-1",
		ExerciseID: "exercise-1",
		SetIndex:   1,
		WeightKg:   80,
		Reps:       10,
	}

	set, err := svc.LogWorkoutSet(context.Background(), "workout-1", req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if set.ExerciseID != "exercise-1" {
		t.Errorf("expected exercise_id 'exercise-1', got '%s'", set.ExerciseID)
	}
	if set.SetIndex != 1 {
		t.Errorf("expected set_index 1, got %d", set.SetIndex)
	}
}

// TestLogWorkoutSetInvalidIndex verifies that LogWorkoutSet rejects invalid set indices.
func TestLogWorkoutSetInvalidIndex(t *testing.T) {
	svc, _, _, _ := newTestService()

	req := dto.LogWorkoutSetRequest{
		ExerciseID: "exercise-1",
		SetIndex:   0,
	}

	_, err := svc.LogWorkoutSet(context.Background(), "workout-1", req)
	if err == nil {
		t.Fatal("expected error for invalid set_index")
	}
}

// TestGetProgress verifies that GetProgress returns progress entries.
func TestGetProgress(t *testing.T) {
	svc, _, _, progressRepo := newTestService()

	progressRepo.entries = []*training.ProgressEntry{
		{Date: "2026-01-01", WorkoutsAssigned: 2, WorkoutsCompleted: 1, CompletionRate: 50},
	}

	entries, err := svc.GetProgress(context.Background(), "athlete-1", training.ProgressDateRange{
		StartDate: "2026-01-01",
		EndDate:   "2026-01-31",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 1 {
		t.Errorf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].CompletionRate != 50 {
		t.Errorf("expected completion rate 50, got %f", entries[0].CompletionRate)
	}
}

// TestGetProgressMissingDates verifies that GetProgress rejects missing date range.
func TestGetProgressMissingDates(t *testing.T) {
	svc, _, _, _ := newTestService()

	_, err := svc.GetProgress(context.Background(), "athlete-1", training.ProgressDateRange{})
	if err == nil {
		t.Fatal("expected error for missing date range")
	}
}

// TestGetAssignedWorkoutDetailReturnsEnvelope verifies the detail service returns the
// {workout, exercises, session} carrier including the joined imageUrl.
func TestGetAssignedWorkoutDetailReturnsEnvelope(t *testing.T) {
	svc, _, workoutRepo, _ := newTestService()

	workoutRepo.detail = &training.WorkoutDetail{
		Workout: &training.AssignedWorkout{ID: "w1", ContentName: "Split", Status: "active", Progress: 0.4},
		Exercises: []training.WorkoutExercise{
			{Name: "Bench", WeightKg: 80, ImageURL: "https://img.example/bench.jpg"},
		},
		Session: &training.WorkoutSession{ID: "s1", WorkoutID: "w1", CurrentExerciseIndex: 2},
	}

	detail, err := svc.GetAssignedWorkoutDetail(context.Background(), "w1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if detail.Workout == nil || detail.Workout.ContentName != "Split" {
		t.Fatalf("expected workout contentName 'Split', got %#v", detail.Workout)
	}
	if len(detail.Exercises) != 1 || detail.Exercises[0].ImageURL != "https://img.example/bench.jpg" {
		t.Fatalf("expected joined imageUrl on exercise, got %#v", detail.Exercises)
	}
	if detail.Session == nil || detail.Session.CurrentExerciseIndex != 2 {
		t.Fatalf("expected resume session marker, got %#v", detail.Session)
	}
}
