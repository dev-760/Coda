import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'coda-native-storage' });

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
