import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { RunningExecutionScreen } from '../RunningExecutionScreen';

const mockReplace = jest.fn();
const mockRun = jest.fn();
const mockCompleteSession = jest.fn();
const mockStartSession = jest.fn();
const mockRetrySync = jest.fn();
const mockInvalidate = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace, goBack: jest.fn(), dispatch: jest.fn() }),
  useRoute: () => ({ params: { sessionId: 'server-session', workoutId: 'assignment' } }),
  usePreventRemove: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('../../../application/useGuidedRunningSession', () => ({
  useGuidedRunningSession: (...args: unknown[]) => mockRun(...args),
}));
jest.mock('../../../application/useRunningWorkouts', () => ({
  useRunningWorkoutAssignment: () => ({ data: { template_id: 'template' } }),
  useRunningWorkoutTemplate: () => ({ data: { name: 'Easy run', segments: [] } }),
  runningWorkoutKeys: { assignments: ['assignments'] },
}));
jest.mock('../../../application/useRunningSync', () => ({
  useRunningSync: () => ({
    status: 'idle', isSyncing: false, sessionId: null, pendingCount: 0,
    startSession: mockStartSession, completeSession: mockCompleteSession, retrySync: mockRetrySync,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRun.mockReturnValue({
    durationSeconds: 90, distanceKm: 0.3, pace: '5:00', isPaused: false,
    isSaving: false, gpsError: null, togglePause: jest.fn(), retryGps: jest.fn(),
  });
});

it('records against the server session ID and renders measured metrics', () => {
  const screen = render(<RunningExecutionScreen />);
  expect(mockRun).toHaveBeenCalledWith('server-session', true);
  expect(screen.getByText('0.30 km')).toBeTruthy();
  expect(screen.getByText('1:30')).toBeTruthy();
});

it('does not navigate to a success summary if completion failed', async () => {
  mockCompleteSession.mockResolvedValue(false);
  const screen = render(<RunningExecutionScreen />);
  await act(async () => { fireEvent.press(screen.getByLabelText('Finalizar')); });
  expect(mockReplace).not.toHaveBeenCalled();
});

it('shows the summary only after confirmed completion and invalidates assignment data', async () => {
  mockCompleteSession.mockResolvedValue(true);
  const screen = render(<RunningExecutionScreen />);
  await act(async () => { fireEvent.press(screen.getByLabelText('Finalizar')); });
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('RunningSessionSummary', { sessionId: 'server-session' }));
  expect(mockInvalidate).toHaveBeenCalled();
});
