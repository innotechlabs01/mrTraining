import { goFetch } from '@/lib/api/go-client'

export interface SessionAnalysis {
  id: string
  athlete_id: string
  workout_id: string
  exercise_id: string
  exercise_name: string
  duration_sec: number
  rep_count: number
  avg_form_score: number
  min_form_score: number
  max_form_score: number
  video_url: string
  status: string
  created_at: string
  updated_at: string
}

export interface ExerciseAnalytics {
  exercise_id: string
  exercise_name: string
  total_sessions: number
  total_reps: number
  avg_form_score: number
  best_form_score: number
  avg_duration: number
}

export interface AnalyticsSummary {
  total_sessions: number
  total_reps: number
  avg_form_score: number
  total_duration_min: number
  exercise_count: number
}

export const videoAnalyticsApi = {
  track: (data: {
    workout_id?: string
    exercise_id: string
    exercise_name: string
    duration_sec: number
    rep_count: number
    avg_form_score: number
    min_form_score: number
    max_form_score: number
    video_url?: string
  }) =>
    goFetch<SessionAnalysis>('/api/v1/video-analytics/track', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getSummary: () =>
    goFetch<AnalyticsSummary>('/api/v1/video-analytics/summary'),
  
  getPerExercise: () =>
    goFetch<ExerciseAnalytics[]>('/api/v1/video-analytics/per-exercise'),
  
  getSessions: (limit: number = 20, offset: number = 0) =>
    goFetch<SessionAnalysis[]>(`/api/v1/video-analytics/sessions?limit=${limit}&offset=${offset}`),
}
