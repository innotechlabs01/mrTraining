export interface GymMetrics { load: number; volume: number; }
export interface RunningMetrics { load: number; pace: number; }
export interface TennisMetrics { performance: number; winRate: number; }
export interface SwimmingMetrics { load: number; pace: number; }
export interface CyclingMetrics { power: number; distance: number; }
export interface CrossfitMetrics { score: number; reps: number; }

export interface ProgressResult {
  gym: GymMetrics;
  running: RunningMetrics;
  tennis: TennisMetrics;
  swimming: SwimmingMetrics;
  cycling: CyclingMetrics;
  crossfit: CrossfitMetrics;
}

export interface NormalizedProgress {
  sportSimilarityScore: number;
  crossSportComparisonScore: number;
  performanceConsistencyScore: number;
  overallProgressScore: number;
}

const SPORT_RANGES = {
  gym: { loadMin: 0, loadMax: 20, volumeMin: 0, volumeMax: 5000 },
  running: { loadMin: 0, loadMax: 100, paceMin: 3, paceMax: 15 },
  tennis: { performanceMin: 0, performanceMax: 10, winRateMin: 0, winRateMax: 1 },
  swimming: { loadMin: 0, loadMax: 5000, paceMin: 30, paceMax: 120 },
  cycling: { powerMin: 50, powerMax: 400, distanceMin: 0, distanceMax: 100 },
  crossfit: { scoreMin: 0, scoreMax: 100, repsMin: 0, repsMax: 200 },
};

export function normalizeProgress(raw: ProgressResult): NormalizedProgress {
  const sportSimilarityScore = calculateSportSimilarityScore(raw);
  const crossSportComparisonScore = calculateCrossSportComparisonScore(raw);
  const performanceConsistencyScore = calculatePerformanceConsistencyScore(raw);

  return {
    sportSimilarityScore,
    crossSportComparisonScore,
    performanceConsistencyScore,
    overallProgressScore: Math.round((sportSimilarityScore + crossSportComparisonScore + performanceConsistencyScore) / 3),
  };
}

function calculateSportSimilarityScore(raw: ProgressResult): number {
  const normalizedValues = [
    normalizeValue(raw.gym.load, SPORT_RANGES.gym.loadMin, SPORT_RANGES.gym.loadMax),
    normalizeValue(raw.running.load, SPORT_RANGES.running.loadMin, SPORT_RANGES.running.loadMax),
    normalizeValue(raw.tennis.performance, SPORT_RANGES.tennis.performanceMin, SPORT_RANGES.tennis.performanceMax),
    normalizeValue(raw.swimming.load, SPORT_RANGES.swimming.loadMin, SPORT_RANGES.swimming.loadMax),
    normalizeValue(raw.cycling.power, SPORT_RANGES.cycling.powerMin, SPORT_RANGES.cycling.powerMax),
    normalizeValue(raw.crossfit.score, SPORT_RANGES.crossfit.scoreMin, SPORT_RANGES.crossfit.scoreMax),
  ];

  const mean = normalizedValues.reduce((a, b) => a + b, 0) / normalizedValues.length;
  const variance = normalizedValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / normalizedValues.length;
  const stdDev = Math.sqrt(variance);

  return Math.round(100 - stdDev * 10);
}

function calculateCrossSportComparisonScore(raw: ProgressResult): number {
  const scores = [
    calculateSportScore(raw.gym.load, SPORT_RANGES.gym.loadMin, SPORT_RANGES.gym.loadMax),
    calculateSportScore(raw.running.load, SPORT_RANGES.running.loadMin, SPORT_RANGES.running.loadMax),
    calculateSportScore(raw.tennis.performance, SPORT_RANGES.tennis.performanceMin, SPORT_RANGES.tennis.performanceMax),
    calculateSportScore(raw.swimming.load, SPORT_RANGES.swimming.loadMin, SPORT_RANGES.swimming.loadMax),
    calculateSportScore(raw.cycling.power, SPORT_RANGES.cycling.powerMin, SPORT_RANGES.cycling.powerMax),
    calculateSportScore(raw.crossfit.score, SPORT_RANGES.crossfit.scoreMin, SPORT_RANGES.crossfit.scoreMax),
  ];

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avgScore);
}

function calculatePerformanceConsistencyScore(raw: ProgressResult): number {
  const values = [
    raw.gym.load, raw.running.load, raw.tennis.performance,
    raw.swimming.load, raw.cycling.power, raw.crossfit.score,
  ];

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const consistencyScore = range === 0 ? 100 : Math.round((1 - range / max) * 100);

  return Math.max(0, Math.min(100, consistencyScore));
}

function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function calculateSportScore(value: number, min: number, max: number): number {
  return Math.round(normalizeValue(value, min, max) * 100);
}
