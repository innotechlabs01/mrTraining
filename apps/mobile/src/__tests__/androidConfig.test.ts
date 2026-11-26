import appConfig from '../../app.json';
import easConfig from '../../eas.json';

const HEALTH_CONNECT_MIN_SDK = 26;
const BUILD_PROPERTIES_PLUGIN = 'expo-build-properties';
const INTERNAL_BUILD_ARCHS = ['arm64-v8a'];

type BuildProperties = { android?: { minSdkVersion?: number; buildArchs?: string[] } };
type BuildPropertiesPlugin = [typeof BUILD_PROPERTIES_PLUGIN, BuildProperties];
type AppConfigInput = {
  android?: { package?: string };
  plugins?: unknown[];
  extra?: Record<string, unknown>;
  ios?: { bundleIdentifier?: string };
  runtimeVersion?: unknown;
  updates?: unknown;
};
type AppConfigFactory = (input: { config: AppConfigInput }) => { plugins?: unknown[] };

function findBuildProperties(plugins: readonly unknown[]): BuildProperties | undefined {
  const plugin = plugins.find(
    (entry) => Array.isArray(entry) && entry[0] === BUILD_PROPERTIES_PLUGIN,
  );
  if (!Array.isArray(plugin)) {
    return undefined;
  }
  const [, props] = plugin as BuildPropertiesPlugin;
  return props;
}

function resolvePlugins(appVariant: string): unknown[] {
  const previousVariant = process.env.APP_VARIANT;
  const previousPackage = process.env.ANDROID_PACKAGE;
  delete process.env.ANDROID_PACKAGE;
  process.env.APP_VARIANT = appVariant;

  try {
    let plugins: unknown[] = [];
    jest.isolateModules(() => {
      const factory = jest.requireActual('../../app.config.js') as AppConfigFactory;
      plugins = factory({ config: appConfig.expo as unknown as AppConfigInput }).plugins ?? [];
    });
    return plugins;
  } finally {
    if (previousVariant === undefined) {
      delete process.env.APP_VARIANT;
    } else {
      process.env.APP_VARIANT = previousVariant;
    }
    if (previousPackage === undefined) {
      delete process.env.ANDROID_PACKAGE;
    } else {
      process.env.ANDROID_PACKAGE = previousPackage;
    }
  }
}

describe('Android build config', () => {
  it('sets minSdkVersion high enough for Health Connect via expo-build-properties', () => {
    const props = findBuildProperties(appConfig.expo.plugins);
    expect(props?.android?.minSdkVersion ?? 0).toBeGreaterThanOrEqual(HEALTH_CONNECT_MIN_SDK);
  });

  it('points the QA profile at the QA package and Cloud Run API', () => {
    const qaEnv = easConfig.build.qa.env;
    expect(qaEnv.ANDROID_PACKAGE).toBe('com.innotechlabssas.mrtraining.qa');
    expect(qaEnv.IOS_BUNDLE_IDENTIFIER).toBe('com.innotechlabssas.mrtraining.qa');
    expect(qaEnv.EXPO_PUBLIC_GO_API_URL).toBe(
      'https://mr-training-backend-fybayujyeq-uc.a.run.app',
    );
  });

  it.each(['qa', 'preview'])('limits %s builds to arm64-v8a', (appVariant) => {
    const props = findBuildProperties(resolvePlugins(appVariant));
    expect(props?.android?.buildArchs).toEqual(INTERNAL_BUILD_ARCHS);
  });

  it.each(['development', 'production'])('does not limit %s builds by ABI', (appVariant) => {
    const props = findBuildProperties(resolvePlugins(appVariant));
    expect(props?.android?.buildArchs).toBeUndefined();
  });
});
