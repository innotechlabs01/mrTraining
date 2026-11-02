// Test environment setup.
// FlashList v2 is new-architecture only; in jest we render it as React Native's
// FlatList, which accepts the same props used in this codebase (data, renderItem,
// keyExtractor, contentContainerStyle, horizontal, onEndReached, etc.).
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: FlatList,
    __esModule: true,
  };
});
