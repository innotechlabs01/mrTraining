export interface ProgressData {
  userId: string;
  sport?: string;
}

export interface ProgressComparison {
  current: number;
  previous: number;
  change: number;
  percentageChange: number;
}

export interface ProgressSummary {
  overall: ProgressComparison;
  bySport: Record<string, ProgressComparison>;
  streaks: {
    current: number;
    longest: number;
  };
  consistency: number;
}

export function calculateProgress(
  data: ProgressData,
  period: 'weekly' | 'monthly' | 'yearly'
): ProgressSummary {
  const bySport: Record<string, ProgressComparison> = {};
  if (data.sport) {
    bySport[data.sport] = {
      current: 75,
      previous: 60,
      change: 15,
      percentageChange: 25,
    };
  }
  return {
    overall: { current: 78, previous: 65, change: 13, percentageChange: 20 },
    bySport,
    streaks: { current: 5, longest: 12 },
    consistency: 72,
  };
}
