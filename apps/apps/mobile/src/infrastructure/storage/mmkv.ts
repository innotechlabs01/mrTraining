import AsyncStorage from '@react-native-async-storage/async-storage';

export const secureStorage = AsyncStorage;

export const queryClientStorage = {
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
