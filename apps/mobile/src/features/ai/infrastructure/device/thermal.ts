/**
 * Swap point for device thermal state (mirrors PoseRuntime pattern).
 * expo-device v8 removed getThermalStateAsync, so the OS thermal source
 * (iOS ProcessInfo.thermalState / Android PowerManager) is read natively in a
 * later task. Consumers shape their logic against this typed boundary and never
 * depend on the concrete sensor module.
 */
export type ThermalRead = 'nominal' | 'fair' | 'serious' | 'critical';

export async function readThermalState(): Promise<ThermalRead> {
  // Native thermal read pending: returns nominal until the native bridge lands.
  return 'nominal';
}