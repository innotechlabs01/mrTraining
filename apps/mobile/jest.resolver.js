// Composed jest resolver: React Native's subpath handling + Reanimated's
// non-native resolution.
//
// Why this exists:
// - `react-native-reanimated` (and `react-native-worklets`) load native
//   worklets bindings at import time. Under jest there is no native module,
//   so importing them throws `Cannot read properties of undefined
//   (reading 'loadUnpackersWithCode')`. Reanimated ships a resolver that
//   strips `.native` extensions for its web-only modules so the JS
//   implementation is used instead.
// - `@react-native/jest-preset`'s resolver removes the `exports` field for
//   the `react-native` package so its subpaths stay resolvable.
// Both are needed, so we layer them: reanimated's resolver delegates the
// actual resolution to `options.defaultResolver`, which we wrap with RN's
// packageFilter behaviour.
const reanimatedResolver = require('react-native-reanimated/jest/resolver');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const originalPackageFilter = options.packageFilter;

  return reanimatedResolver(request, {
    ...options,
    defaultResolver: (path, resolverOptions) =>
      options.defaultResolver(path, {
        ...resolverOptions,
        packageFilter: (pkg) => {
          const filtered = originalPackageFilter ? originalPackageFilter(pkg) : pkg;
          if (filtered.name === 'react-native') {
            delete filtered.exports;
          }
          return filtered;
        },
      }),
  });
};
