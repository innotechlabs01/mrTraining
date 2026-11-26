/** @type {import('expo/config').ExpoConfig} */
const ANDROID_PACKAGES = {
  development: 'com.innotechlabssas.mrtraining.dev',
  qa: 'com.innotechlabssas.mrtraining.qa',
  production: 'com.innotechlabssas.mrtraining',
};
const ARM64_ONLY_VARIANTS = new Set(['qa', 'preview']);
const INTERNAL_BUILD_ARCHS = ['arm64-v8a'];

function withInternalBuildArchs(plugins, appVariant) {
  if (!ARM64_ONLY_VARIANTS.has(appVariant)) {
    return plugins;
  }

  return (plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') {
      return plugin;
    }

    const [, props] = plugin;
    return [
      'expo-build-properties',
      {
        ...props,
        android: {
          ...props?.android,
          buildArchs: INTERNAL_BUILD_ARCHS,
        },
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
  const plugins = withInternalBuildArchs(config.plugins, appVariant);

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
    },
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: androidPackage,
    },
    runtimeVersion: config.runtimeVersion,
    updates: config.updates,
  };
};
