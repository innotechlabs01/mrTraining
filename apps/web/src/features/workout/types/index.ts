// ============ Enums ============
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs'
  | 'glutes' | 'hamstrings' | 'quads' | 'calves' | 'core' | 'forearms' | 'full_body'

export type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable'
  | 'bodyweight' | 'bands' | 'medicine_ball' | 'ez_bar' | 'smith_machine'
  | 'trx' | 'rowing_machine' | 'elliptical' | 'stair_climber'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type WorkoutGoal =
  | 'strength' | 'hypertrophy' | 'endurance' | 'speed'
  | 'power' | 'mobility' | 'conditioning' | 'warm_up' | 'cool_down'

export type ScheduleStatus = 'draft' | 'scheduled' | 'published' | 'completed' | 'cancelled'

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed'

export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'mobility' | 'sport_specific' | 'competition' | 'rest'

export type ExerciseCategory =
  | 'compound' | 'isolation' | 'plyometric' | 'cardio'
  | 'bodyweight' | 'warm_up' | 'cool_down' | 'core'

export type SetType = 'warmup' | 'working' | 'dropset' | 'supersets' | 'failure'

export type RestPeriod = 30 | 45 | 60 | 90 | 120 | 180 | 240 | 300

export type WeightUnit = 'kg' | 'lb'
export type DistanceUnit = 'km' | 'mi' | 'm'

export interface Exercise {
  id: string
  name: string
  description: string
  muscleGroups: MuscleGroup[]
  equipment: Equipment
  difficulty: Difficulty
  instructions: string[]
  videoUrl?: string
  createdAt: string
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  exerciseName: string
  order: number
  sets: number
  reps: number | 'AMRAP' | 'failure'
  weight?: number
  weightType?: 'absolute' | 'RPE' | 'RM%'
  rpeTarget?: number
  rest: number
  notes?: string
  muscleGroups: MuscleGroup[]
  /** Running route as an encoded GPS polyline (lat,lng pairs). */
  gpsRoute?: string
}

export interface WorkoutPlan {
  id: string
  name: string
  description: string
  goal: WorkoutGoal
  exercises: WorkoutExercise[]
  estimatedDuration: number
  tags: string[]
  createdAt: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  description: string
  goal: WorkoutGoal
  exercises: WorkoutExercise[]
  estimatedDuration: number
  frequency: 'once' | 'daily' | 'weekly' | 'custom'
  tags: string[]
  createdAt: string
}

export interface ScheduleEvent {
  id: string
  workoutId: string
  workoutName: string
  athleteIds: string[]
  athleteNames: string[]
  date: string
  startTime: string
  endTime: string
  status: ScheduleStatus
  coachNotes?: string
  createdAt: string
}

export interface PerformedSet {
  setNumber: number
  reps: number
  weight?: number
  rpe?: number
  completed: boolean
}

export interface PerformedExercise {
  exerciseId: string
  exerciseName: string
  sets: PerformedSet[]
  notes?: string
}

export interface WorkoutSessionRecord {
  id: string
  workoutId: string
  workoutName: string
  goal: WorkoutGoal
  athleteId: string
  date: string
  startedAt: string
  completedAt?: string
  duration?: number
  status: SessionStatus
  exercises: PerformedExercise[]
  totalVolume?: number
}

export interface WorkoutStats {
  totalSessions: number
  totalVolume: number
  averageRpe: number
  streak: number
  consistency: number
  weeklyVolume: { week: string; volume: number }[]
  recentPrs: { exercise: string; date: string; value: string }[]
}

// ============ Extended Types for Workout Experience ============

// Exercise with full metadata
export interface ExerciseDetail extends Exercise {
  category: ExerciseCategory
  secondaryMuscles: MuscleGroup[]
  tips: string[]
  commonMistakes: string[]
  thumbnailUrl?: string
  gifUrl?: string
}

// Enhanced workout exercise with all fields
export interface WorkoutExerciseDetail {
  id: string
  exerciseId: string
  exerciseName: string
  exercise?: ExerciseDetail
  section: 'warm_up' | 'main' | 'accessory' | 'cool_down'
  order: number
  sets: WorkoutSet[]
  rest: RestPeriod
  tempo?: string
  notes?: string
  supersetWith?: string // exercise ID to superset with
}

export interface WorkoutSet {
  id: string
  setNumber: number
  setType: SetType
  targetReps: number | 'AMRAP' | 'failure'
  targetWeight?: number
  targetWeightUnit?: WeightUnit
  targetRpe?: number
  targetDurationSec?: number // for timed exercises
  targetDistance?: number // for cardio
  targetPace?: string
  actualReps?: number
  actualWeight?: number
  actualRpe?: number
  actualDurationSec?: number
  actualDistance?: number
  actualPace?: string
  isCompleted: boolean
  isSkipped: boolean
  completedAt?: string
  notes?: string
}

// Complete workout with all details
export interface Workout {
  id: string
  name: string
  description?: string
  workoutType: WorkoutType
  goal: WorkoutGoal
  exercises: WorkoutExerciseDetail[]
  estimatedDuration: number
  scheduledDate?: string
  scheduledTime?: string
  actualDuration?: number
  status: SessionStatus
  coachNotes?: string
  athleteNotes?: string
  coachFeedback?: string
  tags: string[]
  createdAt: string
  updatedAt?: string
}

// Workout program (multi-week)
export interface WorkoutProgram {
  id: string
  name: string
  description: string
  sportType: string
  goal: WorkoutGoal
  phase?: string
  startDate: string
  endDate: string
  durationWeeks: number
  workouts: Workout[]
  status: 'draft' | 'active' | 'completed' | 'archived'
  isTemplate: boolean
  athleteIds: string[]
  createdBy: string
  createdAt: string
  publishedAt?: string
}

// Scheduled workout for athletes
export interface ScheduledWorkout {
  id: string
  workout: Workout
  athleteId: string
  athleteName: string
  scheduledDate: string
  scheduledTime?: string
  status: ScheduleStatus
  completedAt?: string
  reminderSent: boolean
}

// AI Generated workout suggestion
export interface AIWorkoutSuggestion {
  id: string
  prompt: string
  generatedWorkout: Workout
  confidence: number
  explanation: string
  basedOnAthlete: string // athlete ID
  status: 'pending' | 'accepted' | 'rejected' | 'modified'
  createdAt: string
}

// Workout analytics
export interface WorkoutAnalytics {
  overview: {
    totalWorkouts: number
    completedWorkouts: number
    missedWorkouts: number
    completionRate: number
    averageDuration: number
    totalVolume: number
    totalTime: number
  }
  volume: {
    weeklyVolume: number[]
    monthlyVolume: number[]
    yearlyVolume: number[]
  }
  performance: {
    averageRpe: number
    rpeByDay: { day: string; rpe: number }[]
    strengthProgression: { exercise: string; date: string; estimated1RM: number }[]
  }
  consistency: {
    currentStreak: number
    longestStreak: number
    weeklyFrequency: number
    monthlyFrequency: number
  }
  recentPrs: PersonalRecord[]
}

export interface PersonalRecord {
  id: string
  exerciseName: string
  exerciseId: string
  recordType: '1rm' | 'volume' | 'reps' | 'distance' | 'pace' | 'time'
  value: number
  unit: string
  achievedAt: string
  workoutId: string
  previousRecord?: number
  improvement: number // percentage
}

// Workout history entry
export interface WorkoutHistoryEntry {
  id: string
  workoutId: string
  workoutName: string
  date: string
  duration: number
  status: SessionStatus
  totalVolume: number
  exercisesCompleted: number
  exercisesTotal: number
  rpe?: number
  soreness?: number
  energy?: number
  notes?: string
  tags: string[]
}

// Filter options for workout queries
export interface WorkoutFilterOptions {
  status?: SessionStatus[]
  dateFrom?: string
  dateTo?: string
  goal?: WorkoutGoal[]
  workoutType?: WorkoutType[]
  hasNotes?: boolean
  minDuration?: number
  maxDuration?: number
}

// Workout builder form data
export interface WorkoutBuilderFormData {
  name: string
  description?: string
  workoutType: WorkoutType
  goal: WorkoutGoal
  exercises: WorkoutExerciseDetail[]
  estimatedDuration: number
  tags: string[]
  coachNotes?: string
}
