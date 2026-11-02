// Pure scheduling helpers for the Plan tab.
//
// Backend contract (apps/api dto/training.go):
//   - an assigned workout has startDate (window start), endDate (window end)
//     and daysOfWeek (0=Sunday..6=Saturday) for the recurring days inside it.
//   - a single assignment therefore covers many future occurrences.

export type ScheduledWorkout = {
  startDate: string;
  endDate?: string;
  daysOfWeek?: number[];
};

const SEARCH_WINDOW_DAYS = 60;

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

export function parseISODate(dateStr: string): Date | null {
  const [y, m, d] = (dateStr ?? '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Next occurrence of a workout on or after `fromStr` (date-only, local).
 * Returns the occurrence date or null when the plan has no upcoming day.
 */
export function nextOccurrence(workout: ScheduledWorkout, fromStr: string): string | null {
  const start = (workout.startDate ?? '').slice(0, 10);
  const end = (workout.endDate ?? '').slice(0, 10);
  const days = workout.daysOfWeek ?? [];

  // One-off assignment: only counts when it starts on/after the reference date.
  if (days.length === 0) {
    return start && start >= fromStr ? start : null;
  }

  // Window already closed.
  if (end && end < fromStr) return null;

  // Recurrence only starts at the later of window start and reference date.
  const baseStr = start && start > fromStr ? start : fromStr;
  const base = parseISODate(baseStr);
  if (!base) return null;

  for (let i = 0; i < SEARCH_WINDOW_DAYS; i++) {
    const cur = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const curStr = toISODate(cur);
    if (end && curStr > end) return null;
    if (days.includes(cur.getDay())) return curStr;
  }
  return null;
}
