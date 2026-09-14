import type { RepQuality } from '../domain/RepTypes';
import type { RepResult } from './RepEngine';
import type { MovementMetrics } from './MovementEngine';

export interface FormResult {
  score: number;
  quality: RepQuality;
  maxScore: number;
  avgScore: number;
}

export class FormEngine {
  private max = 0;
  private total = 0;
  private n = 0;

  track(metrics: MovementMetrics): void {
    void metrics; // completeness metric hook for future degradation trend
  }

  private cap(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }

  scoreRep(_result: RepResult, samples: MovementMetrics[], def: { form: { maxLateralSway: number; minSymmetry: number; minKneeForGoodDeg: number } }): FormResult {
    if (samples.length === 0) {
      return { score: 0, quality: 'UNKNOWN', maxScore: this.max, avgScore: this.avg() };
    }
    const sway = Math.max(...samples.map((s) => s.lateralSway));
    const symmetry = Math.min(...samples.map((s) => s.symmetry));
    const minKnee = Math.min(...samples.map((s) => s.kneeAngleDeg));

    let score = 100;
    const swayPenalty = this.cap(sway - def.form.maxLateralSway, 0, 0.25) * 100;
    const symPenalty = this.cap(def.form.minSymmetry - symmetry, 0, 0.3) * 80;
    const depthBonus = Math.max(0, def.form.minKneeForGoodDeg - minKnee); // deeper = bonus pool
    score = Math.round(score - swayPenalty - symPenalty + this.cap(depthBonus, 0, 5));

    let quality: RepQuality = score >= 85 ? 'GOOD' : score >= 60 ? 'REGULAR' : 'BAD';

    this.total += score;
    this.n += 1;
    this.max = Math.max(this.max, score);

    return { score, quality, maxScore: this.max, avgScore: this.avg() };
  }

  private avg(): number {
    return this.n === 0 ? 0 : Math.round(this.total / this.n);
  }
}
