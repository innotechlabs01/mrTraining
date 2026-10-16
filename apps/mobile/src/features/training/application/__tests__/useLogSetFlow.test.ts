/**
 * T-013 — useLogSetFlow contract tests.
 *
 * The set-logging flow must hit the REAL Go API routes:
 *   POST /workouts/:workoutId/sets              (setIndex is 1-based, sec→duration)
 *   GET  /workouts/sessions/:sessionId
 *   POST /workouts/sessions/:sessionId/complete ({ durationSeconds })
 * The old `/athlete/sessions/:id/*` paths do NOT exist in the Go API (404).
 */

// Mock the API client + outbox before importing the hook.
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockEnqueue = jest.fn();

jest.mock('../../../../infrastructure/api/client', () => ({
  smartClient: { post: (...args: unknown[]) => mockPost(...args), get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('../../../../infrastructure/health', () => ({ syncIfPossible: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../setOutbox', () => ({ enqueueSetOutbox: (...args: unknown[]) => mockEnqueue(...args) }));
jest.mock('../../presentation/screens/executionResume', () => ({
  saveSessionResume: jest.fn(),
  clearSessionResume: jest.fn(),
}));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn().mockResolvedValue(undefined), NotificationFeedbackType: { Success: 0 } }));

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogSetFlow, type LogSetFlowParams } from '../useLogSetFlow';

const noop = () => {};

function makeParams(overrides: Partial<LogSetFlowParams> = {}): LogSetFlowParams {
  return {
    sessionId: 'session-1',
    workoutId: 'workout-9',
    exercises: [
      { id: 'ex-1', name: 'Sentadilla', sets: 2, reps: 10, weightKg: 80, restSeconds: 60 },
    ] as unknown as LogSetFlowParams['exercises'],
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    durationSeconds: 300,
    isLastExercise: overrides.isLastExercise ?? false,
    currentExercise: undefined,
    workoutName: 'Fuerza',
    completedPrs: [],
    logSetErrorTitle: 'err',
    logSetErrorBody: 'err body',
    setCurrentSetIndex: noop,
    setCurrentExerciseIndex: noop,
    setCompletedPrs: noop,
    setFinalDuration: noop,
    setCompleted: noop,
    setCurrentBadgeName: noop,
    setShowBadgeToast: noop,
    setRepsInput: noop,
    setSecInput: noop,
    setRirInput: noop,
    setCurrentReps: noop,
    setRestSecondsLeft: noop,
    syncPending: jest.fn().mockResolvedValue(undefined),
    logWorkoutMutation: { mutate: noop },
    checkBadgesMutation: { mutate: noop },
    ...overrides,
  };
}

async function runMutation(params: LogSetFlowParams, payload: { weightKg: number; reps: number; rir: number; sec?: number } = { weightKg: 80, reps: 10, rir: 2 }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useLogSetFlow(params), { wrapper });
  await act(async () => {
    await result.current.mutateAsync(payload).catch(() => undefined);
  });
}

describe('useLogSetFlow — Go API contract (T-013)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ data: {} });
    mockGet.mockResolvedValue({ data: { exercises: [] } });
  });

  it('posts the set to /workouts/:workoutId/sets with 1-based setIndex and duration (not sec)', async () => {
    await runMutation(makeParams(), { weightKg: 80, reps: 10, sec: 45, rir: 2 });
    expect(mockPost).toHaveBeenCalledWith('/workouts/workout-9/sets', {
      exerciseId: 'ex-1',
      setIndex: 1,
      weightKg: 80,
      reps: 10,
      duration: 45,
      rir: 2,
    });
    // No per-exercise progress call must happen.
    expect(mockPost.mock.calls.some(([path]) => String(path).includes('/progress'))).toBe(false);
    // The old broken path must be gone.
    expect(mockPost.mock.calls.some(([path]) => String(path).startsWith('/athlete/sessions'))).toBe(false);
  });

  it('posts only the set on a non-final set (progress step removed)', async () => {
    await runMutation(makeParams());
    expect(mockPost.mock.calls.filter(([path]) => String(path).endsWith('/sets'))).toHaveLength(1);
    expect(mockPost.mock.calls).toHaveLength(1);
  });

  it('on the last exercise completes the session with durationSeconds', async () => {
    await runMutation(makeParams({ isLastExercise: true, currentSetIndex: 1 }), { weightKg: 80, reps: 10, rir: 2 });
    expect(mockPost).toHaveBeenCalledWith('/workouts/workout-9/sets', expect.objectContaining({ setIndex: 2 }));
    expect(mockGet).toHaveBeenCalledWith('/workouts/sessions/session-1');
    expect(mockPost).toHaveBeenCalledWith('/workouts/sessions/session-1/complete', { durationSeconds: 300 });
  });

  it('queues remaining steps to the outbox when the set POST fails (offline)', async () => {
    mockPost.mockRejectedValueOnce(new Error('network down'));
    await runMutation(makeParams({ isLastExercise: true }), { weightKg: 80, reps: 10, sec: 10, rir: 1 });
    expect(mockEnqueue).toHaveBeenCalled();
    const queued = mockEnqueue.mock.calls[0][0];
    expect(queued.some((s: { path: string }) => s.path === '/workouts/workout-9/sets')).toBe(true);
    // Complete is also attempted after the failed POST doesn't block the flow
    expect(mockPost.mock.calls.some(([path]) => String(path).includes('/athlete/sessions'))).toBe(false);
  });
});
