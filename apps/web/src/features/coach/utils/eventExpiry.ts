import type { CoachEvent } from '@/features/coach/types';

/**
 * Returns the moment an event ends, or null when it has no usable date.
 * An event without a usable time ends at the end of its day.
 */
export function getEventEnd(event: CoachEvent): Date | null {
  if (!event.date) return null;
  const time = (event.endTime || event.time || '').trim();
  const iso = /^\d{2}:\d{2}$/.test(time)
    ? `${event.date}T${time}:00`
    : `${event.date}T23:59:59`;
  const end = new Date(iso);
  return Number.isNaN(end.getTime()) ? null : end;
}

/** An event is expired once its end moment is in the past. */
export function isEventExpired(event: CoachEvent, now: Date = new Date()): boolean {
  const end = getEventEnd(event);
  return end !== null && end.getTime() < now.getTime();
}
