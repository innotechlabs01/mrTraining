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

// Mock react-navigation navigation hooks for component-level unit tests
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
      key: 'mock-route-key',
      name: 'MockRoute',
    }),
    useIsFocused: () => true,
  };
});
