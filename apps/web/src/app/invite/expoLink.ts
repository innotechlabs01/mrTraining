const EXPO_HOST = process.env.EXPO_HOST || 'mobile.innotechlabssas.lat';
const APP_SCHEME = 'mrtraining';

/**
 * Build the URL to open the invite in the app.
 * Priority: custom scheme (installed app) > exp:// (Expo Go) > HTTPS (web fallback)
 */
export function buildExpoUrl(code: string): string {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const query = params.toString();

  // Custom scheme works for installed app (App Store / Play Store builds)
  return `${APP_SCHEME}://invite${query ? `?${query}` : ''}`;
}

/**
 * Build Expo Go URL for development/testing
 */
export function buildExpoGoUrl(code: string): string {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const query = params.toString();
  return `exp://${EXPO_HOST}${query ? `?${query}` : ''}`;
}
