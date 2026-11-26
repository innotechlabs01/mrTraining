import fs from 'fs';
import path from 'path';

import appConfig from '../../app.json';

const QA_ANDROID_PACKAGE = 'com.innotechlabssas.mrtraining.qa';
const QA_IOS_BUNDLE_IDENTIFIER = 'com.innotechlabssas.mrtraining.qa';
const FIREBASE_APP_PLUGIN = '@react-native-firebase/app';
const FIREBASE_CRASHLYTICS_PLUGIN = '@react-native-firebase/crashlytics';
const FIREBASE_PERFORMANCE_PLUGIN = '@react-native-firebase/perf';
const BUILD_PROPERTIES_PLUGIN = 'expo-build-properties';

type BuildProperties = {
  android?: { minSdkVersion?: number; buildArchs?: string[] };
  ios?: { useFrameworks?: string };
};
type ResolvedConfig = {
  plugins?: unknown[];
  android?: { package?: string; googleServicesFile?: string };
  ios?: { bundleIdentifier?: string; googleServicesFile?: string };
  extra?: Record<string, unknown>;
};
type ConfigFactory = (input: { config: unknown }) => ResolvedConfig;
type EnvName = 'APP_VARIANT' | 'ANDROID_PACKAGE' | 'IOS_BUNDLE_IDENTIFIER';
type EnvOverrides = Partial<Record<EnvName, string>>;

const ENV_NAMES: readonly EnvName[] = [
  'APP_VARIANT',
  'ANDROID_PACKAGE',
  'IOS_BUNDLE_IDENTIFIER',
];

function resolveConfig(overrides: EnvOverrides): ResolvedConfig {
  const previous = new Map<EnvName, string | undefined>();
  for (const name of ENV_NAMES) {
    previous.set(name, process.env[name]);
    delete process.env[name];
  }
  for (const name of ENV_NAMES) {
    const value = overrides[name];
    if (value !== undefined) {
      process.env[name] = value;
    }
  }

  try {
    let resolved: ResolvedConfig | undefined;
    jest.isolateModules(() => {
      const factory = jest.requireActual('../../app.config.js') as ConfigFactory;
      resolved = factory({ config: appConfig.expo });
    });
    if (!resolved) {
      throw new Error('app.config.js did not resolve a config');
    }
    return resolved;
  } finally {
    for (const name of ENV_NAMES) {
      const value = previous.get(name);
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

function findBuildProperties(plugins: readonly unknown[]): BuildProperties {
  const plugin = plugins.find(
    (entry) => Array.isArray(entry) && entry[0] === BUILD_PROPERTIES_PLUGIN,
  );
  if (!Array.isArray(plugin)) {
    throw new Error('expo-build-properties plugin is missing');
  }
  const [, props] = plugin as [string, BuildProperties];
  return props;
}

const qaEnv: EnvOverrides = {
  APP_VARIANT: 'qa',
  ANDROID_PACKAGE: QA_ANDROID_PACKAGE,
  IOS_BUNDLE_IDENTIFIER: QA_IOS_BUNDLE_IDENTIFIER,
};

describe('Firebase monitoring config', () => {
  it('wires Firebase config and plugins only for the QA app', () => {
    const qa = resolveConfig(qaEnv);
    const dev = resolveConfig({ APP_VARIANT: 'development' });

    expect(qa.plugins).toContain(FIREBASE_APP_PLUGIN);
    expect(qa.plugins).toContain(FIREBASE_CRASHLYTICS_PLUGIN);
    expect(qa.plugins).toContain(FIREBASE_PERFORMANCE_PLUGIN);
    expect(qa.android?.googleServicesFile).toBe('./google-services.qa.json');
    expect(qa.ios?.googleServicesFile).toBe('./GoogleService-Info.qa.plist');
    expect(qa.extra?.crashlyticsEnabled).toBe(true);
    expect(qa.extra?.performanceMonitoringEnabled).toBe(true);

    expect(dev.plugins).not.toContain(FIREBASE_APP_PLUGIN);
    expect(dev.plugins).not.toContain(FIREBASE_CRASHLYTICS_PLUGIN);
    expect(dev.plugins).not.toContain(FIREBASE_PERFORMANCE_PLUGIN);
    expect(dev.android?.googleServicesFile).toBeUndefined();
    expect(dev.ios?.googleServicesFile).toBeUndefined();
    expect(dev.extra?.crashlyticsEnabled).toBe(false);
    expect(dev.extra?.performanceMonitoringEnabled).toBe(false);
  });

  it('does not enable Firebase for preview despite limiting build architectures', () => {
    const preview = resolveConfig({ APP_VARIANT: 'preview' });

    expect(preview.plugins).not.toContain(FIREBASE_APP_PLUGIN);
    expect(preview.extra?.crashlyticsEnabled).toBe(false);
    expect(findBuildProperties(preview.plugins ?? []).android?.buildArchs).toEqual(['arm64-v8a']);
    expect(findBuildProperties(preview.plugins ?? []).ios?.useFrameworks).toBeUndefined();
  });

  it('requires dynamic frameworks, minSdk 26 and arm64-only QA builds for RNFB v27', () => {
    const props = findBuildProperties(resolveConfig(qaEnv).plugins ?? []);

    expect(props.ios?.useFrameworks).toBe('dynamic');
    expect(props.android?.minSdkVersion).toBe(26);
    expect(props.android?.buildArchs).toEqual(['arm64-v8a']);
  });

  it('disables JS exception handler chaining to avoid duplicate crash issues', () => {
    const firebaseJsonPath = path.resolve(__dirname, '../../firebase.json');
    const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8')) as {
      'react-native'?: Record<string, unknown>;
    };

    expect(firebaseJson['react-native']?.crashlytics_javascript_exception_handler_chaining_enabled).toBe(
      false,
    );
  });

  it('keeps automatic performance collection enabled in QA builds', () => {
    const firebaseJsonPath = path.resolve(__dirname, '../../firebase.json');
    const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8')) as {
      'react-native'?: Record<string, unknown>;
    };

    expect(firebaseJson['react-native']?.perf_auto_collection_enabled).toBeUndefined();
    expect(firebaseJson['react-native']?.perf_collection_deactivated).toBeUndefined();
  });
});
