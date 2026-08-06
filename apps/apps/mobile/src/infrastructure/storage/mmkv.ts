import { MMKV } from 'react-native-mmkv';

export const secureStorage = new MMKV({
  id: 'mrtraining-athlete-storage',
});

export const queryClientStorage = {
  setItem: (key: string, value: string) => secureStorage.set(key, value),
  getItem: (key: string) => secureStorage.getString(key) ?? null,
  removeItem: (key: string) => secureStorage.delete(key),
};
