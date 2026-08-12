export const EXPO_PROJECT_ID = 'c4e4a8cc-bcf6-43cd-8d13-33bd46e6fea7';

export const EXPO_RUNTIME_VERSION = '1.0.0';

export const EXPO_CHANNEL_NAME = 'development';

export function buildExpoUrl(code: string) {
  const base = `exp://u.expo.dev/${EXPO_PROJECT_ID}`;
  const path = '/--/invite';
  const params = new URLSearchParams({
    'runtime-version': EXPO_RUNTIME_VERSION,
    'channel-name': EXPO_CHANNEL_NAME,
  });
  if (code) {
    params.set('code', code);
  }
  return `${base}${path}?${params.toString()}`;
}
