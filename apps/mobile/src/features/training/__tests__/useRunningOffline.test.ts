/**
 * Pruebas de la cola offline de running con MMKV: encolado, flush con clave de
 * idempotencia, descarte de 4xx, reintento de 5xx/transporte y purga por TTL.
 * No requiere MMKV nativo ni dispositivo.
 */

let mockStore: unknown[] = [];

jest.mock('../../../infrastructure/api/client', () => ({
  smartClient: { post: jest.fn() },
  generateIdempotencyKey: jest.fn(() => 'idem-key-1'),
}));
jest.mock('../../../infrastructure/storage/mmkv', () => ({
  mmkvGetJsonUserScoped: jest.fn(() => mockStore),
  mmkvSetJson: jest.fn((_key: string, value: unknown[]) => {
    mockStore = value;
  }),
  userScopedKey: jest.fn((key: string) => key),
}));

import { Alert } from 'react-native';
import { smartClient, generateIdempotencyKey } from '../../../infrastructure/api/client';
import {
  enqueueRunningAction,
  flushRunningQueue,
  getRunningQueueCount,
} from '../application/useRunningOffline';

const mockPost = smartClient.post as jest.Mock;
const mockGenerateKey = generateIdempotencyKey as jest.Mock;

function httpError(status: number): any {
  const err: any = new Error('boom');
  err.response = { status };
  return err;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore = [];
  mockGenerateKey.mockReturnValue('idem-key-1');
});

describe('enqueueRunningAction', () => {
  it('guarda la acción con clave de idempotencia y retorna la clave', () => {
    const key = enqueueRunningAction({
      type: 'start_session',
      path: '/running/workouts/sessions/start',
      payload: { assignment_id: 'a-1' },
    });
    expect(key).toBe('idem-key-1');
    expect(getRunningQueueCount()).toBe(1);
    const saved = mockStore[0] as { idempotencyKey: string; type: string; createdAt: string };
    expect(saved.idempotencyKey).toBe('idem-key-1');
    expect(saved.type).toBe('start_session');
    expect(saved.createdAt).toBeTruthy();
  });

  it('usa una clave de idempotencia distinta por acción', () => {
    mockGenerateKey.mockReturnValueOnce('key-a').mockReturnValueOnce('key-b');
    enqueueRunningAction({ type: 'start_session', path: '/x/start', payload: {} });
    enqueueRunningAction({ type: 'complete_session', path: '/x/complete', payload: {} });
    expect(mockStore.map((i: any) => i.idempotencyKey)).toEqual(['key-a', 'key-b']);
  });
});

describe('flushRunningQueue', () => {
  it('envía el ítem en cola con su clave de idempotencia y lo quita al éxito', async () => {
    mockPost.mockResolvedValue({ data: {} });
    enqueueRunningAction({ type: 'start_session', path: '/sessions/start', payload: {} });
    expect(getRunningQueueCount()).toBe(1);

    const remaining = await flushRunningQueue();
    expect(remaining).toBe(0);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0]).toBe('/sessions/start');
    expect(mockPost.mock.calls[0][2].headers['Idempotency-Key']).toBe('idem-key-1');
    expect(getRunningQueueCount()).toBe(0);
  });

  it('descarta el ítem ante un 4xx y avisa una sola vez', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockPost.mockRejectedValue(httpError(400));
    enqueueRunningAction({ type: 'complete_session', path: '/sessions/complete', payload: {} });

    await flushRunningQueue();
    expect(getRunningQueueCount()).toBe(0); // descartado
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it('mantiene el ítem y detiene el flush ante un 5xx o error de transporte', async () => {
    mockPost.mockRejectedValueOnce(httpError(500));
    enqueueRunningAction({ type: 'start_session', path: '/sessions/start', payload: {} });

    await flushRunningQueue();
    expect(getRunningQueueCount()).toBe(1); // no se descarta
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('no reenvía un ítem expirado por TTL', async () => {
    const oldItem = {
      id: 'old-1',
      idempotencyKey: 'k-old',
      type: 'start_session' as const,
      path: '/sessions/start',
      payload: {},
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // 25 h atrás
    };
    mockStore = [oldItem];
    mockPost.mockResolvedValue({ data: {} });

    await flushRunningQueue();
    expect(mockPost).not.toHaveBeenCalled();
    expect(getRunningQueueCount()).toBe(0); // purgado
  });
});
