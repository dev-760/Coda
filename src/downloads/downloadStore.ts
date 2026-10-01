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
  retryDownload: (trackId: string) => Promise<void>;
  deleteDownload: (trackId: string) => Promise<void>;
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

  retryDownload: async (trackId) => {
    await downloadManager.retry(trackId);
    await get().refreshDownloads();
  },

  deleteDownload: async (trackId) => {
    await downloadManager.remove(trackId);
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
    if (item?.status === 'completed' && item.filePath) return item.filePath;
    // Fall back to the persisted index in case the store has not refreshed yet.
    const stored = await downloadStorage.getDownloadByTrackId(trackId);
    return stored?.status === 'completed' ? stored.filePath : null;
  },

  getStats: () => downloadManager.getStats(),
}));