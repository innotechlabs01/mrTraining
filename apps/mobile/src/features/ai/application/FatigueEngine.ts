import type { MovementMetrics } from './MovementEngine';

export interface FailureLevel { proximity: 0 | 1 | 2 | 3; advice: string | null; }

const ADVICE: Record<number, string | null> = {
  0: null,
  1: 'Tu técnica está empezando a bajar.',
  2: 'Últimas repeticiones. Mantén el control.',
  3: 'Es mejor descansar.',
};

export class FatigueEngine {
  private slowCount = 0;
  private badFormCount = 0;

  update(metrics: MovementMetrics, formScore: number): FailureLevel {
    const slow = metrics.velocityDegPerSec < 60;
    const poorForm = formScore < 55;
    const sway = metrics.lateralSway > 0.08;

    if (slow) this.slowCount = Math.min(this.slowCount + 1, 6);
    else this.slowCount = Math.max(this.slowCount - 1, 0);

    if (poorForm || sway) this.badFormCount = Math.min(this.badFormCount + 1, 6);
    else this.badFormCount = Math.max(this.badFormCount - 1, 0);

    if (this.badFormCount >= 5) return { proximity: 3, advice: ADVICE[3] };
    if (this.slowCount >= 4 && this.badFormCount >= 2) return { proximity: 2, advice: ADVICE[2] };
    if (this.slowCount >= 2 || this.badFormCount >= 2) return { proximity: 1, advice: ADVICE[1] };
    return { proximity: 0, advice: ADVICE[0] };
  }
}
