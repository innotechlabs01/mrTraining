// Manual config based on jest-expo + @react-native/jest-preset
// (Avoids preset ordering issues with transformIgnorePatterns)
const rnPreset = require('@react-native/jest-preset/jest-preset');
const path = require('path');

module.exports = {
  // Core from @react-native/jest-preset
  haste: rnPreset.haste,
  moduleNameMapper: {
    '^react-native/setup-env$': `${path.dirname(require.resolve('react-native'))}/src/setup-env.js`,
    '^react-native($|/.*)': `${path.dirname(require.resolve('react-native'))}/$1`,
    '^react-test-renderer$': '<rootDir>/node_modules/react-test-renderer',
    '^react-test-renderer/(.*)$': '<rootDir>/node_modules/react-test-renderer/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  resolver: rnPreset.resolver,
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': rnPreset.transform[
      '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$'
    ] || require.resolve('@react-native/jest-preset/jest/assetFileTransformer.js'),
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@react-native/jest-preset))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  setupFiles: (rnPreset.setupFiles || []).concat([
    require.resolve('jest-expo/src/preset/setup.js'),
    '<rootDir>/jest.setup.js',
  ]),
  testEnvironment: rnPreset.testEnvironment,
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
};
