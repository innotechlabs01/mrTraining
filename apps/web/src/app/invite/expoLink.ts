const EXPO_HOST = process.env.EXPO_HOST || 'mobile.innotechlabssas.lat';
const APP_SCHEME = 'mrtraining';

/**
 * Build the Expo Go URL for development/testing.
 * Returns exp:// scheme URL that Expo Go can open directly.
 */
export function buildExpoUrl(code: string): string {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const query = params.toString();
  return `exp://${EXPO_HOST}${query ? `?${query}` : ''}`;
}

/**
 * Build Universal Link URL for iOS.
 * Works with Development Builds and production App Store builds.
 * iOS opens the app directly when AASA is configured.
 */
export function buildUniversalLink(code: string): string {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const query = params.toString();
  return `https://${EXPO_HOST}/invite${query ? `?${query}` : ''}`;
}

/**
 * Build Expo Go URL for development/testing
 * Expo Go needs the /--/ path prefix to route to the correct screen
 */
export function buildExpoGoUrl(code: string): string {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const query = params.toString();
  return `exp://${EXPO_HOST}/--/invite${query ? `?${query}` : ''}`;
}
