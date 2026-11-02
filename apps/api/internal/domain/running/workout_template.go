// Package running domain entities for structured running workouts.
// Defines RunningWorkoutTemplate and RunningWorkoutSegment — the core
// aggregates for coach-designed, interval-based running sessions.
package running

import (
	"time"
)

// RunningWorkoutTemplateType enumerates the supported running workout types.
type RunningWorkoutTemplateType string

const (
	TemplateTypeFreeRun          RunningWorkoutTemplateType = "free_run"
	TemplateTypeContinuousDistance RunningWorkoutTemplateType = "continuous_distance"
	TemplateTypeTimedRun         RunningWorkoutTemplateType = "timed_run"
	TemplateTypeIntervals        RunningWorkoutTemplateType = "intervals"
	TemplateTypeSeries           RunningWorkoutTemplateType = "series"
	TemplateTypeRecovery         RunningWorkoutTemplateType = "recovery"
	TemplateTypeTempo            RunningWorkoutTemplateType = "tempo"
	TemplateTypeProgressive      RunningWorkoutTemplateType = "progressive"
)

// RunningWorkoutSegmentType enumerates the supported segment types.
type RunningWorkoutSegmentType string

const (
	SegmentTypeWarmup   RunningWorkoutSegmentType = "warmup"
	SegmentTypeMain     RunningWorkoutSegmentType = "main"
	SegmentTypeInterval RunningWorkoutSegmentType = "interval"
	SegmentTypeRecovery RunningWorkoutSegmentType = "recovery"
	SegmentTypeCooldown RunningWorkoutSegmentType = "cooldown"
)

// RunningWorkoutCompletionCriteria enumerates how a segment is considered complete.
type RunningWorkoutCompletionCriteria string

const (
	CompletionCriteriaTime    RunningWorkoutCompletionCriteria = "time"
	CompletionCriteriaDistance RunningWorkoutCompletionCriteria = "distance"
	CompletionCriteriaManual  RunningWorkoutCompletionCriteria = "manual"
)

// RunningWorkoutTemplate is a coach-designed running workout with ordered segments.
// It is the prescribable unit that gets assigned to an athlete.
type RunningWorkoutTemplate struct {
	ID                    string                        `json:"id"`
	CoachID               string                        `json:"coach_id"`
	Name                  string                        `json:"name"`
	Description           string                        `json:"description"`
	Type                  RunningWorkoutTemplateType    `json:"type"`
	TargetPaceMinPerKm    *float64                      `json:"target_pace_min_per_km,omitempty"`
	TargetPaceMaxPerKm    *float64                      `json:"target_pace_max_per_km,omitempty"`
	TargetHeartRateMin    *int                          `json:"target_heart_rate_min,omitempty"`
	TargetHeartRateMax    *int                          `json:"target_heart_rate_max,omitempty"`
	TargetCadence         *int                          `json:"target_cadence,omitempty"`
	TargetDistanceKm      *float64                      `json:"target_distance_km,omitempty"`
	TargetDurationSec     *int                          `json:"target_duration_sec,omitempty"`
	Segments              []*RunningWorkoutSegment       `json:"segments"`
	CreatedAt             time.Time                     `json:"created_at"`
	UpdatedAt             time.Time                     `json:"updated_at"`
	DeletedAt             *time.Time                    `json:"deleted_at,omitempty"`
	Version               int                           `json:"version"`
}

// RunningWorkoutSegment is an ordered segment within a template.
type RunningWorkoutSegment struct {
	ID                    string                        `json:"id"`
	TemplateID            string                        `json:"template_id"`
	OrderIndex            int                           `json:"order_index"`
	Type                  RunningWorkoutSegmentType     `json:"type"`
	Instruction           string                        `json:"instruction"`
	SpokenInstruction     string                        `json:"spoken_instruction,omitempty"`
	TargetDurationSec     *int                          `json:"target_duration_sec,omitempty"`
	TargetDistanceKm      *float64                      `json:"target_distance_km,omitempty"`
	TargetPaceMinPerKm    *float64                      `json:"target_pace_min_per_km,omitempty"`
	TargetPaceMaxPerKm    *float64                      `json:"target_pace_max_per_km,omitempty"`
	TargetHeartRateMin    *int                          `json:"target_heart_rate_min,omitempty"`
	TargetHeartRateMax    *int                          `json:"target_heart_rate_max,omitempty"`
	Repetitions           *int                          `json:"repetitions,omitempty"`
	RecoverySec           *int                          `json:"recovery_sec,omitempty"`
	CompletionCriteria    RunningWorkoutCompletionCriteria `json:"completion_criteria"`
	CreatedAt             time.Time                     `json:"created_at"`
	UpdatedAt             time.Time                     `json:"updated_at"`
	DeletedAt             *time.Time                    `json:"deleted_at,omitempty"`
	Version               int                           `json:"version"`
}
