type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';

export class ThermalManager {
  private thermal: ThermalState = 'nominal';

  setThermal(thermal: ThermalState): void {
    this.thermal = thermal;
  }

  targetFps(): number {
    switch (this.thermal) {
      case 'nominal':
        return 12;
      case 'fair':
        return 10;
      case 'serious':
        return 6;
      case 'critical':
        return 3;
    }
  }

  reduceResolution(): boolean {
    return this.thermal === 'serious' || this.thermal === 'critical';
  }

  shouldReachLighterModel(): boolean {
    return this.thermal === 'critical';
  }
}
