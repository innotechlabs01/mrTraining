import React from 'react';
import { render, act } from '@testing-library/react-native';
import { buildWsUrl, useWsSubscription } from '../useWsSubscription';

const mockGetToken = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../infrastructure/api/client', () => ({
  GO_API_URL: 'https://api.example.com',
}));

describe('buildWsUrl', () => {
  it('converts http:// to ws:// and attaches encoded token', () => {
    expect(buildWsUrl('http://localhost:9090', 'jwt.token+1')).toBe(
      'ws://localhost:9090/ws?token=jwt.token%2B1',
    );
  });

  it('converts https:// to wss:// and strips trailing slashes', () => {
    expect(buildWsUrl('https://api.example.com/', 'abc')).toBe(
      'wss://api.example.com/ws?token=abc',
    );
  });

  it('returns null when baseUrl or token is empty', () => {
    expect(buildWsUrl('', 'abc')).toBeNull();
    expect(buildWsUrl('   ', 'abc')).toBeNull();
    expect(buildWsUrl('https://api.example.com', '')).toBeNull();
    expect(buildWsUrl('https://api.example.com', null)).toBeNull();
  });
});

describe('useWsSubscription', () => {
  const originalWebSocket = global.WebSocket;
  let mockWsInstances: {
    url: string;
    send: jest.Mock;
    close: jest.Mock;
    onopen: (() => void) | null;
    onmessage: ((ev: { data: string }) => void) | null;
    onclose: (() => void) | null;
  }[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockWsInstances = [];
    (global as unknown as { WebSocket: unknown }).WebSocket = jest.fn((url: string) => {
      const instance = {
        url,
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onclose: null,
      };
      mockWsInstances.push(instance);
      return instance;
    });
  });

  afterAll(() => {
    global.WebSocket = originalWebSocket;
  });

  function TestSubscriber({ topic, wsUrl }: { topic: string; wsUrl?: string }) {
    useWsSubscription(topic, jest.fn(), wsUrl);
    return null;
  }

  it('does not open a WebSocket when user is not signed in', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, getToken: mockGetToken });

    render(React.createElement(TestSubscriber, { topic: 'events' }));
    await act(async () => {});

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockWsInstances).toHaveLength(0);
  });

  it('does not open a WebSocket when getToken returns null', async () => {
    mockGetToken.mockResolvedValue(null);
    mockUseAuth.mockReturnValue({ isSignedIn: true, getToken: mockGetToken });

    render(React.createElement(TestSubscriber, { topic: 'events' }));
    await act(async () => {});

    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(mockWsInstances).toHaveLength(0);
  });

  it('opens an authenticated WebSocket and subscribes to topic when signed in', async () => {
    mockGetToken.mockResolvedValue('clerk-jwt-123');
    mockUseAuth.mockReturnValue({ isSignedIn: true, getToken: mockGetToken });

    render(React.createElement(TestSubscriber, { topic: 'events' }));
    await act(async () => {});

    expect(mockWsInstances).toHaveLength(1);
    expect(mockWsInstances[0].url).toBe('wss://api.example.com/ws?token=clerk-jwt-123');

    act(() => {
      mockWsInstances[0].onopen?.();
    });

    expect(mockWsInstances[0].send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', topic: 'events' }),
    );
  });
});
