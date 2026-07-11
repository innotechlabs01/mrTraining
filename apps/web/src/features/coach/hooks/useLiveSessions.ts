'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LiveSessionItem, LiveSessionStatus } from '@/features/coach/types';

const STORAGE_KEY = 'mr-training-live-sessions';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadSessions(): LiveSessionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LiveSessionItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uid() {
  return `ls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface NewLiveSessionInput {
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  modality: LiveSessionItem['modality'];
  location?: string;
  notes?: string;
  public: boolean;
  capacity: number;
  link?: string;
  distanceKm?: number;
  pace?: string;
}

/** Effective status: cancelled always wins; otherwise derived from the schedule. */
export function effectiveStatus(s: LiveSessionItem, now: Date = new Date()): LiveSessionStatus {
  if (s.status === 'cancelled') return 'cancelled';
  if (s.status === 'completed') return 'completed';
  const start = new Date(`${s.date}T${s.startTime}`);
  const end = new Date(`${s.date}T${s.endTime}`);
  if (now < start) return 'scheduled';
  if (now > end) return 'completed';
  return 'live';
}

/** True when a new session on `date` overlaps an existing one's time window. */
export function overlaps(
  sessions: LiveSessionItem[],
  date: string,
  startTime: string,
  endTime: string,
  ignoreId?: string,
): boolean {
  const start = new Date(`${date}T${startTime}`).getTime();
  const end = new Date(`${date}T${endTime}`).getTime();
  if (end <= start) return false;
  return sessions.some((s) => {
    if (s.id === ignoreId || s.date !== date || s.status === 'cancelled') return false;
    const sStart = new Date(`${s.date}T${s.startTime}`).getTime();
    const sEnd = new Date(`${s.date}T${s.endTime}`).getTime();
    return start < sEnd && end > sStart;
  });
}

export function useLiveSessions() {
  const [sessions, setSessions] = useState<LiveSessionItem[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const persist = useCallback((next: LiveSessionItem[]) => {
    setSessions(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const addSession = useCallback(
    (input: NewLiveSessionInput) => {
      const session: LiveSessionItem = {
        id: uid(),
        enrolled: 0,
        status: 'scheduled',
        ...input,
      };
      const next = [...loadSessions(), session].sort((a, b) =>
        a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
      );
      persist(next);
      return session;
    },
    [persist],
  );

  const updateSession = useCallback(
    (id: string, patch: Partial<LiveSessionItem>) => {
      const next = loadSessions().map((s) => (s.id === id ? { ...s, ...patch } : s));
      persist(next);
    },
    [persist],
  );

  const removeSession = useCallback(
    (id: string) => {
      const next = loadSessions().filter((s) => s.id !== id);
      persist(next);
    },
    [persist],
  );

  const setEnrolled = useCallback(
    (id: string, value: number) => {
      const all = loadSessions();
      const target = all.find((s) => s.id === id);
      if (!target) return;
      const clamped = Math.max(0, Math.min(value, target.capacity));
      persist(all.map((s) => (s.id === id ? { ...s, enrolled: clamped } : s)));
    },
    [persist],
  );

  const sessionsForDate = useCallback(
    (date: string) =>
      sessions
        .filter((s) => s.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions],
  );

  return { sessions, addSession, updateSession, removeSession, setEnrolled, sessionsForDate, todayISO };
}
