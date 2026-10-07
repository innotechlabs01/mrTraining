import * as SecureStore from 'expo-secure-store';

// SecureStore-backed storage for auth/session secrets (encrypted, small data).
// NOT for caches or bulk data — use mmkv.ts for those.
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};
