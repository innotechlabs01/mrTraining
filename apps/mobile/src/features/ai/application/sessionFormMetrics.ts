import type { FormMetrics } from '../../training/presentation/components/FormAnalyzer';
import type { AiSessionSummary } from '../presentation/hooks/useSessionSummary';

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Map a completed AI session summary to the execution FormMetrics shape.
 * depth: knee ROM (deg) capped at 100 — deeper reps reach higher ROM.
 * alignment: session avg form — sway/symmetry penalties dominate the score.
 * tempo: avg rep duration normalized (50 ms ≈ 1 point, capped).
 */
export function summaryToFormMetrics(s: AiSessionSummary): FormMetrics {
  return {
    depth: clampPct(s.avgRom),
    alignment: clampPct(s.avgForm),
    tempo: clampPct(s.avgTempoMs / 50),
  };
}
