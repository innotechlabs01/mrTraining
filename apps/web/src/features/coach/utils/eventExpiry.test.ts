import { getEventEnd, isEventExpired } from './eventExpiry';
import type { CoachEvent } from '@/features/coach/types';

function makeEvent(overrides: Partial<CoachEvent>): CoachEvent {
  return {
    id: 'e1',
    title: 'Carrera',
    date: '2026-10-10',
    time: '07:00',
    endTime: '09:00',
    type: 'competition',
    modality: 'running',
    athleteIds: [],
    status: 'scheduled',
    ...overrides,
  };
}

describe('eventExpiry', () => {
  const now = new Date('2026-10-10T12:00:00');

  it('is expired once the end time has passed', () => {
    expect(isEventExpired(makeEvent({ endTime: '11:00' }), now)).toBe(true);
  });

  it('is not expired while the event is still running or ahead', () => {
    expect(isEventExpired(makeEvent({ endTime: '13:00' }), now)).toBe(false);
    expect(isEventExpired(makeEvent({ date: '2026-10-11' }), now)).toBe(false);
  });

  it('treats a past day as expired even without a time', () => {
    expect(isEventExpired(makeEvent({ date: '2026-10-09', time: '', endTime: '' }), now)).toBe(true);
    expect(isEventExpired(makeEvent({ date: '2026-10-10', time: '', endTime: '' }), now)).toBe(false);
  });

  it('falls back to endTime, then time', () => {
    const d1 = getEventEnd(makeEvent({ endTime: '18:00' }));
    expect(d1).not.toBeNull();
    expect(d1!.getHours()).toBe(18);
    expect(d1!.getMinutes()).toBe(0);

    const d2 = getEventEnd(makeEvent({ endTime: '', time: '15:30' }));
    expect(d2).not.toBeNull();
    expect(d2!.getHours()).toBe(15);
    expect(d2!.getMinutes()).toBe(30);
  });

  it('returns null and stays unexpired without a date', () => {
    expect(getEventEnd(makeEvent({ date: '' }))).toBeNull();
    expect(isEventExpired(makeEvent({ date: '' }), now)).toBe(false);
  });
});
