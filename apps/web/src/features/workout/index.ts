// Types
export type {
  MuscleGroup,
  Equipment,
  Difficulty,
  WorkoutGoal,
  ScheduleStatus,
  SessionStatus,
  WorkoutType,
  ExerciseCategory,
  SetType,
  RestPeriod,
  WeightUnit,
  DistanceUnit,
  Exercise,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutTemplate,
  ScheduleEvent,
  PerformedSet,
  PerformedExercise,
  WorkoutSessionRecord,
  WorkoutStats,
  ExerciseDetail,
  WorkoutExerciseDetail,
  WorkoutSet,
  Workout,
  WorkoutProgram,
  ScheduledWorkout,
  AIWorkoutSuggestion,
  WorkoutAnalytics as WorkoutAnalyticsData,
  PersonalRecord,
  WorkoutHistoryEntry,
  WorkoutFilterOptions,
  WorkoutBuilderFormData,
} from './types'

// Hooks
export { useExerciseLibrary } from './hooks/useExerciseLibrary'
export { useWorkoutPlans } from './hooks/useWorkoutPlans'
export { useSchedule } from './hooks/useSchedule'
export {
  useWorkoutExecution,
  useScheduledWorkouts,
  useWorkoutHistory,
  useWorkoutAnalytics
} from './hooks/useWorkoutExecution'

// Helper functions
export {
  generateId,
  formatDuration,
  formatDate,
  timeAgo,
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  GOAL_LABELS
} from './hooks/helpers'

// Components
export * from './components'

// Data / Mocks
export * from './data/_mocks'
