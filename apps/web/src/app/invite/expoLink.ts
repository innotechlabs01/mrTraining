export const EXPO_PROJECT_ID = 'c4e4a8cc-bcf6-43cd-8d13-33bd46e6fea7';

export const EXPO_RUNTIME_VERSION = '1.0.0';

export const EXPO_CHANNEL_NAME = 'development';

export const EXPO_LINK_BASE = (
  process.env.NEXT_PUBLIC_EXPO_LINK_BASE ||
  `exp://u.expo.dev/${EXPO_PROJECT_ID}?runtime-version=${EXPO_RUNTIME_VERSION}&channel-name=${EXPO_CHANNEL_NAME}`
).replace(/\/+$/, '');

export function buildExpoUrl(code: string) {
  return code
    ? `${EXPO_LINK_BASE}/--/invite?code=${encodeURIComponent(code)}`
    : EXPO_LINK_BASE;
}
