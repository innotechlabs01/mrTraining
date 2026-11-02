/**
 * Background health sync — runs when the app is in background.
 *
 * On iOS, BackgroundFetch gives ~15-minute minimum intervals (actual is system-decided).
 * On Android, WorkManager provides more control. Both converge on the same sync logic.
 *
 * The task reads the latest wearable data and pushes to /api/athlete/health/metrics.
 * Idempotency is guaranteed by the UNIQUE index on (athlete, type, recorded_at) in Turso,
 * so re-runs after a network failure simply re-send the same data harmlessly.
 */
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { syncHealthData, createHealthBridge } from './';

const TASK_NAME = 'background-health-sync';

// Must be defined at module scope, NOT inside a React component.
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const bridge = createHealthBridge();
    if (!bridge) return BackgroundFetch.BackgroundFetchResult.NoData;

    const available = await bridge.isAvailable().catch(() => false);
    if (!available) return BackgroundFetch.BackgroundFetchResult.NoData;

    const permitted = await bridge.hasPermissions().catch(() => false);
    if (!permitted) return BackgroundFetch.BackgroundFetchResult.NoData;

    const result = await syncHealthData(bridge);
    if (!result || !result.ok) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Signal that we have new data.
    return (result.metricsPushed > 0 || result.sleepPushed)
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background task. Call once at app startup (e.g., in _layout.tsx or App.tsx).
 * Safe to call multiple times — re-registration is a no-op.
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    // Already registered?
    const status = await TaskManager.isTaskRegisteredAsync(TASK_NAME).catch(() => false);
    if (status) return;

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes (iOS minimum; Android may run sooner)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch may not be available in all environments (Expo Go, simulator).
    // Fail silently — the manual sync trigger in RecoveryScreen still works.
  }
}

/**
 * Unregister on logout or cleanup.
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  } catch {
    // Ignore.
  }
}
