export class FrameScheduler {
  private lastRunMs = -Infinity;
  private targetFps: number;

  constructor(targetFps = 12) {
    this.targetFps = targetFps;
  }

  get periodMs(): number {
    return Math.floor(1000 / this.targetFps);
  }

  setTargetFps(fps: number): void {
    this.targetFps = Math.max(1, Math.min(30, Math.round(fps)));
  }

  shouldRun(nowMs: number): boolean {
    if (nowMs - this.lastRunMs >= this.periodMs) {
      this.lastRunMs = nowMs;
      return true;
    }
    return false;
  }
}
