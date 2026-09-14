import { goFetch } from '@/lib/api/go-client'

export interface Streak {
  id: string
  athlete_id: string
  current_streak: number
  longest_streak: number
  last_workout_date: string
  created_at: string
  updated_at: string
}

export interface Badge {
  id: string
  athlete_id: string
  badge_type: string
  badge_name: string
  description: string
  icon_url: string
  earned_at: string
}

export interface PersonalRecord {
  id: string
  athlete_id: string
  exercise_id: string
  exercise_name: string
  value: number
  unit: string
  achieved_at: string
  is_personal_best: boolean
}

export const gamificationApi = {
  getStreak: () => goFetch<Streak>('/api/v1/gamification/streak'),

  getBadges: () => goFetch<Badge[]>('/api/v1/gamification/badges'),

  checkBadges: (workoutId: string) =>
    goFetch<Badge[]>('/api/v1/gamification/badges/check', {
      method: 'POST',
      body: JSON.stringify({ workout_id: workoutId }),
    }),

  getPRs: () => goFetch<PersonalRecord[]>('/api/v1/gamification/prs'),

  recordPR: (data: { exercise_id: string; exercise_name: string; value: number; unit: string }) =>
    goFetch<PersonalRecord>('/api/v1/gamification/prs/record', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
