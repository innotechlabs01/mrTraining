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
}));

const permission = jest.mocked(Location.requestForegroundPermissionsAsync);
const watch = jest.mocked(Location.watchPositionAsync);
const remove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  permission.mockResolvedValue({ status: 'granted' } as Location.LocationPermissionResponse);
  watch.mockResolvedValue({ remove });
});

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
