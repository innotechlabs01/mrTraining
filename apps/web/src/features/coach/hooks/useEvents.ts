'use client';

import { useState, useEffect, useCallback } from 'react';
import { MOCK_EVENTS } from '@/features/coach/data/_mocks';
import type { CoachEvent } from '@/features/coach/types';

const STORAGE_KEY = 'mr-training-events';

function loadEvents(): CoachEvent[] {
  if (typeof window === 'undefined') return MOCK_EVENTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_EVENTS;
    const parsed = JSON.parse(raw) as CoachEvent[];
    if (!Array.isArray(parsed) || parsed.length === 0) return MOCK_EVENTS;
    return parsed;
  } catch {
    return MOCK_EVENTS;
  }
}

export function useEvents() {
  const [events, setEvents] = useState<CoachEvent[]>(MOCK_EVENTS);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const upsertEvent = useCallback((event: CoachEvent) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === event.id);
      const next = exists ? prev.map((e) => (e.id === event.id ? event : e)) : [event, ...prev];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { events, upsertEvent, deleteEvent };
}
