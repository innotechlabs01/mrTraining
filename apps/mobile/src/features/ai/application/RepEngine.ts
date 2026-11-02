import { RepState, type RepQuality, type RepValidity, type RepRules, type ExerciseDefinition } from '../domain/RepTypes';
import type { MovementMetrics } from './MovementEngine';

export interface RepResult {
  state: RepState;
  counted: boolean;
  quality: RepQuality;
  validity: RepValidity;
  reason: string | null;
  romKneeDeg: number;
  repStartMs: number;
}

interface Counts { good: number; regular: number; bad: number; unknown: number; }

export class RepEngine {
  private state: RepState = RepState.IDLE;
  private bottomKnee = 180;
  private repStartMs = 0;
  private counts: Counts = { good: 0, regular: 0, bad: 0, unknown: 0 };

  reset(): void {
    this.state = RepState.IDLE;
    this.bottomKnee = 180;
    this.repStartMs = 0;
  }

  getState(): RepState { return this.state; }
  getCounts(): Counts { return { ...this.counts }; }

  private rollbackToIdle(): void {
    this.state = RepState.IDLE;
    this.bottomKnee = 180;
  }

  step(metrics: MovementMetrics, nowMs: number, def: ExerciseDefinition): RepResult | null {
    if (!(def.movement.minConfidence > 0) || metrics.kneeAngleDeg > 330) {
      this.rollbackToIdle();
      return null;
    }

    const rules: RepRules = def.rep;

    switch (this.state) {
      case RepState.IDLE:
        if (metrics.kneeAngleDeg >= rules.topKneeAngleDeg) {
          this.state = RepState.READY;
          this.repStartMs = nowMs;
          this.bottomKnee = 180;
        }
        return null;

      case RepState.READY:
        if (metrics.kneeAngleDeg < rules.topKneeAngleDeg) {
          this.state = RepState.ECCENTRIC;
        }
        return null;

      case RepState.ECCENTRIC:
        if (metrics.kneeAngleDeg < this.bottomKnee) this.bottomKnee = metrics.kneeAngleDeg;
        // Deviation from brief sketch: a descent that never reaches BOTTOM but
        // returns above topKneeAngleDeg must still produce a (rejected) result,
        // otherwise shallow reps stay ECCENTRIC forever and never report BAD.
        if (metrics.kneeAngleDeg > rules.topKneeAngleDeg) {
          return this.finish(nowMs, def);
        }
        if (metrics.kneeAngleDeg <= rules.bottomKneeAngleDeg) {
          this.state = RepState.BOTTOM;
        }
        return null;

      case RepState.BOTTOM:
        if (metrics.kneeAngleDeg < this.bottomKnee) this.bottomKnee = metrics.kneeAngleDeg;
        if (metrics.kneeAngleDeg > rules.topKneeAngleDeg) {
          return this.finish(nowMs, def);
        }
        return null;

      default:
        return null;
    }
  }

  private finish(nowMs: number, def: ExerciseDefinition): RepResult {
    // Deviation from brief sketch: capture before rollback. Sketch reads
    // this.bottomKnee after rollbackToIdle(), which always reports 180.
    const bottomKnee = this.bottomKnee;
    const startMs = this.repStartMs;
    const duration = nowMs - startMs;
    const travel = 180 - bottomKnee;
    const minTravel = def.rep.minAngleTravelDeg;
    const durOk = duration >= def.rep.minRepDurationMs && duration <= def.rep.maxRepDurationMs;
    this.state = RepState.COMPLETED;

    let quality: RepQuality;
    let validity: RepValidity;
    let counted: boolean;
    let reason: string | null = null;

    if (bottomKnee > def.rep.goodKneeAngleDeg) {
      quality = 'BAD';
      validity = 'INVALID';
      counted = false;
      reason = 'Profundidad insuficiente. Baja más.';
    } else if (travel < minTravel) {
      quality = 'BAD';
      validity = 'INVALID';
      counted = false;
      reason = 'Movimiento incompleto.';
    } else if (!durOk) {
      quality = 'BAD';
      validity = 'INVALID';
      counted = false;
      reason = 'Controla el tempo del movimiento.';
    } else {
      quality = 'GOOD';
      validity = 'VALID';
      counted = true;
    }

    if (quality === 'GOOD') this.counts.good += 1;
    else this.counts.bad += 1;

    this.rollbackToIdle();
    return {
      state: RepState.COMPLETED, counted, quality, validity, reason,
      romKneeDeg: bottomKnee, repStartMs: startMs,
    };
  }
}