import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getClerkToken } from '../../../infrastructure/auth/clerk';

export function useStoreRealtime() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    const connect = async () => {
      if (closedRef.current) return;
      const base = process.env.EXPO_PUBLIC_GO_API_URL || '';
      if (!base) return;
      const wsBase = base.replace(/^http/, 'ws');

      try {
        const token = await getClerkToken();
        if (closedRef.current || !token) return;

        wsRef.current = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

        wsRef.current.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string);
            if (msg?.type === 'product.changed' || msg?.type === 'product.stock_changed') {
              queryClient.invalidateQueries({ queryKey: ['athlete-store'] });
            }
          } catch {
            // ignore malformed messages
          }
        };

        wsRef.current.onclose = () => {
          if (!closedRef.current) setTimeout(connect, 3000);
        };
      } catch {
        if (!closedRef.current) setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      closedRef.current = true;
      wsRef.current?.close();
    };
  }, [queryClient]);
}