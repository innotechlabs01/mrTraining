import { analyzeProgress, analyzeTrend, predictPerformance, actionableInsights } from './analytics';

describe('Progress Analytics Service', () => {
  const mockData = [
    { date: '2026-01-01', value: 40 },
    { date: '2026-02-01', value: 55 },
    { date: '2026-03-01', value: 70 },
    { date: '2026-04-01', value: 65 },
    { date: '2026-05-01', value: 85 },
  ];

  test('analyzeTrend returns trend direction and magnitude', () => {
    const trend = analyzeTrend(mockData);
    expect(trend).toHaveProperty('direction');
    expect(trend).toHaveProperty('magnitude');
    expect(trend).toHaveProperty('confidence');
    expect(['up', 'down', 'stable']).toContain(trend.direction);
    expect(trend.magnitude).toBeGreaterThanOrEqual(0);
    expect(trend.confidence).toBeGreaterThanOrEqual(0);
    expect(trend.confidence).toBeLessThanOrEqual(1);
  });

  test('predictPerformance returns future projections', () => {
    const prediction = predictPerformance(mockData, 30);
    expect(prediction).toHaveProperty('predictedValue');
    expect(prediction).toHaveProperty('confidenceInterval');
    expect(prediction.confidenceInterval).toHaveProperty('lower');
    expect(prediction.confidenceInterval).toHaveProperty('upper');
    expect(prediction.predictedValue).toBeGreaterThan(0);
  });

  test('generateActionableInsights returns actionable items', () => {
    const insights = actionableInsights(mockData);
    expect(Array.isArray(insights)).toBe(true);
    insights.forEach(insight => {
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('message');
      expect(insight).toHaveProperty('priority');
      expect(['improvement', 'decline', 'plateau', 'achievement']).toContain(insight.type);
      expect(['low', 'medium', 'high']).toContain(insight.priority);
    });
  });

  test('analyzeProgress runs all analytics and returns comprehensive result', () => {
    const result = analyzeProgress(mockData);
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('prediction');
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('summary');
    expect(typeof result.summary).toBe('string');
  });

  test('handles datasets with duplicate points and maintains O(n) linear performance', () => {
    // Points with duplicate references/values to verify index calculation
    const point = { date: '2026-06-01', value: 50 };
    const duplicateData = [point, { date: '2026-06-02', value: 60 }, point];
    const trend = analyzeTrend(duplicateData);
    expect(trend).toBeDefined();
    expect(trend.confidence).toBeGreaterThanOrEqual(0);

    // Large scale dataset to confirm O(n) performance without freezing
    const largeData = Array.from({ length: 5000 }, (_, i) => ({
      date: `2026-01-${(i % 28) + 1}`,
      value: 50 + i * 1.5,
    }));
    const start = Date.now();
    const largeResult = analyzeProgress(largeData);
    const durationMs = Date.now() - start;

    expect(largeResult.trend.direction).toBe('up');
    expect(durationMs).toBeLessThan(100); // 5000 points completes in a few milliseconds
  });
});
