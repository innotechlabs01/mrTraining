// NOTE: transformIgnorePatterns intentionally not overridden here.
// The jest-expo preset ships its own (broader) patterns covering
// expo/expo-modules-core/react-native packages; overriding them
// breaks transformation of ESM/TS inside node_modules.
module.exports = {
  preset: 'jest-expo',
  // FlashList v2 requires RN's new architecture; swap it for RN's FlatList in tests.
  // (The bundled @shopify/flash-list/jestSetup assumes a `RecyclerView` export the
  // dist index does not provide in 2.0.2, so we use a local setup file.)
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  // jest-expo vendors react-test-renderer@19.1.0 under its own node_modules and its
  // setup loads it into every test environment, so React ends up with two renderer
  // versions in one registry. Map everything to the top-level copy.
  moduleNameMapper: {
    '^react-test-renderer$': '<rootDir>/node_modules/react-test-renderer',
    '^react-test-renderer/(.*)$': '<rootDir>/node_modules/react-test-renderer/$1',
  },
};
