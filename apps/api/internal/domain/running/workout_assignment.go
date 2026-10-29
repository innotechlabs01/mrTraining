// Package running domain entities for running workout assignments and snapshots.
// Defines RunningWorkoutAssignment (coach → athlete assignment) and
// RunningWorkoutSnapshot (immutable prescription snapshot captured at session start).
package running

import (
	"time"
)

// RunningWorkoutAssignmentStatus enumerates the lifecycle states of an assignment.
type RunningWorkoutAssignmentStatus string

const (
	AssignmentStatusAssigned  RunningWorkoutAssignmentStatus = "assigned"
	AssignmentStatusAvailable RunningWorkoutAssignmentStatus = "available"
	AssignmentStatusStarted   RunningWorkoutAssignmentStatus = "started"
	AssignmentStatusCompleted RunningWorkoutAssignmentStatus = "completed"
	AssignmentStatusSkipped   RunningWorkoutAssignmentStatus = "skipped"
	AssignmentStatusCancelled RunningWorkoutAssignmentStatus = "cancelled"
)

// RunningWorkoutAssignment links a coach-designed template to a specific athlete
// for a scheduled date. The coach owns the assignment; the athlete executes it.
type RunningWorkoutAssignment struct {
	ID                 string                         `json:"id"`
	TemplateID         string                         `json:"template_id"`
	AthleteID          string                         `json:"athlete_id"`
	CoachID            string                         `json:"coach_id"`
	ScheduledDate      time.Time                      `json:"scheduled_date"`
	Status             RunningWorkoutAssignmentStatus `json:"status"`
	AthleteInstructions string                        `json:"athlete_instructions"`
	CreatedAt          time.Time                      `json:"created_at"`
	UpdatedAt          time.Time                      `json:"updated_at"`
	DeletedAt          *time.Time                     `json:"deleted_at,omitempty"`
	Version            int                            `json:"version"`
}

// RunningWorkoutSnapshot is an immutable copy of the prescription captured when
// an athlete starts a session. If the coach later edits the template, the session
// retains this snapshot — no retroactive changes.
type RunningWorkoutSnapshot struct {
	ID          string    `json:"id"`
	AssignmentID string   `json:"assignment_id"`
	SessionID   string    `json:"session_id"`
	TemplateCopy string   `json:"template_copy"` // JSON of the full template + segments at start time
	CapturedAt  time.Time `json:"captured_at"`
}
