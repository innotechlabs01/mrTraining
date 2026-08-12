import { buildExpoUrl, EXPO_RUNTIME_VERSION, EXPO_CHANNEL_NAME } from './expoLink';

describe('buildExpoUrl', () => {
  it('includes runtime-version and channel-name in the URL', () => {
    const url = buildExpoUrl('MR-A3X9');
    expect(url).toContain(`runtime-version=${EXPO_RUNTIME_VERSION}`);
    expect(url).toContain(`channel-name=${EXPO_CHANNEL_NAME}`);
  });

  it('appends the invite path with the code when a code is provided', () => {
    const url = buildExpoUrl('MR-A3X9');
    expect(url).toContain('/--/invite?');
    expect(url).toContain('code=MR-A3X9');
  });

  it('always includes the /--/invite path even without code', () => {
    const url = buildExpoUrl('');
    expect(url).toContain('/--/invite?');
    expect(url).not.toContain('code=');
  });

  it('encodes special characters in the code', () => {
    const url = buildExpoUrl('MR A#9');
    expect(url).toContain('code=MR+A%239');
  });

  it('generates correct format: exp://u.expo.dev/{id}/--/invite?params', () => {
    const url = buildExpoUrl('TEST');
    expect(url).toMatch(/^exp:\/\/u\.expo\.dev\/[a-f0-9-]+\/--\/invite\?/);
  });
});
