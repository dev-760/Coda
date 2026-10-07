import { create } from 'zustand';
import { downloadManager } from './downloadManager';
import { downloadStorage } from './downloadStorage';
import { DownloadMetadata, DownloadProgress, DownloadStats } from './downloadTypes';
import { Track } from '../providers/types';
import { logger } from '../logging/Logger';

interface DownloadState {
  downloads: DownloadMetadata[];
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  refreshDownloads: () => Promise<void>;
  downloadTrack: (track: Track) => Promise<void>;
  downloadTracks: (tracks: Track[]) => Promise<void>;
  cancelDownload: (trackId: string) => Promise<void>;
  cancelMultipleDownloads: (trackIds: string[]) => Promise<void>;
  retryDownload: (trackId: string) => Promise<void>;
  deleteDownload: (trackId: string) => Promise<void>;
  deleteMultipleDownloads: (trackIds: string[]) => Promise<void>;
  deleteAllDownloads: () => Promise<void>;
  getDownloadStatus: (trackId: string) => DownloadMetadata | null;
  isTrackDownloaded: (trackId: string) => boolean;
  getOfflineTrackUrl: (trackId: string) => Promise<string | null>;
  getStats: () => Promise<DownloadStats>;
}

export const useDownloadStore = create<DownloadState>()((set, get) => ({
  downloads: [],
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!downloadStorage.isSupported) {
        set({ downloads: [], isLoading: false });
        logger.info('DownloadStore', 'Downloads unavailable on web target');
        return;
      }
      await downloadManager.initialize();
      // Real progress arrives through the manager subscription.
      downloadManager.subscribe((progress: DownloadProgress) => {
        void get().refreshDownloads();
        if (progress.status === 'completed' || progress.status === 'failed') {
          logger.info('DownloadStore', `Download ${progress.status}: ${progress.trackId}`);
        }
      });
      await get().refreshDownloads();
    } catch (error) {
      set({
        error: 'Downloads could not be prepared. Restart the app and try again.',
      });
      logger.error('DownloadStore', 'Initialize failed', error);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshDownloads: async () => {
    const downloads = await downloadStorage.getAllDownloads();
    set({ downloads });
  },

  downloadTrack: async (track) => {
    set({ isLoading: true, error: null });
    try {
      await downloadManager.enqueue(track);
      await get().refreshDownloads();
    } catch (error) {
      set({ error: 'That download could not be started. Check your connection and try again.' });
      logger.error('DownloadStore', 'Download failed', error);
    } finally {
      set({ isLoading: false });
    }
  },

  downloadTracks: async (tracks) => {
    set({ isLoading: true, error: null });
    try {
      await downloadManager.enqueueMany(tracks);
      await get().refreshDownloads();
    } catch (error) {
      set({ error: 'Those downloads could not be started. Check your connection and try again.' });
      logger.error('DownloadStore', 'Bulk download failed', error);
    } finally {
      set({ isLoading: false });
    }
  },

  cancelDownload: async (trackId) => {
    await downloadManager.cancel(trackId);
    await get().refreshDownloads();
  },

  cancelMultipleDownloads: async (trackIds) => {
    for (const id of trackIds) {
      await downloadManager.cancel(id);
    }
    await get().refreshDownloads();
  },

  retryDownload: async (trackId) => {
    await downloadManager.retry(trackId);
    await get().refreshDownloads();
  },

  deleteDownload: async (trackId) => {
    await downloadManager.remove(trackId);
    await get().refreshDownloads();
  },

  deleteMultipleDownloads: async (trackIds) => {
    for (const id of trackIds) {
      await downloadManager.remove(id);
    }
    await get().refreshDownloads();
  },

  deleteAllDownloads: async () => {
    await downloadManager.removeAll();
    await get().refreshDownloads();
  },

  getDownloadStatus: (trackId) =>
    get().downloads.find((d) => d.trackId === trackId) ?? null,

  isTrackDownloaded: (trackId) => {
    const item = get().downloads.find((d) => d.trackId === trackId);
    return item?.status === 'completed' && item.filePath !== null;
  },

  getOfflineTrackUrl: async (trackId) => {
    const item = get().downloads.find((d) => d.trackId === trackId);
    if (item?.status === 'completed' && item.filePath) {
      const resolved = downloadStorage.resolveLocalPath(item.filePath);
      if (resolved) return resolved;
    }
    // Fall back to the persisted index in case the store has not refreshed yet.
    const stored = await downloadStorage.getDownloadByTrackId(trackId);
    if (stored?.status === 'completed' && stored.filePath) {
      const resolved = downloadStorage.resolveLocalPath(stored.filePath);
      if (resolved) return resolved;
    }
    return null;
  },

  getStats: () => downloadManager.getStats(),
}));