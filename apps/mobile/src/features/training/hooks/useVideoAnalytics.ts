/**
 * useVideoAnalytics hook — React Query integration for video analytics.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  trackSession,
  fetchSummary,
  fetchPerExercise,
  fetchSessions,
  type APISessionAnalysis,
  type APIExerciseAnalytics,
  type APIAnalyticsSummary,
} from '../../../infrastructure/videoanalytics/api';

const VIDEO_ANALYTICS_QUERY_KEY = ['training', 'video-analytics'];

/**
 * Hook to track a new video analysis session.
 */
export function useTrackSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      workout_id?: string;
      exercise_id: string;
      exercise_name: string;
      duration_sec: number;
      rep_count: number;
      avg_form_score: number;
      min_form_score: number;
      max_form_score: number;
      video_url?: string;
    }) => trackSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIDEO_ANALYTICS_QUERY_KEY });
    },
  });
}

/**
 * Hook to fetch analytics summary.
 */
export function useAnalyticsSummary() {
  return useQuery({
    queryKey: [...VIDEO_ANALYTICS_QUERY_KEY, 'summary'],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch per-exercise analytics.
 */
export function usePerExerciseAnalytics() {
  return useQuery({
    queryKey: [...VIDEO_ANALYTICS_QUERY_KEY, 'per-exercise'],
    queryFn: fetchPerExercise,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch sessions.
 */
export function useVideoSessions(limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: [...VIDEO_ANALYTICS_QUERY_KEY, 'sessions', limit, offset],
    queryFn: () => fetchSessions(limit, offset),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
