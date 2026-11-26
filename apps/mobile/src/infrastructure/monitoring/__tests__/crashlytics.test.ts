const mockGetCrashlytics = jest.fn();
let mockExpoConfig: { extra?: { crashlyticsEnabled?: boolean } } = {};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: mockGetCrashlytics,
}));

type InitializeCrashlytics = () => void;

function loadInitializer(): InitializeCrashlytics {
  jest.resetModules();
  const module = jest.requireActual('../crashlytics') as {
    initializeCrashlytics: InitializeCrashlytics;
  };
  return module.initializeCrashlytics;
}

describe('initializeCrashlytics', () => {
  beforeEach(() => {
    mockExpoConfig = {};
    mockGetCrashlytics.mockReset();
  });

  it('does not load the native module when Crashlytics is not enabled', () => {
    loadInitializer()();

    expect(mockGetCrashlytics).not.toHaveBeenCalled();
  });

  it('installs the JS handlers once when Crashlytics is enabled', () => {
    mockExpoConfig = { extra: { crashlyticsEnabled: true } };
    const initializeCrashlytics = loadInitializer();

    initializeCrashlytics();
    initializeCrashlytics();

    expect(mockGetCrashlytics).toHaveBeenCalledTimes(1);
  });

  it('does not break app startup when native Crashlytics is unavailable', () => {
    mockExpoConfig = { extra: { crashlyticsEnabled: true } };
    mockGetCrashlytics.mockImplementationOnce(() => {
      throw new Error('RNFBCrashlyticsModule not found');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => loadInitializer()()).not.toThrow();
    expect(mockGetCrashlytics).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
