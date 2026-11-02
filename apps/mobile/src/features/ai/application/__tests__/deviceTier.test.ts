import { DeviceTier } from '../DeviceTier';
import { BatteryManager } from '../BatteryManager';
import { ThermalManager } from '../ThermalManager';

describe('DeviceTier', () => {
  it('returns LOW_END on low power and hot', () => {
    expect(DeviceTier.from(true, true)).toBe('LOW_END');
  });
});

describe('BatteryManager', () => {
  it('reduces inference under 20% and not charging', () => {
    const b = new BatteryManager();
    b.setLevel(15, false);
    expect(b.reducesInference()).toBe(true);
    expect(b.targetFps()).toBeLessThanOrEqual(8);
  });
  it('keeps 12fps while healthy', () => {
    const b = new BatteryManager();
    b.setLevel(80, false);
    expect(b.targetFps()).toBe(12);
  });
});

describe('ThermalManager', () => {
  it('serious thermal cuts fps and suggests resolution drop', () => {
    const t = new ThermalManager();
    t.setThermal('serious');
    expect(t.targetFps()).toBeLessThan(12);
    expect(t.reduceResolution()).toBe(true);
  });
});
