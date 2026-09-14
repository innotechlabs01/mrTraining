'use client'
import { useQuery } from '@tanstack/react-query'
import { leaderboardApi } from '../api/client'

export function useGroupLeaderboard(groupId: string, week?: string) {
  return useQuery({
    queryKey: ['leaderboard', 'group', groupId, week],
    queryFn: () => leaderboardApi.getGroup(groupId, week),
    staleTime: 5 * 60 * 1000,
    enabled: !!groupId,
  })
}

export function useWeeklyLeaderboard(week?: string, limit: number = 50) {
  return useQuery({
    queryKey: ['leaderboard', 'weekly', week, limit],
    queryFn: () => leaderboardApi.getWeekly(week, limit),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLeaderboardHistory(limit: number = 10) {
  return useQuery({
    queryKey: ['leaderboard', 'history', limit],
    queryFn: () => leaderboardApi.getHistory(limit),
    staleTime: 10 * 60 * 1000,
  })
}
