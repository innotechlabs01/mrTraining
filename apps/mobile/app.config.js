/** @type {import('expo/config').ExpoConfig} */
const ANDROID_PACKAGES = {
  development: 'com.innotechlabssas.mrtraining.dev',
  qa: 'com.innotechlabssas.mrtraining.qa',
  production: 'com.innotechlabssas.mrtraining',
};

module.exports = ({ config }) => {
  const appVariant = process.env.APP_VARIANT || 'development';
  const androidPackage =
    process.env.ANDROID_PACKAGE ||
    ANDROID_PACKAGES[appVariant] ||
    config.android?.package;

  // app.json es la base; lo extendemos con valores de entorno preservando fallbacks
  return {
    ...config,
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
