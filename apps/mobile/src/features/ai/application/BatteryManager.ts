export class BatteryManager {
  private pct = 100;
  private charging = false;

  setLevel(pct: number, charging: boolean): void {
    this.pct = Math.max(0, Math.min(100, pct));
    this.charging = charging;
  }

  reducesInference(): boolean {
    return !this.charging && this.pct < 20;
  }

  targetFps(): number {
    return this.reducesInference() ? 6 : 12;
  }
}
