import { buildExpoUrl } from './expoLink';

describe('buildExpoUrl', () => {
  it('generates exp:// scheme URL with code', () => {
    const url = buildExpoUrl('MR-A3X9');
    expect(url).toBe('exp://mobile.innotechlabssas.lat?code=MR-A3X9');
  });

  it('generates exp:// scheme URL without code', () => {
    const url = buildExpoUrl('');
    expect(url).toBe('exp://mobile.innotechlabssas.lat');
  });

  it('encodes special characters in the code', () => {
    const url = buildExpoUrl('MR A#9');
    expect(url).toContain('code=MR');
  });
});
