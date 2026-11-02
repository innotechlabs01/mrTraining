/**
 * Manual mock for react-native-mmkv in Jest.
 *
 * Lives at <rootDir>/__mocks__, so Jest applies it AUTOMATICALLY for this
 * node_modules package in every test — no jest.mock() calls needed and no
 * NitroModules native binding is ever loaded (it throws at module scope in
 * Node). In-memory Map keeps test behavior identical per file (Jest gives
 * each test file a fresh module registry).
 */

type MMKVValue = string | number | boolean | ArrayBuffer;

function createInMemoryMMKV(id: string) {
  const store = new Map<string, MMKVValue>();
  return {
    id,
    set: (key: string, value: MMKVValue) => {
      store.set(key, value);
    },
    getString: (key: string) => {
      const value = store.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber: (key: string) => {
      const value = store.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    getBoolean: (key: string) => {
      const value = store.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    remove: (key: string) => store.delete(key),
    contains: (key: string) => store.has(key),
    getAllKeys: () => Array.from(store.keys()),
    clearAll: () => {
      store.clear();
    },
    // Listener/no-op members so hooks/UI code can subscribe without crashing.
    addOnValueChangedListener: () => ({ remove: () => {} }),
    addOnMemoryWarningListener: () => ({ remove: () => {} }),
  };
}

const instances = new Map<string, ReturnType<typeof createInMemoryMMKV>>();

export function createMMKV(configuration?: { id?: string }) {
  const id = configuration?.id ?? 'mmkv.default';
  let instance = instances.get(id);
  if (!instance) {
    instance = createInMemoryMMKV(id);
    instances.set(id, instance);
  }
  return instance;
}

export function deleteMMKV(mmkvOrId: { id: string } | string): boolean {
  const id = typeof mmkvOrId === 'string' ? mmkvOrId : mmkvOrId.id;
  return instances.delete(id);
}

export function existsMMKV(mmkvOrId: { id: string } | string): boolean {
  const id = typeof mmkvOrId === 'string' ? mmkvOrId : mmkvOrId.id;
  return instances.has(id);
}
