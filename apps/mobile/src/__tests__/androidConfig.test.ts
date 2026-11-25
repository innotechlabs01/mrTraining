import appConfig from '../../app.json';

const HEALTH_CONNECT_MIN_SDK = 26;

describe('Android build config', () => {
  it('sets minSdkVersion high enough for Health Connect', () => {
    expect(appConfig.expo.android?.minSdkVersion).toBeGreaterThanOrEqual(HEALTH_CONNECT_MIN_SDK);
  });
});
