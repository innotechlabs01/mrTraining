export type AthleteBlockId = 'morning' | 'workout' | 'recovery' | 'nutrition' | 'community' | 'night'

export interface AthleteTimeBlock {
  id: AthleteBlockId
  label: string
  time: string
  icon: string
  status: 'upcoming' | 'current' | 'past'
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  rest: number
  weight?: number
  completedSets: number
  notes?: string
}

export interface WorkoutPlan {
  id: string
  name: string
  focus: string
  exercises: Exercise[]
  estimatedDuration: number
  coachNote?: string
}

export interface Meal {
  id: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories?: number
  protein?: number
  logged: boolean
  time: string
  suggestion?: string
}

export interface WaterLog {
  current: number
  goal: number
}

export interface Supplement {
  id: string
  name: string
  dosage: string
  taken: boolean
  time: string
}

export interface TeamPost {
  id: string
  authorId: string
  author: string
  authorAvatar?: string
  content: string
  timestamp: string
  type: 'achievement' | 'message' | 'announcement'
  likes: number
  cheered: boolean
}

export interface MorningData {
  sleepHours: number
  sleepQuality: 'great' | 'good' | 'okay' | 'poor'
  todayWorkout: WorkoutPlan | null
  quote: string
}

export interface DailySummary {
  date: string
  workoutCompleted: boolean
  workoutName?: string
  exercisesCompleted: number
  totalExercises: number
  waterPercentage: number
  mealsLogged: number
  totalMeals: number
  supplementsTaken: number
  totalSupplements: number
  streak: number
  highlights: string[]
  motivationQuote: string
  tomorrowPreview: string
}

export interface WorkoutProgress {
  currentExerciseIndex: number
  currentSet: number
  phase: 'active' | 'rest' | 'complete'
  restTimeRemaining: number
}
