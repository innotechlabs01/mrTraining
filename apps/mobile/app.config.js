/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  // app.json es la base; lo extendemos con valores de entorno
  return {
    ...config,
    // Sobreescribimos/inyectamos extra desde variables de entorno
    extra: {
      ...config.extra,
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      apiBaseUrl: process.env.EXPO_PUBLIC_GO_API_URL, // apunta a Go API (no Vercel)
      goApiUrl: process.env.EXPO_PUBLIC_GO_API_URL,
      eas: config.extra?.eas,
    },
    // iOS bundle identifier dinámico por entorno
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier,
    },
    // Android package dinámico por entorno
    android: {
      ...config.android,
      package: process.env.ANDROID_PACKAGE || config.android?.package,
    },
    // Runtime version / updates para OTA
    runtimeVersion: config.runtimeVersion,
    updates: config.updates,
  };
};