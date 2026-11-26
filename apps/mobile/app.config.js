/** @type {import('expo/config').ExpoConfig} */
const ANDROID_PACKAGES = {
  development: 'com.innotechlabssas.mrtraining.dev',
  qa: 'com.innotechlabssas.mrtraining.qa',
  production: 'com.innotechlabssas.mrtraining',
};
const ARM64_ONLY_VARIANTS = new Set(['qa', 'preview']);
const INTERNAL_BUILD_ARCHS = ['arm64-v8a'];
const QA_ANDROID_PACKAGE = ANDROID_PACKAGES.qa;
const QA_ANDROID_GOOGLE_SERVICE_FILE = './google-services.qa.json';
const QA_IOS_BUNDLE_IDENTIFIER = 'com.innotechlabssas.mrtraining.qa';
const QA_IOS_GOOGLE_SERVICE_FILE = './GoogleService-Info.qa.plist';
const BUILD_PROPERTIES_PLUGIN = 'expo-build-properties';
const FIREBASE_APP_PLUGIN = '@react-native-firebase/app';
const FIREBASE_CRASHLYTICS_PLUGIN = '@react-native-firebase/crashlytics';

function withBuildProperties(plugins, appVariant, crashlyticsEnabled) {
  const limitArchs = ARM64_ONLY_VARIANTS.has(appVariant);
  if (!limitArchs && !crashlyticsEnabled) {
    return plugins;
  }

  return (plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== BUILD_PROPERTIES_PLUGIN) {
      return plugin;
    }

    const [, props] = plugin;
    return [
      BUILD_PROPERTIES_PLUGIN,
      {
        ...props,
        ...(limitArchs
          ? {
              android: {
                ...props?.android,
                buildArchs: INTERNAL_BUILD_ARCHS,
              },
            }
          : {}),
        ...(crashlyticsEnabled
          ? {
              ios: {
                ...props?.ios,
                useFrameworks: 'dynamic',
              },
            }
          : {}),
      },
    ];
  });
}

module.exports = ({ config }) => {
  const appVariant = process.env.APP_VARIANT || 'development';
  const androidPackage =
    process.env.ANDROID_PACKAGE ||
    ANDROID_PACKAGES[appVariant] ||
    config.android?.package;
  const iosBundleIdentifier =
    process.env.IOS_BUNDLE_IDENTIFIER ||
    (appVariant === 'qa' ? QA_IOS_BUNDLE_IDENTIFIER : config.ios?.bundleIdentifier);
  const crashlyticsEnabled =
    androidPackage === QA_ANDROID_PACKAGE && iosBundleIdentifier === QA_IOS_BUNDLE_IDENTIFIER;
  const plugins = [
    ...withBuildProperties(config.plugins, appVariant, crashlyticsEnabled),
    ...(crashlyticsEnabled ? [FIREBASE_APP_PLUGIN, FIREBASE_CRASHLYTICS_PLUGIN] : []),
  ];

  const iosConfig = {
    ...config.ios,
    bundleIdentifier: iosBundleIdentifier,
  };
  if (iosBundleIdentifier === QA_IOS_BUNDLE_IDENTIFIER) {
    iosConfig.googleServicesFile = QA_IOS_GOOGLE_SERVICE_FILE;
  }

  const androidConfig = {
    ...config.android,
    package: androidPackage,
  };
  if (crashlyticsEnabled) {
    androidConfig.googleServicesFile = QA_ANDROID_GOOGLE_SERVICE_FILE;
  }

  // app.json es la base; lo extendemos con valores de entorno preservando fallbacks
  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      clerkPublishableKey:
        process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || config.extra?.clerkPublishableKey,
      apiBaseUrl: process.env.EXPO_PUBLIC_GO_API_URL || config.extra?.apiBaseUrl,
      goApiUrl: process.env.EXPO_PUBLIC_GO_API_URL || config.extra?.goApiUrl,
      webAppUrl:
        process.env.EXPO_PUBLIC_WEB_URL ||
        config.extra?.webAppUrl ||
        'https://mr-training.vercel.app',
      eas: config.extra?.eas,
      appVariant,
      crashlyticsEnabled,
    },
    ios: iosConfig,
    android: androidConfig,
    runtimeVersion: config.runtimeVersion,
    updates: config.updates,
  };
};
