/**
 * Pruebas de useRunningSync: iniciar/completar sesión con backend, cola
 * offline sin conexión, clave de idempotencia y audio cues en transiciones.
 * No requiere dispositivo ni MMKV nativo.
 */

import { act, renderHook } from '@testing-library/react-native';
import { smartClient, generateIdempotencyKey } from '../../../../infrastructure/api/client';
import { enqueueRunningAction, useRunningOffline } from '../useRunningOffline';
import { useRunningSync } from '../useRunningSync';

const mockPost = jest.mocked(smartClient.post);
const mockGenerateKey = jest.mocked(generateIdempotencyKey);
const mockEnqueue = jest.mocked(enqueueRunningAction);
const mockSpeak = jest.fn();

jest.mock('../../../../infrastructure/api/client', () => ({
  smartClient: { post: jest.fn() },
  generateIdempotencyKey: jest.fn(() => 'idem-key-1'),
}));
jest.mock('../useRunningOffline', () => ({
  enqueueRunningAction: jest.fn(),
  useRunningOffline: jest.fn(() => ({
    syncQueue: jest.fn().mockResolvedValue(undefined),
    pendingCount: 0,
  })),
}));
jest.mock('../useRunningAudio', () => ({
  useRunningAudio: jest.fn(() => ({ speak: mockSpeak })),
}));

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPost.mockReset();
  mockGenerateKey.mockReturnValue('idem-key-1');
  mockEnqueue.mockReset();
  mockSpeak.mockReset();
  setOnline(true);
});

describe('startSession', () => {
  it('inicia sesión online, devuelve session_id y anuncia audio', async () => {
    mockPost.mockResolvedValue({ data: { session_id: 's-1', status: 'started' } });
    const { result } = renderHook(() => useRunningSync());

    const sessionId = await act(async () => await result.current.startSession('a-1'));

    expect(sessionId).toBe('s-1');
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0]![0]).toBe('/running/workouts/sessions/start');
    expect(mockPost.mock.calls[0]![1]).toEqual({ assignment_id: 'a-1' });
    expect(mockPost.mock.calls[0]![2]!.headers!['Idempotency-Key']).toBe('idem-key-1');
    expect(mockSpeak).toHaveBeenCalledWith('Sesión iniciada. ¡A correr!');
    expect(result.current.status).toBe('running');
    expect(result.current.sessionId).toBe('s-1');
  });

  it('sin conexión: encola el inicio y no llama al backend', async () => {
    setOnline(false);
    const { result } = renderHook(() => useRunningSync());

    const sessionId = await act(async () => await result.current.startSession('a-1'));

    expect(sessionId).toBe(null);
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueue.mock.calls[0][0].type).toBe('start_session');
    expect(mockSpeak).toHaveBeenCalledWith('Sesión iniciada. ¡A correr!');
  });

  it('error de transporte: encola para reintento sin perder la sesión', async () => {
    const err: any = new Error('offline');
    mockPost.mockRejectedValue(err);
    const { result } = renderHook(() => useRunningSync());

    const sessionId = await act(async () => await result.current.startSession('a-1'));

    expect(sessionId).toBe(null);
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('running');
  });

  it('4xx del servidor: no encola y pone estado error', async () => {
    const err: any = new Error('bad request');
    err.response = { status: 400 };
    mockPost.mockRejectedValue(err);
    const { result } = renderHook(() => useRunningSync());

    const sessionId = await act(async () => await result.current.startSession('a-1'));

    expect(sessionId).toBe(null);
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
  });
});

describe('completeSession', () => {
  it('completa online y anuncia audio de finalización', async () => {
    mockPost.mockResolvedValue({ data: { session_id: 's-1', status: 'completed' } });
    const { result } = renderHook(() => useRunningSync());

    const ok = await act(async () =>
      result.current.completeSession('s-1', {
        distance: 5, duration: 1500, pace: '5:00',
        calories: 0, elevation: 0, heart_rate: 0, cadence: 0, gps_route: '',
      })
    );

    expect(ok).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0]![0]).toBe('/running/workouts/sessions/s-1/complete');
    expect(mockPost.mock.calls[0]![2]!.headers!['Idempotency-Key']).toBe('idem-key-1');
    expect(mockSpeak).toHaveBeenCalledWith('Sesión completada. ¡Buen trabajo!');
    expect(result.current.status).toBe('completed');
  });

  it('sin conexión: encola la completación y no llama al backend', async () => {
    setOnline(false);
    const { result } = renderHook(() => useRunningSync());

    const ok = await act(async () =>
      result.current.completeSession('s-1', {
        distance: 5, duration: 1500, pace: '5:00',
        calories: 0, elevation: 0, heart_rate: 0, cadence: 0, gps_route: '',
      })
    );

    expect(ok).toBe(true);
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueue.mock.calls[0][0].type).toBe('complete_session');
    expect(mockSpeak).toHaveBeenCalledWith('Sesión completada. ¡Buen trabajo!');
  });
});
