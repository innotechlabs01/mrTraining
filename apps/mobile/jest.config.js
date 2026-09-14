// NOTE: transformIgnorePatterns intentionally not overridden here.
// The jest-expo preset ships its own (broader) patterns covering
// expo/expo-modules-core/react-native packages; overriding them
// breaks transformation of ESM/TS inside node_modules.
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  // jest-expo vendors react-test-renderer@19.1.0 under its own node_modules and its
  // setup loads it into every test environment, so React ends up with two renderer
  // versions in one registry. Map everything to the top-level copy.
  moduleNameMapper: {
    '^react-test-renderer$': '<rootDir>/node_modules/react-test-renderer',
    '^react-test-renderer/(.*)$': '<rootDir>/node_modules/react-test-renderer/$1',
  },
};
