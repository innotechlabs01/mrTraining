import { texts } from '../../../shared/i18n/texts';
import type { RecoveryState } from './useRecoveryData';

const tr = texts.screens.recovery;

// Recommendations derive only from measured signals — no demo values.
export function useRecommendations(recovery: RecoveryState): string[] {
  const { lastNight, hrvToday, hrvBaseline, rhrToday, rhrBaseline } = recovery;

  const recommendations: string[] = [];
  if (lastNight && lastNight.totalMinutes < 420) {
    recommendations.push(tr.recLowSleep);
  }
  if (hrvToday != null && hrvBaseline != null && hrvToday < hrvBaseline * 0.85) {
    recommendations.push(tr.recLowHrv);
  }
  if (rhrToday != null && rhrBaseline != null && rhrToday > rhrBaseline + 5) {
    recommendations.push(tr.recHighRhr);
  }
  if (recommendations.length === 0 && recovery.readinessScore != null && recovery.readinessScore >= 80) {
    recommendations.push(tr.recRecovered);
  }
  return recommendations;
}
