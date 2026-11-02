package running

import (
	"context"
	"os"
	"testing"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

func newTestDB(t *testing.T) *database.DB {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set for integration tests")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestIntegration_CreateTemplate_PostgreSQL(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-1",
		Name:      "Integration Template",
		Type:      domain.TemplateTypeIntervals,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}

	err := svc.CreateTemplate(ctx, template)
	if err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}
	if template.ID == "" {
		t.Error("expected template ID to be generated")
	}

	// Retrieve and verify
	got, err := svc.GetTemplate(ctx, template.ID)
	if err != nil {
		t.Fatalf("unexpected error getting template: %v", err)
	}
	if got.Name != "Integration Template" {
		t.Errorf("expected name=Integration Template, got %s", got.Name)
	}
	if got.CoachID != "coach-integration-1" {
		t.Errorf("expected coach_id=coach-integration-1, got %s", got.CoachID)
	}
	if got.Version != 1 {
		t.Errorf("expected version=1, got %d", got.Version)
	}
}

func TestIntegration_AssignTemplate_PostgreSQL(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-2",
		Name:      "Assign Test Template",
		Type:      domain.TemplateTypeIntervals,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := svc.CreateTemplate(ctx, template); err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}

	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:      template.ID,
		AthleteID:       "athlete-integration-1",
		CoachID:         "coach-integration-2",
		ScheduledDate:   now.Add(24 * time.Hour),
		Status:          domain.AssignmentStatusAssigned,
		AthleteInstructions: "Run easy today",
	}
	if err := svc.AssignTemplate(ctx, assignment); err != nil {
		t.Fatalf("unexpected error assigning template: %v", err)
	}
	if assignment.ID == "" {
		t.Error("expected assignment ID to be generated")
	}
	if assignment.Status != domain.AssignmentStatusAssigned {
		t.Errorf("expected status=assigned, got %s", assignment.Status)
	}

	// Verify retrieval
	got, err := svc.GetAssignment(ctx, assignment.ID, "athlete-integration-1", "athlete")
	if err != nil {
		t.Fatalf("unexpected error getting assignment: %v", err)
	}
	if got.AthleteID != "athlete-integration-1" {
		t.Errorf("expected athlete_id=athlete-integration-1, got %s", got.AthleteID)
	}
}

func TestIntegration_AssignTemplate_UnauthorizedCoach(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-3",
		Name:      "Unauthorized Template",
		Type:      domain.TemplateTypeIntervals,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := svc.CreateTemplate(ctx, template); err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}

	// Try to assign with different coach
	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:    template.ID,
		AthleteID:     "athlete-integration-2",
		CoachID:       "coach-other",
		Status:        domain.AssignmentStatusAssigned,
	}
	err := svc.AssignTemplate(ctx, assignment)
	if err == nil {
		t.Fatal("expected error for unauthorized coach assignment")
	}
}

func TestIntegration_StartSession_PostgreSQL(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-4",
		Name:      "Start Session Template",
		Type:      domain.TemplateTypeIntervals,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := svc.CreateTemplate(ctx, template); err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}

	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:  template.ID,
		AthleteID:   "athlete-integration-3",
		CoachID:     "coach-integration-4",
		ScheduledDate: now.Add(24 * time.Hour),
		Status:      domain.AssignmentStatusAssigned,
	}
	if err := svc.AssignTemplate(ctx, assignment); err != nil {
		t.Fatalf("unexpected error assigning template: %v", err)
	}

	session, err := svc.StartSession(ctx, assignment.ID, "athlete-integration-3")
	if err != nil {
		t.Fatalf("unexpected error starting session: %v", err)
	}
	if session.ID == "" {
		t.Error("expected session ID to be generated")
	}
	if session.UserID != "athlete-integration-3" {
		t.Errorf("expected user_id=athlete-integration-3, got %s", session.UserID)
	}

	// Verify snapshot was created
	snapshot, err := svc.GetSnapshotBySession(ctx, session.ID)
	if err != nil {
		t.Fatalf("unexpected error getting snapshot: %v", err)
	}
	if snapshot.SessionID != session.ID {
		t.Errorf("expected snapshot session_id=%s, got %s", session.ID, snapshot.SessionID)
	}
	if snapshot.AssignmentID != assignment.ID {
		t.Errorf("expected snapshot assignment_id=%s, got %s", assignment.ID, snapshot.AssignmentID)
	}
}

func TestIntegration_ImmutableSnapshot_PostgreSQL(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-5",
		Name:      "Original Template",
		Description: "Original",
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := svc.CreateTemplate(ctx, template); err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}

	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:  template.ID,
		AthleteID:   "athlete-integration-4",
		CoachID:     "coach-integration-5",
		ScheduledDate: now.Add(24 * time.Hour),
		Status:      domain.AssignmentStatusAssigned,
	}
	if err := svc.AssignTemplate(ctx, assignment); err != nil {
		t.Fatalf("unexpected error assigning template: %v", err)
	}

	session, err := svc.StartSession(ctx, assignment.ID, "athlete-integration-4")
	if err != nil {
		t.Fatalf("unexpected error starting session: %v", err)
	}

	snapshotBefore, err := svc.GetSnapshotBySession(ctx, session.ID)
	if err != nil {
		t.Fatalf("unexpected error getting snapshot: %v", err)
	}

	// Modify template
	err = svc.UpdateTemplate(ctx, template.ID, "Modified Template", "Modified", domain.TemplateTypeIntervals,
		nil, nil, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error updating template: %v", err)
	}

	snapshotAfter, err := svc.GetSnapshotBySession(ctx, session.ID)
	if err != nil {
		t.Fatalf("unexpected error getting snapshot after update: %v", err)
	}

	if snapshotBefore.TemplateCopy != snapshotAfter.TemplateCopy {
		t.Error("snapshot should be immutable - template modification should not change snapshot")
	}
}

func TestIntegration_FinishSession_PostgreSQL(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-6",
		Name:      "Finish Session Template",
		Type:      domain.TemplateTypeIntervals,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := svc.CreateTemplate(ctx, template); err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}

	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:  template.ID,
		AthleteID:   "athlete-integration-5",
		CoachID:     "coach-integration-6",
		ScheduledDate: now.Add(24 * time.Hour),
		Status:      domain.AssignmentStatusAssigned,
	}
	if err := svc.AssignTemplate(ctx, assignment); err != nil {
		t.Fatalf("unexpected error assigning template: %v", err)
	}

	session, err := svc.StartSession(ctx, assignment.ID, "athlete-integration-5")
	if err != nil {
		t.Fatalf("unexpected error starting session: %v", err)
	}

	// Finish session
	err = svc.FinishSession(ctx, session.ID, "athlete-integration-5")
	if err != nil {
		t.Fatalf("unexpected error finishing session: %v", err)
	}

	// Verify assignment completed
	updatedAssignment, err := svc.GetAssignment(ctx, assignment.ID, "athlete-integration-6", "athlete")
	if err != nil {
		t.Fatalf("unexpected error getting assignment: %v", err)
	}
	if updatedAssignment.Status != domain.AssignmentStatusCompleted {
		t.Errorf("expected assignment status=completed, got %s", updatedAssignment.Status)
	}
}

func TestIntegration_FinishSession_Idempotent(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-7",
		Name:      "Idempotent Finish Template",
		Type:      domain.TemplateTypeIntervals,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := svc.CreateTemplate(ctx, template); err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}

	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:  template.ID,
		AthleteID:   "athlete-integration-6",
		CoachID:     "coach-integration-7",
		ScheduledDate: now.Add(24 * time.Hour),
		Status:      domain.AssignmentStatusAssigned,
	}
	if err := svc.AssignTemplate(ctx, assignment); err != nil {
		t.Fatalf("unexpected error assigning template: %v", err)
	}

	session, err := svc.StartSession(ctx, assignment.ID, "athlete-integration-6")
	if err != nil {
		t.Fatalf("unexpected error starting session: %v", err)
	}

	// Finish first time
	if err := svc.FinishSession(ctx, session.ID, "athlete-integration-6"); err != nil {
		t.Fatalf("unexpected error on first finish: %v", err)
	}

	// Finish second time - should fail (already completed)
	err = svc.FinishSession(ctx, session.ID, "athlete-integration-6")
	if err == nil {
		t.Fatal("expected error on duplicate finish")
	}
}

func TestIntegration_CrossCoachAthleteAccess(t *testing.T) {
	db := newTestDB(t)
	ctx := context.Background()

	repo := running.NewRepository(db.DB)
	svc := NewService(repo)

	now := time.Now()
	template := &domain.RunningWorkoutTemplate{
		CoachID:   "coach-integration-8",
		Name:      "Cross Access Template",
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := svc.CreateTemplate(ctx, template); err != nil {
		t.Fatalf("unexpected error creating template: %v", err)
	}

	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:  template.ID,
		AthleteID:   "athlete-integration-7",
		CoachID:     "coach-integration-8",
		ScheduledDate: now.Add(24 * time.Hour),
		Status:      domain.AssignmentStatusAssigned,
	}
	if err := svc.AssignTemplate(ctx, assignment); err != nil {
		t.Fatalf("unexpected error assigning template: %v", err)
	}

	session, err := svc.StartSession(ctx, assignment.ID, "athlete-integration-7")
	if err != nil {
		t.Fatalf("unexpected error starting session: %v", err)
	}

	// Athlete-2 cannot finish athlete-1's session
	err = svc.FinishSession(ctx, session.ID, "athlete-integration-8")
	if err == nil {
		t.Fatal("expected error when athlete-8 tries to finish athlete-7's session")
	}

	// Verify assignment not completed
	updatedAssignment, err := svc.GetAssignment(ctx, assignment.ID, "athlete-7", "athlete")
	if err != nil {
		t.Fatalf("unexpected error getting assignment: %v", err)
	}
	if updatedAssignment.Status == domain.AssignmentStatusCompleted {
		t.Error("assignment should not be completed by unauthorized athlete")
	}
}

var _ = errors.NotFound
