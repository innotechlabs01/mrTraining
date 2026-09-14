'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Challenge, ChallengeLeaderboardEntry } from '../types'
import { goClient } from '@/lib/api/go-client'

// Go API response shapes (snake_case).
type GoChallenge = {
  id: string
  coach_id: string
  title: string
  description?: string
  exercise_type: string
  video_url?: string
  duration_minutes: number
  calories: number
  target_sets?: number
  target_reps?: number
  scoring_type: Challenge['scoringType']
  difficulty_level: Challenge['difficultyLevel']
  max_attempts: number
  status: Challenge['status']
  start_date?: string
  end_date?: string
  expires_at?: string
  days_left?: number
  is_urgent?: boolean
  created_at: string
  updated_at: string
}

type GoLeaderboardEntry = {
  rank: number
  athlete_id: string
  athlete_name: string
  avatar_url?: string
  score: number
  attempts: number
  best_score: number
  trend: string
}

function mapChallenge(c: GoChallenge): Challenge {
  return {
    id: c.id,
    coachId: c.coach_id,
    title: c.title,
    description: c.description,
    exerciseType: c.exercise_type,
    videoUrl: c.video_url,
    durationMinutes: c.duration_minutes,
    calories: c.calories,
    targetSets: c.target_sets,
    targetReps: c.target_reps,
    scoringType: c.scoring_type,
    difficultyLevel: c.difficulty_level,
    maxAttempts: c.max_attempts,
    status: c.status,
    startDate: c.start_date,
    endDate: c.end_date,
    expiresAt: c.expires_at,
    daysLeft: c.days_left,
    isUrgent: c.is_urgent,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

function mapLeaderboard(e: GoLeaderboardEntry): ChallengeLeaderboardEntry {
  return {
    rank: e.rank,
    athleteId: e.athlete_id,
    athleteName: e.athlete_name,
    avatarUrl: e.avatar_url,
    score: e.score,
    attempts: e.attempts,
    bestScore: e.best_score,
    trend: e.trend,
  }
}

export function useChallenges() {
  const queryClient = useQueryClient()

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await goClient.get<{ data?: GoChallenge[] }>('/api/v1/coach/challenges')
      return (res?.data ?? []).map(mapChallenge)
    },
    staleTime: 30_000,
  })

  const createChallenge = async (input: {
    title: string
    description?: string
    exerciseType: string
    videoUrl?: string
    durationMinutes: number
    calories: number
    targetSets?: number
    targetReps?: number
    scoringType: Challenge['scoringType']
    difficultyLevel: Challenge['difficultyLevel']
    maxAttempts: number
    endDate: string
  }) => {
    const res = await goClient.post<{ data?: GoChallenge }>('/api/v1/challenges', {
      title: input.title,
      description: input.description,
      exercise_type: input.exerciseType,
      video_url: input.videoUrl,
      duration_minutes: input.durationMinutes,
      calories: input.calories,
      target_sets: input.targetSets,
      target_reps: input.targetReps,
      scoring_type: input.scoringType,
      difficulty_level: input.difficultyLevel,
      max_attempts: input.maxAttempts,
      end_date: input.endDate,
    })
    await queryClient.invalidateQueries({ queryKey: ['challenges'] })
    return res?.data
  }

  const updateChallengeMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Challenge> }) =>
      goClient.put(`/api/v1/challenges/${id}`, {
        title: patch.title,
        description: patch.description,
        exercise_type: patch.exerciseType,
        video_url: patch.videoUrl,
        duration_minutes: patch.durationMinutes,
        calories: patch.calories,
        target_sets: patch.targetSets,
        target_reps: patch.targetReps,
        scoring_type: patch.scoringType,
        difficulty_level: patch.difficultyLevel,
        max_attempts: patch.maxAttempts,
        end_date: patch.endDate,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  })

  const activateChallenge = async (id: string) => {
    await goClient.post(`/api/v1/challenges/${id}/activate`, {})
    await queryClient.invalidateQueries({ queryKey: ['challenges'] })
  }

  const deleteChallenge = async (id: string) => {
    await goClient.delete(`/api/v1/challenges/${id}`)
    await queryClient.invalidateQueries({ queryKey: ['challenges'] })
  }

  return {
    challenges,
    isLoading,
    createChallenge,
    updateChallenge: (id: string, patch: Partial<Challenge>) => updateChallengeMutation.mutateAsync({ id, patch }),
    activateChallenge,
    deleteChallenge,
  }
}

export async function getChallengeLeaderboard(id: string): Promise<ChallengeLeaderboardEntry[]> {
  const res = await goClient.get<{ data?: GoLeaderboardEntry[] }>(`/api/v1/challenges/${id}/leaderboard`)
  return (res?.data ?? []).map(mapLeaderboard)
}

export type ChallengeStats = {
  totalAttempts: number
  uniqueAthletes: number
  avgFormScore: number
  bestFormScore: number
}

export async function getChallengeStats(id: string): Promise<ChallengeStats> {
  const res = await goClient.get<{ data?: Record<string, number> }>(`/api/v1/challenges/${id}/stats`)
  const s = res?.data ?? {}
  return {
    totalAttempts: s.total_attempts ?? 0,
    uniqueAthletes: s.unique_athletes ?? 0,
    avgFormScore: s.avg_form_score ?? 0,
    bestFormScore: s.best_form_score ?? 0,
  }
}

type ClerkWindow = {
  Clerk?: { session?: { getToken: () => Promise<string | null> } }
}

async function getClerkToken(): Promise<string | null> {
  const clerk = (window as unknown as ClerkWindow).Clerk
  if (clerk?.session?.getToken) {
    try {
      return await clerk.session.getToken()
    } catch {
      return null
    }
  }
  return localStorage.getItem('mr-training-auth-token')
}

/**
 * Subscribe to live leaderboard updates for a challenge over WebSocket.
 * Returns an unsubscribe function.
 */
export function subscribeChallengeLeaderboard(
  id: string,
  onUpdate: (entries: ChallengeLeaderboardEntry[]) => void,
): () => void {
  let closed = false
  let ws: WebSocket | null = null

  const connect = () => {
    if (closed) return
    const base = process.env.NEXT_PUBLIC_GO_API_URL || ''
    if (!base) return
    const wsBase = base.replace(/^http/, 'ws')

    getClerkToken().then((token) => {
      if (closed || !token) return
      ws = new WebSocket(`${wsBase}/challenges/${id}/leaderboard/ws?token=${encodeURIComponent(token)}`)

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string)
          if (msg?.type === 'challenge.leaderboard.updated') {
            const raw = msg.payload as GoLeaderboardEntry[]
            onUpdate((raw ?? []).map(mapLeaderboard))
          }
        } catch {
          /* ignore malformed messages */
        }
      }

      ws.onclose = () => {
        if (!closed) setTimeout(connect, 3000)
      }
    })
  }

  connect()

  return () => {
    closed = true
    ws?.close()
  }
}