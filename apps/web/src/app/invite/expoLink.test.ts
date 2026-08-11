import { buildExpoUrl, EXPO_LINK_BASE, EXPO_RUNTIME_VERSION, EXPO_CHANNEL_NAME } from './expoLink';

describe('buildExpoUrl', () => {
  it('includes runtime-version and channel-name in the base link', () => {
    expect(EXPO_LINK_BASE).toContain(`runtime-version=${EXPO_RUNTIME_VERSION}`);
    expect(EXPO_LINK_BASE).toContain(`channel-name=${EXPO_CHANNEL_NAME}`);
  });

  it('appends the invite path with the code when a code is provided', () => {
    const url = buildExpoUrl('MR-A3X9');
    expect(url).toContain('runtime-version=1.0.0');
    expect(url).toContain('channel-name=development');
    expect(url).toContain('/--/invite?code=MR-A3X9');
  });

  it('returns the base link without a path when no code is provided', () => {
    expect(buildExpoUrl('')).toBe(EXPO_LINK_BASE);
    expect(buildExpoUrl('')).not.toContain('/--/');
  });

  it('encodes special characters in the code', () => {
    const url = buildExpoUrl('MR A#9');
    expect(url).toContain('code=MR%20A%239');
  });
});
