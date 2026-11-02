/**
 * Unit tests for Clerk auth module: token refresh guard and session expiration handling.
 */
import {
  getClerkToken,
  refreshClerkToken,
  setClerkInstance,
  setOnSessionExpired,
  getOnSessionExpired,
} from '../clerk';

describe('Clerk Auth Module', () => {
  const mockSession = {
    getToken: jest.fn(),
  };

  const mockClerk = {
    session: mockSession,
    user: { id: 'user-123' },
    signOut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setClerkInstance(mockClerk);
    setOnSessionExpired(null);
  });

  describe('getClerkToken', () => {
    it('returns null when no clerk instance', async () => {
      setClerkInstance(null);
      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it('returns null when no session', async () => {
      setClerkInstance({ session: null });
      const token = await getClerkToken();
      expect(token).toBeNull();
    });

    it('returns token from session.getToken() without skipCache', async () => {
      mockSession.getToken.mockResolvedValue('cached-token');
      const token = await getClerkToken();
      expect(token).toBe('cached-token');
      // When called without args, getToken is invoked with no arguments (not undefined)
      expect(mockSession.getToken).toHaveBeenCalledWith();
    });

    it('returns token from session.getToken({ skipCache: true })', async () => {
      mockSession.getToken.mockResolvedValue('fresh-token');
      const token = await getClerkToken({ skipCache: true });
      expect(token).toBe('fresh-token');
      expect(mockSession.getToken).toHaveBeenCalledWith({ skipCache: true });
    });

    it('calls onSessionExpired callback when skipCache returns null', async () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);
      mockSession.getToken.mockResolvedValue(null);

      const token = await getClerkToken({ skipCache: true });

      expect(token).toBeNull();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not call onSessionExpired when skipCache returns a token', async () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);
      mockSession.getToken.mockResolvedValue('valid-token');

      const token = await getClerkToken({ skipCache: true });

      expect(token).toBe('valid-token');
      expect(callback).not.toHaveBeenCalled();
    });

    it('returns null and does not call onSessionExpired on error (non-skipCache)', async () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);
      mockSession.getToken.mockRejectedValue(new Error('network error'));

      const token = await getClerkToken();

      expect(token).toBeNull();
      expect(callback).not.toHaveBeenCalled();
    });

    it('returns null on error with skipCache', async () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);
      mockSession.getToken.mockRejectedValue(new Error('network error'));

      const token = await getClerkToken({ skipCache: true });

      expect(token).toBeNull();
      // onSessionExpired is only called when token is explicitly null, not on error
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('refreshClerkToken', () => {
    it('calls getClerkToken with skipCache: true', async () => {
      mockSession.getToken.mockResolvedValue('refreshed-token');
      const token = await refreshClerkToken();
      expect(token).toBe('refreshed-token');
      expect(mockSession.getToken).toHaveBeenCalledWith({ skipCache: true });
    });
  });

  describe('setOnSessionExpired / getOnSessionExpired', () => {
    it('registers and retrieves callback', () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);
      expect(getOnSessionExpired()).toBe(callback);
    });

    it('returns null when no callback registered', () => {
      setOnSessionExpired(null);
      expect(getOnSessionExpired()).toBeNull();
    });
  });
});