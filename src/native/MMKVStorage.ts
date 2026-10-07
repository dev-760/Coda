// MMKV is a native module; it may be absent (Expo Go, failed autolink).
// Never throw at import time: fall back to an in-memory map so the queue and
// download index survive the session without crashing the launch.
type KVStore = {
  set(key: string, value: string): void;
  getString(key: string): string | undefined;
  delete(key: string): void;
};

function createStore(): KVStore {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-mmkv');
    const Ctor = mod.MMKV ?? mod.default?.MMKV ?? mod.default;
    if (typeof Ctor === 'function') {
      const instance = new Ctor({ id: 'coda-native-storage' });
      if (
        instance &&
        typeof instance.set === 'function' &&
        typeof instance.getString === 'function' &&
        typeof instance.delete === 'function'
      ) {
        return instance as KVStore;
      }
    }
  } catch {
    // Fall through to memory below. No console output: this module loads
    // before the logger, and production must stay quiet here.
  }
  const memory = new Map<string, string>();
  return {
    set: (key, value) => void memory.set(key, value),
    getString: (key) => memory.get(key),
    delete: (key) => void memory.delete(key),
  };
}

export const storage = createStore();

export const QueueStorage = {
  saveQueue(key: string, data: string): void {
    try {
      storage.set(key, data);
    } catch {
      // Persistence is best-effort; a failed write must not break playback.
    }
  },
  loadQueue(key: string): string | undefined {
    try {
      return storage.getString(key);
    } catch {
      return undefined;
    }
  },
  clearQueue(key: string): void {
    try {
      storage.delete(key);
    } catch {
      // Ignore: clearing is idempotent.
    }
  },
};
