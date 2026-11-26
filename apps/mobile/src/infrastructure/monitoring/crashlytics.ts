import Constants from 'expo-constants';

type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics');

let initialized = false;

function shouldInitialize(): boolean {
  return Constants.expoConfig?.extra?.crashlyticsEnabled === true;
}

/**
 * Installs Crashlytics' global JS exception and unhandled-rejection handlers in
 * QA builds only. The native module is absent from dev/production builds, so it
 * is required lazily and only after the resolved Expo config opts in.
 */
export function initializeCrashlytics(): void {
  if (initialized || !shouldInitialize()) {
    return;
  }

  initialized = true;

  try {
    // Lazy require is intentional: dev/prod do not link the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCrashlytics } = require('@react-native-firebase/crashlytics') as CrashlyticsModule;
    getCrashlytics();
  } catch (error) {
    initialized = false;
    if (__DEV__) {
      console.warn('[Crashlytics] initialization failed', error);
    }
  }
}
