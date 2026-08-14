const EXPO_HOST = process.env.EXPO_HOST || 'mobile.innotechlabssas.lat';

export function buildExpoUrl(code: string) {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const queryString = params.toString();
  return `exp://${EXPO_HOST}${queryString ? `?${queryString}` : ''}`;
}
