// MMKV is a native module; use runtime import to avoid type-only errors
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MMKVModule = require('react-native-mmkv').MMKV || require('react-native-mmkv');
export const storage = new MMKVModule({ id: 'coda-native-storage' });

export const QueueStorage = {
  saveQueue(key: string, data: string): void {
    storage.set(key, data);
  },
  loadQueue(key: string): string | undefined {
    return storage.getString(key);
  },
  clearQueue(key: string): void {
    storage.delete(key);
  },
};
