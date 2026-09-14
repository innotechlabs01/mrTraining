import { goFetch } from '@/lib/api/go-client'

export interface GroupLeaderboard {
  id: string
  group_id: string
  athlete_id: string
  athlete_name: string
  points: number
  rank: number
  week_start: string
  created_at: string
  updated_at: string
}

export interface WeeklyLeaderboard {
  rank: number
  athlete_id: string
  athlete_name: string
  points: number
  week_start: string
}

export interface LeaderboardHistory {
  week_start: string
  rank: number
  points: number
  group_name: string
}

export const leaderboardApi = {
  getGroup: (groupId: string, week?: string) =>
    goFetch<GroupLeaderboard[]>(`/api/v1/leaderboard/group/${groupId}${week ? `?week=${week}` : ''}`),
  
  getWeekly: (week?: string, limit: number = 50) => {
    const params = new URLSearchParams()
    if (week) params.set('week', week)
    params.set('limit', String(limit))
    return goFetch<WeeklyLeaderboard[]>(`/api/v1/leaderboard/weekly?${params.toString()}`)
  },
  
  getHistory: (limit: number = 10) =>
    goFetch<LeaderboardHistory[]>(`/api/v1/leaderboard/history?limit=${limit}`),
}
