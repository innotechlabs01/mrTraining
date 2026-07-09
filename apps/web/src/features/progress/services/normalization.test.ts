import { normalizeProgress, ProgressResult, NormalizedProgress } from './normalization';

describe('Progress Normalization Service', () => {
  test('normalizeMultiSportProgressToComparableScores', () => {
    const rawProgress: ProgressResult = {
      gym: { load: 6, volume: 2400 },
      running: { load: 45, pace: 9.5 },
      tennis: { performance: 3, winRate: 0.67 },
      swimming: { load: 2000, pace: 45 },
      cycling: { power: 250, distance: 15 },
      crossfit: { score: 85, reps: 120 },
    };

    const normalized = normalizeProgress(rawProgress);

    expect(normalized.sportSimilarityScore).toBe(98);
    expect(normalized.crossSportComparisonScore).toBe(48);
    expect(normalized.performanceConsistencyScore).toBe(0);
    expect(normalized.overallProgressScore).toBe(49);
  });

  test('returns values between 0 and 100', () => {
    const raw: ProgressResult = {
      gym: { load: 6, volume: 2400 },
      running: { load: 45, pace: 9.5 },
      tennis: { performance: 3, winRate: 0.67 },
      swimming: { load: 2000, pace: 45 },
      cycling: { power: 250, distance: 15 },
      crossfit: { score: 85, reps: 120 },
    };

    const normalized = normalizeProgress(raw);

    expect(normalized.sportSimilarityScore).toBeGreaterThanOrEqual(0);
    expect(normalized.sportSimilarityScore).toBeLessThanOrEqual(100);
    expect(normalized.crossSportComparisonScore).toBeGreaterThanOrEqual(0);
    expect(normalized.crossSportComparisonScore).toBeLessThanOrEqual(100);
    expect(normalized.performanceConsistencyScore).toBeGreaterThanOrEqual(0);
    expect(normalized.performanceConsistencyScore).toBeLessThanOrEqual(100);
    expect(normalized.overallProgressScore).toBeGreaterThanOrEqual(0);
    expect(normalized.overallProgressScore).toBeLessThanOrEqual(100);
  });

  test('handles maximum values', () => {
    const raw: ProgressResult = {
      gym: { load: 20, volume: 5000 },
      running: { load: 100, pace: 3 },
      tennis: { performance: 10, winRate: 1 },
      swimming: { load: 5000, pace: 30 },
      cycling: { power: 400, distance: 100 },
      crossfit: { score: 100, reps: 200 },
    };

    const normalized = normalizeProgress(raw);

    expect(normalized.sportSimilarityScore).toBe(100);
    expect(normalized.crossSportComparisonScore).toBe(100);
  });

  test('handles minimum values', () => {
    const raw: ProgressResult = {
      gym: { load: 0, volume: 0 },
      running: { load: 0, pace: 15 },
      tennis: { performance: 0, winRate: 0 },
      swimming: { load: 0, pace: 120 },
      cycling: { power: 50, distance: 0 },
      crossfit: { score: 0, reps: 0 },
    };

    const normalized = normalizeProgress(raw);

    expect(normalized.sportSimilarityScore).toBe(100);
    expect(normalized.crossSportComparisonScore).toBe(0);
    expect(normalized.performanceConsistencyScore).toBe(0);
    expect(normalized.overallProgressScore).toBe(33);
  });

  test('handles perfectly consistent values', () => {
    const raw: ProgressResult = {
      gym: { load: 10, volume: 2500 },
      running: { load: 10, pace: 9 },
      tennis: { performance: 10, winRate: 0.5 },
      swimming: { load: 10, pace: 75 },
      cycling: { power: 10, distance: 50 },
      crossfit: { score: 10, reps: 100 },
    };

    const normalized = normalizeProgress(raw);

    expect(normalized.performanceConsistencyScore).toBe(100);
  });
});
