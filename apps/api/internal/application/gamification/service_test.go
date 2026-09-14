package gamification

import (
	"context"
	"testing"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/domain/gamification"
)

// mockRepository implements gamification.Repository for testing.
type mockRepository struct {
	streaks     map[string]*gamification.Streak
	workoutDays map[string][]*gamification.WorkoutDay
	badges      map[string][]*gamification.Badge
	prs         map[string][]*gamification.PersonalRecord
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		streaks:     make(map[string]*gamification.Streak),
		workoutDays: make(map[string][]*gamification.WorkoutDay),
		badges:      make(map[string][]*gamification.Badge),
		prs:         make(map[string][]*gamification.PersonalRecord),
	}
}

func (m *mockRepository) GetStreak(ctx context.Context, athleteID string) (*gamification.Streak, error) {
	return m.streaks[athleteID], nil
}

func (m *mockRepository) UpsertStreak(ctx context.Context, streak *gamification.Streak) error {
	m.streaks[streak.AthleteID] = streak
	return nil
}

func (m *mockRepository) LogWorkoutDay(ctx context.Context, day *gamification.WorkoutDay) error {
	m.workoutDays[day.AthleteID] = append(m.workoutDays[day.AthleteID], day)
	return nil
}

func (m *mockRepository) ListWorkoutDays(ctx context.Context, athleteID string, since string) ([]*gamification.WorkoutDay, error) {
	days := m.workoutDays[athleteID]
	if since != "" {
		var filtered []*gamification.WorkoutDay
		for _, d := range days {
			if d.WorkoutDate >= since {
				filtered = append(filtered, d)
			}
		}
		return filtered, nil
	}
	return days, nil
}

func (m *mockRepository) ListBadges(ctx context.Context, athleteID string) ([]*gamification.Badge, error) {
	return m.badges[athleteID], nil
}

func (m *mockRepository) UpsertBadge(ctx context.Context, badge *gamification.Badge) error {
	m.badges[badge.AthleteID] = append(m.badges[badge.AthleteID], badge)
	return nil
}

func (m *mockRepository) ListPRs(ctx context.Context, athleteID string) ([]*gamification.PersonalRecord, error) {
	return m.prs[athleteID], nil
}

func (m *mockRepository) GetPR(ctx context.Context, athleteID, exerciseID string) (*gamification.PersonalRecord, error) {
	for _, pr := range m.prs[athleteID] {
		if pr.ExerciseID == exerciseID {
			return pr, nil
		}
	}
	return nil, nil
}

func (m *mockRepository) UpsertPR(ctx context.Context, pr *gamification.PersonalRecord) error {
	// Update existing or add new
	for i, existing := range m.prs[pr.AthleteID] {
		if existing.ExerciseID == pr.ExerciseID {
			m.prs[pr.AthleteID][i] = pr
			return nil
		}
	}
	m.prs[pr.AthleteID] = append(m.prs[pr.AthleteID], pr)
	return nil
}

// Tests

func TestGetStreak_NewUser(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	streak, err := svc.GetStreak(context.Background(), "athlete-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if streak.CurrentStreak != 0 {
		t.Errorf("expected current streak 0, got %d", streak.CurrentStreak)
	}
	if streak.LongestStreak != 0 {
		t.Errorf("expected longest streak 0, got %d", streak.LongestStreak)
	}
}

func TestLogWorkoutDay_SingleDay(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	today := time.Now().UTC().Format("2006-01-02")
	streak, err := svc.LogWorkoutDay(context.Background(), "athlete-1", today, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if streak.CurrentStreak != 1 {
		t.Errorf("expected current streak 1, got %d", streak.CurrentStreak)
	}
}

func TestLogWorkoutDay_ConsecutiveDays(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	today := time.Now().UTC()
	yesterday := today.AddDate(0, 0, -1)
	twoDaysAgo := today.AddDate(0, 0, -2)

	// Log three consecutive days
	svc.LogWorkoutDay(context.Background(), "athlete-1", twoDaysAgo.Format("2006-01-02"), nil)
	svc.LogWorkoutDay(context.Background(), "athlete-1", yesterday.Format("2006-01-02"), nil)
	streak, err := svc.LogWorkoutDay(context.Background(), "athlete-1", today.Format("2006-01-02"), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if streak.CurrentStreak != 3 {
		t.Errorf("expected current streak 3, got %d", streak.CurrentStreak)
	}
	if streak.LongestStreak != 3 {
		t.Errorf("expected longest streak 3, got %d", streak.LongestStreak)
	}
}

func TestLogWorkoutDay_DuplicateDay(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	today := time.Now().UTC().Format("2006-01-02")
	svc.LogWorkoutDay(context.Background(), "athlete-1", today, nil)
	streak, err := svc.LogWorkoutDay(context.Background(), "athlete-1", today, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Should not increase streak
	if streak.CurrentStreak != 1 {
		t.Errorf("expected current streak 1 (no duplicate), got %d", streak.CurrentStreak)
	}
}

func TestRecordPR_NewPR(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	pr, isNew, err := svc.RecordPR(context.Background(), "athlete-1", "exercise-1", "Bench Press", 100, "kg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !isNew {
		t.Error("expected isNewPR to be true")
	}
	if pr.BestValue != 100 {
		t.Errorf("expected best value 100, got %f", pr.BestValue)
	}
}

func TestRecordPR_BetterThanExisting(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	svc.RecordPR(context.Background(), "athlete-1", "exercise-1", "Bench Press", 100, "kg")
	pr, isNew, err := svc.RecordPR(context.Background(), "athlete-1", "exercise-1", "Bench Press", 120, "kg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !isNew {
		t.Error("expected isNewPR to be true")
	}
	if pr.BestValue != 120 {
		t.Errorf("expected best value 120, got %f", pr.BestValue)
	}
	if pr.PreviousBest == nil || *pr.PreviousBest != 100 {
		t.Error("expected previous best to be 100")
	}
}

func TestRecordPR_WorseThanExisting(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	svc.RecordPR(context.Background(), "athlete-1", "exercise-1", "Bench Press", 100, "kg")
	pr, isNew, err := svc.RecordPR(context.Background(), "athlete-1", "exercise-1", "Bench Press", 80, "kg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if isNew {
		t.Error("expected isNewPR to be false")
	}
	if pr.BestValue != 100 {
		t.Errorf("expected best value to remain 100, got %f", pr.BestValue)
	}
}

func TestCheckBadges_StreakBadge(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	// Create 3-day streak
	today := time.Now().UTC()
	svc.LogWorkoutDay(context.Background(), "athlete-1", today.AddDate(0, 0, -2).Format("2006-01-02"), nil)
	svc.LogWorkoutDay(context.Background(), "athlete-1", today.AddDate(0, 0, -1).Format("2006-01-02"), nil)
	svc.LogWorkoutDay(context.Background(), "athlete-1", today.Format("2006-01-02"), nil)

	newBadges, err := svc.CheckBadges(context.Background(), "athlete-1", 0, 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should unlock streak-3 badge
	found := false
	for _, b := range newBadges {
		if b.BadgeID == "streak-3" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected streak-3 badge to be unlocked")
	}
}

func TestListPRs(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)

	svc.RecordPR(context.Background(), "athlete-1", "exercise-1", "Bench Press", 100, "kg")
	svc.RecordPR(context.Background(), "athlete-1", "exercise-2", "Squat", 150, "kg")

	prs, err := svc.ListPRs(context.Background(), "athlete-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(prs) != 2 {
		t.Errorf("expected 2 PRs, got %d", len(prs))
	}
}

func TestGetBadgeDefinition(t *testing.T) {
	def, ok := GetBadgeDefinition("streak-3")
	if !ok {
		t.Fatal("expected badge to exist")
	}
	if def.Title != "Constancia" {
		t.Errorf("expected title 'Constancia', got '%s'", def.Title)
	}
	if def.Category != "streak" {
		t.Errorf("expected category 'streak', got '%s'", def.Category)
	}
}

func TestCalculateStreak(t *testing.T) {
	today := time.Now().UTC()

	tests := []struct {
		name    string
		dates   []string
		current int
		longest int
	}{
		{
			name:    "empty",
			dates:   []string{},
			current: 0,
			longest: 0,
		},
		{
			name:    "single day",
			dates:   []string{today.Format("2006-01-02")},
			current: 1,
			longest: 1,
		},
		{
			name: "three consecutive days",
			dates: []string{
				today.AddDate(0, 0, -2).Format("2006-01-02"),
				today.AddDate(0, 0, -1).Format("2006-01-02"),
				today.Format("2006-01-02"),
			},
			current: 3,
			longest: 3,
		},
		{
			name: "gap in middle",
			dates: []string{
				today.AddDate(0, 0, -3).Format("2006-01-02"),
				today.AddDate(0, 0, -2).Format("2006-01-02"),
				today.Format("2006-01-02"),
			},
			current: 1,
			longest: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			current, longest := calculateStreak(tt.dates)
			if current != tt.current {
				t.Errorf("expected current %d, got %d", tt.current, current)
			}
			if longest != tt.longest {
				t.Errorf("expected longest %d, got %d", tt.longest, longest)
			}
		})
	}
}
