import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { GO_API_URL } from '../../infrastructure/api/client';

export type WsMessage = {
  type: string;
  payload?: Record<string, unknown>;
};

/**
 * Build an authenticated WebSocket URL from an HTTP(S) base URL and Clerk JWT.
 * Returns null if the base URL or token is empty.
 */
export function buildWsUrl(baseUrl: string, token: string | null | undefined): string | null {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  const trimmedToken = token?.trim() ?? '';
  if (!trimmedBase || !trimmedToken) {
    return null;
  }

  const wsBase = trimmedBase
    .replace(/^https:\/\//i, 'wss://')
    .replace(/^http:\/\//i, 'ws://');

  return `${wsBase}/ws?token=${encodeURIComponent(trimmedToken)}`;
}

/**
 * Subscribe to a Go API WebSocket topic.
 * Callers typically pass a handleMessage that invalidates React Query caches.
 *
 * Usage:
 *   useWsSubscription('events', (msg) => {
 *     if (msg.type === 'events.updated') queryClient.invalidateQueries(['events']);
 *   });
 *
 * The Go hub supports a client-initiated subscribe protocol:
 *   {"type":"subscribe","topic":"events"}
 */
export function useWsSubscription(
  topic: string,
  handleMessage: (msg: WsMessage) => void,
  wsUrl?: string,
) {
  const { getToken, isSignedIn } = useAuth();
  const handlerRef = useRef(handleMessage);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    handlerRef.current = handleMessage;
    getTokenRef.current = getToken;
  });

  useEffect(() => {
    const rawBase = (wsUrl ?? GO_API_URL).trim();
    if (!rawBase || !isSignedIn) {
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const connect = async () => {
      if (!mounted) return;

      let token: string | null = null;
      try {
        token = await getTokenRef.current();
      } catch {
        return;
      }

      if (!mounted) return;
      const url = buildWsUrl(rawBase, token);
      if (!url) return;

      ws = new WebSocket(url);

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: 'subscribe', topic }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          handlerRef.current(msg);
        } catch {
          // Ignore malformed frames.
        }
      };

      ws.onclose = () => {
        if (mounted) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    void connect();

    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [topic, wsUrl, isSignedIn]);
}
