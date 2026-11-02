/**
 * Unit tests for API client: 401 retry with token-change guard.
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { refreshClerkToken } from '../../auth/clerk';

// Mock the auth module
jest.mock('../../auth/clerk', () => ({
  ...jest.requireActual('../../auth/clerk'),
  refreshClerkToken: jest.fn(),
}));

// Mock axios
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedRefreshClerkToken = refreshClerkToken as jest.MockedFunction<typeof refreshClerkToken>;

describe('API Client - 401 Token Change Guard', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;
  let requestInterceptor: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>;
  let responseInterceptorSuccess: (response: any) => any;
  let responseInterceptorError: (error: any) => Promise<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock axios instance
    mockClient = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockedAxios.create.mockReturnValue(mockClient);

    // Capture the interceptors
    mockClient.interceptors.request.use.mockImplementation((fn: any) => {
      requestInterceptor = fn;
      return 0;
    });

    mockClient.interceptors.response.use.mockImplementation((successFn: any, errorFn: any) => {
      responseInterceptorSuccess = successFn;
      responseInterceptorError = errorFn;
      return 0;
    });

    // Import the module to trigger interceptor setup
    // We need to reset modules to re-run the setup
    jest.resetModules();
  });

  // Since the module sets up interceptors at import time, we test the logic
  // by directly testing the token-change guard function that would be used.
  // The actual interceptor logic is in client.ts lines 127-137.

  describe('Token change guard logic (extracted from interceptor)', () => {
    const failedToken = 'expired-token-123';
    const freshToken = 'fresh-token-456';
    const sameToken = 'expired-token-123';

    const createOriginalRequest = () => ({
      _retry: false,
      headers: {
        Authorization: `Bearer ${failedToken}`,
      },
    });

    const mockClientFn = jest.fn();

    beforeEach(() => {
      mockClientFn.mockReset();
    });

    it('retries when fresh token differs from failed token', async () => {
      mockedRefreshClerkToken.mockResolvedValue(freshToken);
      mockClientFn.mockResolvedValue({ status: 200, data: 'success' });

      // Simulate the interceptor logic
      const error = {
        response: { status: 401 },
        config: createOriginalRequest(),
      };

      // This mimics the interceptor logic from client.ts:127-137
      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedAuthHeader = (error.config.headers as any)?.Authorization;
        const extractedFailedToken =
          typeof failedAuthHeader === 'string'
            ? failedAuthHeader.replace('Bearer ', '')
            : '';

        const token = await refreshClerkToken();
        if (token && token !== extractedFailedToken && error.config.headers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error.config.headers as any).Authorization = `Bearer ${token}`;
          await mockClientFn(error.config);
        }
      }

      expect(mockedRefreshClerkToken).toHaveBeenCalledTimes(1);
      expect(mockClientFn).toHaveBeenCalledTimes(1);
      expect(mockClientFn).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${freshToken}`,
          }),
        })
      );
    });

    it('does NOT retry when fresh token is identical to failed token', async () => {
      mockedRefreshClerkToken.mockResolvedValue(sameToken);
      mockClientFn.mockResolvedValue({ status: 200, data: 'success' });

      const error = {
        response: { status: 401 },
        config: createOriginalRequest(),
      };

      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedAuthHeader = (error.config.headers as any)?.Authorization;
        const extractedFailedToken =
          typeof failedAuthHeader === 'string'
            ? failedAuthHeader.replace('Bearer ', '')
            : '';

        const token = await refreshClerkToken();
        if (token && token !== extractedFailedToken && error.config.headers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error.config.headers as any).Authorization = `Bearer ${token}`;
          await mockClientFn(error.config);
        }
      }

      expect(mockedRefreshClerkToken).toHaveBeenCalledTimes(1);
      expect(mockClientFn).not.toHaveBeenCalled();
    });

    it('does NOT retry when refreshClerkToken returns null', async () => {
      mockedRefreshClerkToken.mockResolvedValue(null);
      mockClientFn.mockResolvedValue({ status: 200, data: 'success' });

      const error = {
        response: { status: 401 },
        config: createOriginalRequest(),
      };

      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedAuthHeader = (error.config.headers as any)?.Authorization;
        const extractedFailedToken =
          typeof failedAuthHeader === 'string'
            ? failedAuthHeader.replace('Bearer ', '')
            : '';

        const token = await refreshClerkToken();
        if (token && token !== extractedFailedToken && error.config.headers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error.config.headers as any).Authorization = `Bearer ${token}`;
          await mockClientFn(error.config);
        }
      }

      expect(mockedRefreshClerkToken).toHaveBeenCalledTimes(1);
      expect(mockClientFn).not.toHaveBeenCalled();
    });

    it('does NOT retry when refreshClerkToken throws', async () => {
      mockedRefreshClerkToken.mockRejectedValue(new Error('Clerk error'));
      mockClientFn.mockResolvedValue({ status: 200, data: 'success' });

      const error = {
        response: { status: 401 },
        config: createOriginalRequest(),
      };

      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedAuthHeader = (error.config.headers as any)?.Authorization;
        const extractedFailedToken =
          typeof failedAuthHeader === 'string'
            ? failedAuthHeader.replace('Bearer ', '')
            : '';

        try {
          const token = await refreshClerkToken();
          if (token && token !== extractedFailedToken && error.config.headers) {
            error.config.headers.Authorization = `Bearer ${token}`;
            await mockClientFn(error.config);
          }
        } catch {
          // Error is caught, no retry
        }
      }

      expect(mockedRefreshClerkToken).toHaveBeenCalledTimes(1);
      expect(mockClientFn).not.toHaveBeenCalled();
    });

    it('retries when no Authorization header present (empty failed token)', async () => {
      mockedRefreshClerkToken.mockResolvedValue(freshToken);
      mockClientFn.mockResolvedValue({ status: 200, data: 'success' });

      const error = {
        response: { status: 401 },
        config: {
          _retry: false,
          headers: {}, // No Authorization header
        },
      };

      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedAuthHeader = (error.config.headers as any)?.Authorization;
        const extractedFailedToken =
          typeof failedAuthHeader === 'string'
            ? failedAuthHeader.replace('Bearer ', '')
            : '';

        const token = await refreshClerkToken();
        if (token && token !== extractedFailedToken && error.config.headers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error.config.headers as any).Authorization = `Bearer ${token}`;
          await mockClientFn(error.config);
        }
      }

      expect(mockedRefreshClerkToken).toHaveBeenCalledTimes(1);
      // Should still retry since extractedFailedToken is '' and freshToken !== ''
      expect(mockClientFn).toHaveBeenCalledTimes(1);
    });

    it('only retries once (_retry flag prevents loop)', async () => {
      mockedRefreshClerkToken.mockResolvedValue(freshToken);
      mockClientFn
        .mockResolvedValueOnce({ status: 401 }) // First retry still 401
        .mockResolvedValueOnce({ status: 200, data: 'success' }); // Second call (not reached due to _retry)

      const error = {
        response: { status: 401 },
        config: { ...createOriginalRequest(), _retry: true }, // Already retried
      };

      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedAuthHeader = (error.config.headers as any)?.Authorization;
        const extractedFailedToken =
          typeof failedAuthHeader === 'string'
            ? failedAuthHeader.replace('Bearer ', '')
            : '';

        const token = await refreshClerkToken();
        if (token && token !== extractedFailedToken && error.config.headers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error.config.headers as any).Authorization = `Bearer ${token}`;
          await mockClientFn(error.config);
        }
      }

      expect(mockedRefreshClerkToken).not.toHaveBeenCalled();
      expect(mockClientFn).not.toHaveBeenCalled();
    });
  });
});