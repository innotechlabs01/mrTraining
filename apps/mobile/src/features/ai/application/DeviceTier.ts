export type DeviceTierName = 'HIGH_END' | 'MID_RANGE' | 'LOW_END';

export class DeviceTier {
  static from(isLowPower: boolean, isHot: boolean): DeviceTierName {
    if (isLowPower && isHot) return 'LOW_END';
    if (isLowPower || isHot) return 'MID_RANGE';
    return 'HIGH_END';
  }
}
