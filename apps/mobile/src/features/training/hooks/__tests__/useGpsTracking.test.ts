import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useGpsTracking } from '../useGpsTracking';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock('../../../../infrastructure/api/client', () => ({
  apiClient: { post: jest.fn().mockResolvedValue({}) },
  MAX_GPS_BATCH_POINTS: 3,
  GPS_ACCURACY_FILTER_METERS: 50,
}));

const permission = jest.mocked(Location.requestForegroundPermissionsAsync);
const watch = jest.mocked(Location.watchPositionAsync);
const post = jest.mocked(require('../../../../infrastructure/api/client').apiClient.post);
const remove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  permission.mockResolvedValue({ status: 'granted' } as Location.LocationPermissionResponse);
  watch.mockResolvedValue({ remove });
  post.mockResolvedValue({});
});

function locationPoint(accuracy: number): Location.LocationObject {
  return {
    coords: { latitude: 40.4168, longitude: -3.7038, altitude: null, accuracy },
    timestamp: Date.now(),
  } as unknown as Location.LocationObject;
}

async function startAndGetCallback(): Promise<{
  callback: (loc: Location.LocationObject) => void;
  unmount: () => void;
}> {
  const { result, unmount } = renderHook(() => useGpsTracking({
    workoutId: 'session', exerciseId: 'exercise', enabled: true, upload: true,
  }));
  await waitFor(() => expect(result.current.isTracking).toBe(true));
  const callback = watch.mock.calls[0][1];
  return { callback, unmount };
}

it('keeps one active watcher after tracking state changes and rerenders', async () => {
  const { result, rerender, unmount } = renderHook(() => useGpsTracking({
    workoutId: 'session', exerciseId: 'exercise', enabled: true,
  }));
  await waitFor(() => expect(result.current.isTracking).toBe(true));
  rerender({});
  expect(watch).toHaveBeenCalledTimes(1);
  expect(remove).not.toHaveBeenCalled();
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('reports denied permission without retrying on every rerender', async () => {
  permission.mockResolvedValue({ status: 'denied' } as Location.LocationPermissionResponse);
  const { result, rerender } = renderHook(() => useGpsTracking({
    workoutId: 'session', exerciseId: 'exercise', enabled: true,
  }));
  await waitFor(() => expect(result.current.error).toBeTruthy());
  rerender({});
  expect(permission).toHaveBeenCalledTimes(1);
  expect(watch).not.toHaveBeenCalled();
});

it('removes a watcher whose async setup resolves after unmount', async () => {
  let resolveWatch: (subscription: Location.LocationSubscription) => void = () => {};
  watch.mockReturnValue(new Promise(resolve => { resolveWatch = resolve; }));
  const { unmount } = renderHook(() => useGpsTracking({
    workoutId: 'session', exerciseId: 'exercise', enabled: true,
  }));
  await waitFor(() => expect(watch).toHaveBeenCalledTimes(1));
  unmount();
  await act(async () => { resolveWatch({ remove }); });
  expect(remove).toHaveBeenCalledTimes(1);
});

describe('lote GPS (upload)', () => {
  it('descarta puntos con accuracy mayor al umbral y no los envía', async () => {
    const { callback, unmount } = await startAndGetCallback();
    await act(async () => { callback(locationPoint(60)); });
    expect(post).not.toHaveBeenCalled();
    unmount();
  });

  it('envía los puntos válidos en lotes del tamaño del cap', async () => {
    const { callback, unmount } = await startAndGetCallback();
    for (let i = 0; i < 3; i++) {
      await act(async () => { callback(locationPoint(5)); });
    }
    expect(post).toHaveBeenCalledTimes(1);
    const body = post.mock.calls[0][1];
    expect(body.points).toHaveLength(3);
    expect(body.session_id).toBe('session');
    unmount();
  });

  it('filtra puntos de baja precisión del lote', async () => {
    const { callback, unmount } = await startAndGetCallback();
    await act(async () => { callback(locationPoint(60)); }); // descartado
    await act(async () => { callback(locationPoint(5)); });  // válido
    await act(async () => { callback(locationPoint(5)); });  // válido
    await act(async () => { callback(locationPoint(5)); });  // válido → lote completo
    expect(post).toHaveBeenCalledTimes(1);
    const body = post.mock.calls[0][1];
    expect(body.points).toHaveLength(3);
    expect(body.points.every((p: any) => (p.accuracy ?? 0) <= 50)).toBe(true);
    unmount();
  });
});
