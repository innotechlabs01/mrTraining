import { toGoApiPath } from '../client';

describe('GO_API_PATH_MAP / toGoApiPath', () => {
  it('maps /athlete/progress/summary to /progress/summary', () => {
    expect(toGoApiPath('/athlete/progress/summary')).toBe('/progress/summary');
  });

  it('preserves query strings when mapping /athlete/progress/summary', () => {
    expect(toGoApiPath('/athlete/progress/summary?start_date=2026-01-01')).toBe(
      '/progress/summary?start_date=2026-01-01',
    );
  });
});
