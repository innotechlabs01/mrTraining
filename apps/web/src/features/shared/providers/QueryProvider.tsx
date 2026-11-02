'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Single QueryClient for the whole (app) tree. Server-cache on the Go API
// already reduces DB load; this client cache adds request dedup, staleTime
// freshness and background refetch so navigating back and forth never refetches
// already-fresh data. refetchOnWindowFocus off to avoid surprise round-trips.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}