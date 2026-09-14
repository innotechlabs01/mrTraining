import type { SessionRep } from '../hooks/useSessionSummary';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import { computeAiSessionSummary } from '../hooks/useSessionSummary';

function rep(partial: Partial<SessionRep> & { counted: boolean }): SessionRep {
  return {
    quality: partial.quality ?? 'GOOD',
    score: partial.score ?? 90,
    romKneeDeg: partial.romKneeDeg ?? 80,
    durationMs: partial.durationMs ?? 2000,
    velocityDegPerSec: partial.velocityDegPerSec ?? 100,
    ...partial,
  };
}

describe('computeAiSessionSummary', () => {
  it('aggregates valid and rejected reps', () => {
    const reps = [
      rep({ counted: true, score: 90, romKneeDeg: 80, durationMs: 2000, velocityDegPerSec: 100 }),
      rep({ counted: true, score: 70, romKneeDeg: 70, durationMs: 3000, velocityDegPerSec: 80 }),
      rep({ counted: false, score: 40, romKneeDeg: 95 }),
    ];

    const s = computeAiSessionSummary({ exercise: 'squat', target: 2, reps, failureProximity: 0.42 });

    expect(s.exercise).toBe('squat');
    expect(s.target).toBe(2);
    expect(s.completed).toBe(2);
    expect(s.rejected).toBe(1);
    expect(s.avgForm).toBe(80);
    expect(s.bestForm).toBe(90);
    expect(s.avgRom).toBe(75);
    expect(s.avgTempoMs).toBe(2500);
    expect(s.failureProximity).toBe(0.42);
  });

  it('reports flat trend with fewer than four reps or stable velocity', () => {
    const one = [rep({ counted: true })];
    expect(computeAiSessionSummary({ exercise: 'squat', target: 1, reps: one, failureProximity: 0 }).velocityTrend)
      .toBe('flat');

    const stable = [80, 82, 81, 83].map((v) => rep({ counted: true, velocityDegPerSec: v }));
    expect(computeAiSessionSummary({ exercise: 'squat', target: 4, reps: stable, failureProximity: 0 }).velocityTrend)
      .toBe('flat');
  });

  it('detects velocity trend from meaningful drift', () => {
    const slowing = [120, 115, 100, 90].map((v) => rep({ counted: true, velocityDegPerSec: v }));
    expect(computeAiSessionSummary({ exercise: 'squat', target: 4, reps: slowing, failureProximity: 0 }).velocityTrend)
      .toBe('down');

    const speeding = [90, 100, 115, 120].map((v) => rep({ counted: true, velocityDegPerSec: v }));
    expect(computeAiSessionSummary({ exercise: 'squat', target: 4, reps: speeding, failureProximity: 0 }).velocityTrend)
      .toBe('up');
  });

  it('is empty-safe', () => {
    const s = computeAiSessionSummary({ exercise: 'squat', target: 12, reps: [], failureProximity: 0 });
    expect(s.completed).toBe(0);
    expect(s.rejected).toBe(0);
    expect(s.avgForm).toBe(0);
    expect(s.bestForm).toBe(0);
    expect(s.avgRom).toBe(0);
    expect(s.avgTempoMs).toBe(0);
    expect(s.velocityTrend).toBe('flat');
  });
});