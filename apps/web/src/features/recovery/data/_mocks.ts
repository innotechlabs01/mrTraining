import type {
  RecoveryData,
  RecoveryScore,
  SleepData,
  HRVData,
  StressData,
  HydrationData,
  AIRecommendation,
  Stretch,
} from '../types'

const today = new Date().toISOString().split('T')[0]

export const MOCK_SLEEP: SleepData = {
  hours: 7.4,
  quality: 'good',
  deepSleep: 1.8,
  remSleep: 2.1,
  lightSleep: 3.0,
  awake: 0.5,
  bedtime: '22:15',
  wakeTime: '06:00',
  consistency: 85,
}

export const MOCK_HRV: HRVData = {
  current: 62,
  baseline: 58,
  trend: 'up',
  sevenDayAvg: 60,
  readings: [55, 57, 54, 59, 61, 63, 62],
}

export const MOCK_STRESS: StressData = {
  current: 28,
  baseline: 35,
  trend: 'down',
  sevenDayAvg: 32,
  readings: [38, 36, 34, 33, 30, 29, 28],
}

export const MOCK_HYDRATION: HydrationData = {
  current: 1800,
  goal: 3000,
  trend: 'stable',
  sevenDayAvg: 2100,
  history: [1600, 2200, 1900, 2500, 1800, 2000, 1800],
}

export const MOCK_RECOVERY_SCORE: RecoveryScore = {
  overall: 78,
  sleep: 72,
  hrv: 82,
  stress: 76,
  hydration: 60,
  subjective: 85,
  trend: 'up',
  history: [65, 68, 70, 72, 74, 75, 78],
}

export const MOCK_AI_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: 'ai-rec-1',
    type: 'sleep',
    title: 'Sleep schedule is improving',
    description: 'Your sleep consistency is up 8% this week. Try keeping the same wake time on weekends to maintain this trend.',
    reasoning: 'Consistent wake times strengthen your circadian rhythm. Your data shows 85% consistency, which is good but can improve.',
    priority: 'medium',
    actionLabel: 'Set Reminder',
  },
  {
    id: 'ai-rec-2',
    type: 'training',
    title: 'Optimal training window today',
    description: 'Your HRV is 7% above baseline and recovery score is 78. This is a good day for your scheduled workout.',
    reasoning: 'Elevated HRV relative to baseline indicates your autonomic nervous system is balanced and ready for training stimulus.',
    priority: 'high',
  },
  {
    id: 'ai-rec-3',
    type: 'hydration',
    title: 'Hydration needs attention',
    description: 'You\'re at 60% of your hydration goal. Increase water intake by 400ml to optimize recovery.',
    reasoning: 'Even mild dehydration (2% body weight loss) can impair recovery and reduce HRV. Your current intake is below your 7-day average.',
    priority: 'high',
    actionLabel: 'Log Water',
  },
]

export const MOCK_STRETCHES: Stretch[] = [
  { id: 'st-1', name: 'Hamstring Stretch', duration: 30, completed: false, category: 'flexibility' },
  { id: 'st-2', name: 'Quad Stretch', duration: 30, completed: false, category: 'flexibility' },
  { id: 'st-3', name: 'Hip Flexor Stretch', duration: 45, completed: false, category: 'mobility' },
  { id: 'st-4', name: 'Glute Bridge Hold', duration: 30, completed: false, category: 'activation' },
  { id: 'st-5', name: 'Calf Stretch', duration: 30, completed: false, category: 'flexibility' },
  { id: 'st-6', name: 'Child\'s Pose', duration: 45, completed: false, category: 'cool_down' },
]

export const MOCK_RECOVERY: RecoveryData = {
  date: today,
  sleep: MOCK_SLEEP,
  hrv: MOCK_HRV,
  stress: MOCK_STRESS,
  hydration: MOCK_HYDRATION,
  recoveryScore: MOCK_RECOVERY_SCORE,
  aiRecommendations: MOCK_AI_RECOMMENDATIONS,
  stretches: MOCK_STRETCHES,
  readiness: 'ready',
}
