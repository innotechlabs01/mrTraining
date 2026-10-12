import { useEffect, useRef } from 'react';

export type WsMessage = {
  type: string;
  payload?: Record<string, unknown>;
};

/**
 * Subscribe to a Go API WebSocket topic. Returns a ref with the WebSocket —
 * callers typically pass a handleMessage that invalidates React Query caches.
 *
 * Usage:
 *   useEventsSubscription((msg) => {
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
  const handlerRef = useRef(handleMessage);
  handlerRef.current = handleMessage;

  useEffect(() => {
    const base =
      wsUrl ??
      (typeof window !== 'undefined' && window.location?.host
        ? `ws://${window.location.host}`
        : 'ws://localhost:9090');
    // eslint-disable-next-line no-underscore-dangle
    const url = `${base}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    const connect = () => {
      if (!mounted) return;
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

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [topic, wsUrl]);
}
