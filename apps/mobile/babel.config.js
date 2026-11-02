module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsx: 'automatic', jsxImportSource: 'react' }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};