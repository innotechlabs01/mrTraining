import { shouldShowOfflineBanner } from '../offlineBannerVisibility';

describe('shouldShowOfflineBanner', () => {
  it('shows when definitely offline', () => {
    expect(shouldShowOfflineBanner(false)).toBe(true);
  });

  it('hides when online', () => {
    expect(shouldShowOfflineBanner(true)).toBe(false);
  });

  it('hides while the state is unknown (boot) to avoid a flash', () => {
    expect(shouldShowOfflineBanner(null)).toBe(false);
  });
});
