import { buildExpoUrl } from './expoLink';

describe('buildExpoUrl', () => {
  it('generates mrtraining:// scheme URL with code', () => {
    const url = buildExpoUrl('MR-A3X9');
    expect(url).toBe('mrtraining://invite?code=MR-A3X9');
  });

  it('generates mrtraining:// scheme URL without code', () => {
    const url = buildExpoUrl('');
    expect(url).toBe('mrtraining://invite');
  });

  it('encodes special characters in the code', () => {
    const url = buildExpoUrl('MR A#9');
    expect(url).toContain('code=MR');
  });
});
