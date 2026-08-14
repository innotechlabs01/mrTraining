export function buildExpoUrl(code: string) {
  const params = new URLSearchParams();
  if (code) {
    params.set('code', code);
  }
  const queryString = params.toString();
  return `mrtraining://invite${queryString ? `?${queryString}` : ''}`;
}
