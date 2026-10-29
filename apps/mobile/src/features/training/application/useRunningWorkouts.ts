/**
 * Hooks for structured running workouts (templates, assignments, guided sessions).
 * Consumes the Go API via smartClient (axios → /api/v1/*).
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { smartClient } from '../../../infrastructure/api/client';

// --- Types (mirror Go API DTOs) ---

export interface RunningWorkoutSegmentDto {
  id: string;
  template_id: string;
  order_index: number;
  type: 'warmup' | 'main' | 'interval' | 'recovery' | 'cooldown';
  instruction: string;
  spoken_instruction?: string;
  target_duration_sec?: number;
  target_distance_km?: number;
  target_pace_min_per_km?: number;
  target_pace_max_per_km?: number;
  target_heart_rate_min?: number;
  target_heart_rate_max?: number;
  repetitions?: number;
  recovery_sec?: number;
  completion_criteria: 'time' | 'distance' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface RunningWorkoutTemplateDto {
  id: string;
  coach_id: string;
  name: string;
  description: string;
  type: string;
  target_pace_min_per_km?: number;
  target_pace_max_per_km?: number;
  target_heart_rate_min?: number;
  target_heart_rate_max?: number;
  target_cadence?: number;
  target_distance_km?: number;
  target_duration_sec?: number;
  segments: RunningWorkoutSegmentDto[];
  created_at: string;
  updated_at: string;
}

export interface RunningWorkoutAssignmentDto {
  id: string;
  template_id: string;
  athlete_id: string;
  coach_id: string;
  scheduled_date: string;
  status: 'assigned' | 'available' | 'started' | 'completed' | 'skipped' | 'cancelled';
  athlete_instructions: string;
  created_at: string;
  updated_at: string;
}

export interface StartRunningSessionRequest {
  assignment_id: string;
}

export interface StartRunningSessionResponse {
  session_id: string;
  status: string;
}

export interface CompleteRunningSessionRequest {
  distance: number;
  duration: number;
  pace: string;
  calories: number;
  elevation: number;
  heart_rate: number;
  cadence: number;
  gps_route?: string;
}

export interface CompleteRunningSessionResponse {
  session_id: string;
  status: string;
  distance: number;
  duration: number;
  pace: string;
  heart_rate: number;
  cadence: number;
}

// --- Query keys ---

export const runningWorkoutKeys = {
  templates: ['runningWorkoutTemplates'] as const,
  template: (id: string) => ['runningWorkoutTemplate', id] as const,
  assignments: ['runningWorkoutAssignments'] as const,
  assignment: (id: string) => ['runningWorkoutAssignment', id] as const,
};

// --- Hooks ---

/** List running workout templates for the current coach. */
export function useRunningWorkoutTemplates() {
  return useQuery({
    queryKey: runningWorkoutKeys.templates,
    queryFn: async (): Promise<RunningWorkoutTemplateDto[]> => {
      const { data } = await smartClient.get<RunningWorkoutTemplateDto[]>(
        '/running/workouts/templates',
      );
      return data;
    },
  });
}

/** Get a single running workout template by ID. */
export function useRunningWorkoutTemplate(templateId: string) {
  return useQuery({
    queryKey: runningWorkoutKeys.template(templateId),
    queryFn: async (): Promise<RunningWorkoutTemplateDto> => {
      const { data } = await smartClient.get<RunningWorkoutTemplateDto>(
        `/running/workouts/templates/${templateId}`,
      );
      return data;
    },
    enabled: !!templateId,
  });
}

/** List running workout assignments for the current athlete. */
export function useRunningWorkoutAssignments(status?: string) {
  return useQuery({
    queryKey: [...runningWorkoutKeys.assignments, status],
    queryFn: async (): Promise<RunningWorkoutAssignmentDto[]> => {
      const params = status ? `?status=${status}` : '';
      const { data } = await smartClient.get<RunningWorkoutAssignmentDto[]>(
        `/running/workouts/assignments${params}`,
      );
      return data;
    },
  });
}

/** Get a single running workout assignment by ID. */
export function useRunningWorkoutAssignment(assignmentId: string) {
  return useQuery({
    queryKey: runningWorkoutKeys.assignment(assignmentId),
    queryFn: async (): Promise<RunningWorkoutAssignmentDto> => {
      const { data } = await smartClient.get<RunningWorkoutAssignmentDto>(
        `/running/workouts/assignments/${assignmentId}`,
      );
      return data;
    },
    enabled: !!assignmentId,
  });
}

/** Mutation: start a running workout session from an assignment. */
export function useStartRunningSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: StartRunningSessionRequest): Promise<StartRunningSessionResponse> => {
      const { data } = await smartClient.post<StartRunningSessionResponse>(
        '/running/workouts/sessions/start',
        req,
      );
      return data;
    },
    onSuccess: (_data, vars) => {
      // Invalidate assignments so the status reflects "started"
      queryClient.invalidateQueries({ queryKey: runningWorkoutKeys.assignments });
      // Invalidate the specific assignment
      queryClient.invalidateQueries({
        queryKey: runningWorkoutKeys.assignment(vars.assignment_id),
      });
    },
  });
}

/** Mutation: complete a running session with real metrics. */
export function useCompleteRunningSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      req,
    }: {
      sessionId: string;
      req: CompleteRunningSessionRequest;
    }): Promise<CompleteRunningSessionResponse> => {
      const { data } = await smartClient.post<CompleteRunningSessionResponse>(
        `/running/workouts/sessions/${sessionId}/complete`,
        req,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runningWorkoutKeys.assignments });
    },
  });
}

/** Helper options for common query configurations. */
export function runningWorkoutQueryOptions(): UseQueryOptions {
  return {
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  };
}
