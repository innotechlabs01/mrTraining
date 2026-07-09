export interface ProgressDataPoint {
  date: string;
  value: number;
}

export interface TrendResult {
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  confidence: number;
}

export interface PredictionResult {
  predictedValue: number;
  confidenceInterval: { lower: number; upper: number };
}

export interface Insight {
  type: 'improvement' | 'decline' | 'plateau' | 'achievement';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AnalyticsResult {
  trend: TrendResult;
  prediction: PredictionResult;
  insights: Insight[];
  summary: string;
}

function linearRegression(data: ProgressDataPoint[]) {
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, d) => sum + d.value, 0) / n;

  let numerator = 0;
  let denominator = 0;
  data.forEach((d, i) => {
    const xDiff = i - xMean;
    const yDiff = d.value - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  });

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const ssRes = data.reduce((sum, d) => {
    const predicted = slope * data.indexOf(d) + intercept;
    return sum + Math.pow(d.value - predicted, 2);
  }, 0);

  const ssTot = data.reduce((sum, d) => sum + Math.pow(d.value - yMean, 2), 0);
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared, yMean };
}

export function analyzeTrend(data: ProgressDataPoint[]): TrendResult {
  const { slope, rSquared } = linearRegression(data);
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const magnitude = first !== 0 ? Math.abs((last - first) / first) * 100 : 0;

  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(slope) < 0.5) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return {
    direction,
    magnitude: Math.round(magnitude * 100) / 100,
    confidence: Math.round(rSquared * 100) / 100,
  };
}

export function predictPerformance(data: ProgressDataPoint[], daysAhead: number): PredictionResult {
  const { slope, intercept, yMean } = linearRegression(data);
  const n = data.length;
  const lastIndex = n - 1;
  const predictedValue = slope * (lastIndex + daysAhead / 30) + intercept;

  const variance = data.reduce((sum, d) => sum + Math.pow(d.value - yMean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const stdErr = stdDev / Math.sqrt(n);
  const margin = 1.96 * stdErr;

  return {
    predictedValue: Math.round(predictedValue * 100) / 100,
    confidenceInterval: {
      lower: Math.round((predictedValue - margin) * 100) / 100,
      upper: Math.round((predictedValue + margin) * 100) / 100,
    },
  };
}

export function actionableInsights(data: ProgressDataPoint[]): Insight[] {
  const insights: Insight[] = [];
  const { slope } = linearRegression(data);

  const last3 = data.slice(-3);
  const last3Mean = last3.reduce((s, d) => s + d.value, 0) / last3.length;
  const last3Variance = last3.reduce((s, d) => s + Math.pow(d.value - last3Mean, 2), 0) / last3.length;
  const last3StdDev = Math.sqrt(last3Variance);
  const isPlateau = last3Mean !== 0 && (last3StdDev / last3Mean) < 0.05;

  if (isPlateau) {
    insights.push({
      type: 'plateau',
      message: 'Performance has plateaued recently. Consider varying your training routine.',
      priority: 'medium',
    });
  }

  const recentChange = data[data.length - 1].value - data[data.length - 2].value;

  if (slope > 0) {
    insights.push({
      type: 'improvement',
      message: 'Overall performance is improving. Keep up the consistent effort!',
      priority: 'high',
    });
    if (recentChange > 0) {
      insights.push({
        type: 'improvement',
        message: 'Your most recent session shows improvement over the previous one.',
        priority: 'medium',
      });
    }
  } else if (slope < 0) {
    insights.push({
      type: 'decline',
      message: 'Performance trend is declining. Consider adjusting your training approach.',
      priority: 'high',
    });
  }

  if (recentChange < -5) {
    insights.push({
      type: 'decline',
      message: 'Significant drop detected in your latest performance.',
      priority: 'high',
    });
  }

  const maxValue = Math.max(...data.map(d => d.value));
  if (data[data.length - 1].value === maxValue && data.length >= 3) {
    insights.push({
      type: 'achievement',
      message: 'New personal best! You reached your highest performance yet.',
      priority: 'high',
    });
  }

  return insights;
}

export function analyzeProgress(data: ProgressDataPoint[]): AnalyticsResult {
  const trend = analyzeTrend(data);
  const prediction = predictPerformance(data, 30);
  const insights = actionableInsights(data);

  const summary = `Performance trend is ${trend.direction} with ${trend.confidence * 100}% confidence. ` +
    `Projected performance in 30 days: ${prediction.predictedValue}. ` +
    `${insights.length} insight${insights.length !== 1 ? 's' : ''} identified.`;

  return { trend, prediction, insights, summary };
}
