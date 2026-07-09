export type SleepQuality = 'great' | 'good' | 'okay' | 'poor'
export type RecoveryTrend = 'up' | 'down' | 'stable'
export type ReadinessStatus = 'ready' | 'moderate' | 'low' | 'rest_needed'

export interface SleepData {
  hours: number
  quality: SleepQuality
  deepSleep: number
  remSleep: number
  lightSleep: number
  awake: number
  bedtime: string
  wakeTime: string
  consistency: number
}

export interface HRVData {
  current: number
  baseline: number
  trend: RecoveryTrend
  sevenDayAvg: number
  readings: number[]
}

export interface StressData {
  current: number
  baseline: number
  trend: RecoveryTrend
  sevenDayAvg: number
  readings: number[]
}

export interface HydrationData {
  current: number
  goal: number
  trend: RecoveryTrend
  sevenDayAvg: number
  history: number[]
}

export interface RecoveryScore {
  overall: number
  sleep: number
  hrv: number
  stress: number
  hydration: number
  subjective: number
  trend: RecoveryTrend
  history: number[]
}

export interface AIRecommendation {
  id: string
  type: 'sleep' | 'recovery' | 'hydration' | 'training' | 'nutrition' | 'general'
  title: string
  description: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  actionLabel?: string
  actionLink?: string
}

export interface Stretch {
  id: string
  name: string
  duration: number
  completed: boolean
  category: 'mobility' | 'flexibility' | 'activation' | 'cool_down'
}

export interface RecoveryData {
  date: string
  sleep: SleepData
  hrv: HRVData
  stress: StressData
  hydration: HydrationData
  recoveryScore: RecoveryScore
  aiRecommendations: AIRecommendation[]
  stretches: Stretch[]
  readiness: ReadinessStatus
}

export interface SleepLogEntry {
  date: string
  bedtime: string
  wakeTime: string
  hours: number
  quality: SleepQuality
  notes?: string
}
