import { File } from 'expo-file-system';
import * as Network from 'expo-network';
import {
  DownloadMetadata,
  DownloadProgress,
  DownloadManagerConfig,
  DownloadStats,
} from './downloadTypes';
import { downloadStorage } from './downloadStorage';
import { getActiveProvider } from '../providers/registry';
import { useSettingsStore } from '../store/settingsStore';
import { logger } from '../logging/Logger';
import { Track } from '../providers/types';

const DEFAULT_CONFIG: DownloadManagerConfig = {
  maxConcurrentDownloads: 2,
  // A lossless track is tens of megabytes, so 100 MB is a safer floor than the
  // old hardcoded 10 MB guess.
  minFreeSpaceBytes: 100 * 1024 * 1024,
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
};

type Listener = (progress: DownloadProgress) => void;

class DownloadManager {
  private static instance: DownloadManager;

  private config: DownloadManagerConfig = { ...DEFAULT_CONFIG };
  private active = new Map<string, { controller: AbortController; task: { cancel(): void } | null }>();
  private listeners = new Set<Listener>();
  private queue: string[] = [];
  private drainPromise: Promise<void> | null = null;

  static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  async initialize(): Promise<void> {
    await downloadStorage.ensureDirectories();
    await downloadStorage.repairIndex();
    // Anything that was mid-flight is retryable again.
    for (const item of await downloadStorage.getAllDownloads()) {
      if (item.status === 'downloading') {
        await downloadStorage.updateStatus(item.trackId, 'pending');
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(progress: DownloadProgress): void {
    for (const listener of this.listeners) listener(progress);
  }

  private get runningCount(): number {
    return this.active.size;
  }

  private isWifiOnly(): boolean {
    return useSettingsStore.getState().downloadWifiOnly;
  }

  private async canStartNow(): Promise<boolean> {
    if (!this.isWifiOnly()) return true;
    try {
      const state = await Network.getNetworkStateAsync();
      return state.type === Network.NetworkStateType.WIFI;
    } catch {
      // If the connection type cannot be read, let the transfer start and let
      // the platform handle it rather than blocking the user.
      return true;
    }
  }

  /** Resolves a fresh stream URL. These can expire, so this runs per attempt. */
  private async resolveStream(trackId: string, quality: string): Promise<{ url: string; headers?: Record<string, string> }> {
    const previousQuality = useSettingsStore.getState().audio.hifiAudioQuality;
    useSettingsStore.getState().setHifiAudioQuality(quality as never);
    try {
      const stream = await getActiveProvider().getStreamInfo(trackId);
      return { url: stream.url, headers: stream.headers };
    } finally {
      useSettingsStore.getState().setHifiAudioQuality(previousQuality);
    }
  }

  async enqueue(track: Track): Promise<void> {
    const existing = await downloadStorage.getDownloadByTrackId(track.id);
    if (existing && (existing.status === 'completed' || existing.status === 'downloading')) {
      return;
    }

    const metadata: DownloadMetadata = {
      trackId: track.id,
      track,
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      filePath: null,
      format: 'mp3',
      quality: useSettingsStore.getState().downloadQuality,
      createdAt: Date.now(),
      retryCount: existing?.retryCount ?? 0,
    };
    await downloadStorage.saveDownloadMetadata(metadata);

    if (!this.queue.includes(track.id)) this.queue.push(track.id);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.drainPromise) return this.drainPromise;
    this.drainPromise = this.runQueue().finally(() => {
      this.drainPromise = null;
    });
    return this.drainPromise;
  }

  private async runQueue(): Promise<void> {
    while (this.queue.length > 0 && this.runningCount < this.config.maxConcurrentDownloads) {
      if (!(await this.canStartNow())) return;
      const trackId = this.queue.shift();
      if (!trackId) return;

      const promise = this.download(trackId).finally(() => {
        this.active.delete(trackId);
      });
      this.active.set(trackId, {
        controller: new AbortController(),
        task: null,
      });
      // Errors are recorded in the index, so the loop must not stop on one.
      void promise.catch((error) => {
        logger.error('DownloadManager', `Download failed for ${trackId}`, error);
      });
    }

    // More work arrived while the queue was full.
    if (this.queue.length > 0 && this.runningCount < this.config.maxConcurrentDownloads) {
      await this.runQueue();
    }
  }

  private async download(trackId: string): Promise<void> {
    const entry = await downloadStorage.getDownloadByTrackId(trackId);
    if (!entry) return;

    const track = entry.track;
    try {
      const { url, headers } = await this.resolveStream(trackId, entry.quality);

      const controller = this.active.get(trackId)?.controller ?? new AbortController();
      const temporary = downloadStorage.fileFor(trackId, 'part');

      let lastPersist = 0;
      const result = await File.downloadFileAsync(url, temporary, {
        headers,
        idempotent: true,
        signal: controller.signal,
        onProgress: ({ bytesWritten, totalBytes }) => {
          const total = totalBytes > 0 ? totalBytes : entry.totalBytes;
          const progress = total > 0
            ? Math.min(100, Math.round((bytesWritten / total) * 100))
            : 0;

          this.emit({ trackId, progress, downloadedBytes: bytesWritten, totalBytes: total, status: 'downloading' });

          // Persisting on every callback would thrash AsyncStorage.
          const now = Date.now();
          if (now - lastPersist > 1000 || progress >= 100) {
            lastPersist = now;
            void downloadStorage.updateProgress(trackId, bytesWritten, total);
          }
        },
      });

      const written = result.size ?? 0;
      const contentType = guessExtensionFromUrl(url);
      const extension = contentType ?? entry.format;

      const finalFile = downloadStorage.fileFor(trackId, extension);
      if (finalFile.exists) finalFile.delete();
      temporary.move(finalFile);

      await downloadStorage.updateStatus(trackId, 'completed', {
        filePath: finalFile.uri,
        format: extension,
        downloadedBytes: written,
        totalBytes: written > 0 ? written : entry.totalBytes,
        progress: 100,
        errorMessage: undefined,
      });

      this.emit({ trackId, progress: 100, downloadedBytes: written, totalBytes: written, status: 'completed' });
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      const message = aborted
        ? 'Download cancelled.'
        : error instanceof Error
          ? error.message
          : 'Download failed.';

      await downloadStorage.updateStatus(trackId, aborted ? 'paused' : 'failed', {
        errorMessage: message,
        retryCount: entry.retryCount + 1,
      });
      this.emit({
        trackId,
        progress: entry.progress,
        downloadedBytes: entry.downloadedBytes,
        totalBytes: entry.totalBytes,
        status: aborted ? 'paused' : 'failed',
      });
    }
  }

  /** Re-attempts a failed or paused download with a freshly resolved URL. */
  async retry(trackId: string): Promise<void> {
    await downloadStorage.updateStatus(trackId, 'pending', { errorMessage: undefined });
    if (!this.queue.includes(trackId)) this.queue.push(trackId);
    await this.drain();
  }

  async cancel(trackId: string): Promise<void> {
    const active = this.active.get(trackId);
    this.queue = this.queue.filter((id) => id !== trackId);
    if (active) {
      active.task?.cancel();
      active.controller.abort();
    }
    await downloadStorage.updateStatus(trackId, 'paused', { errorMessage: undefined });
  }

  async remove(trackId: string): Promise<void> {
    await this.cancel(trackId);
    await downloadStorage.deleteDownload(trackId);
  }

  async removeAll(): Promise<void> {
    this.queue = [];
    for (const id of this.active.keys()) {
      await this.cancel(id);
    }
    await downloadStorage.clearAllDownloads();
  }

  async getStats(): Promise<DownloadStats> {
    const downloads = await downloadStorage.getAllDownloads();
    const completed = downloads.filter((d) => d.status === 'completed');
    return {
      totalDownloads: downloads.length,
      completedDownloads: completed.length,
      failedDownloads: downloads.filter((d) => d.status === 'failed').length,
      downloadingCount: downloads.filter((d) => d.status === 'downloading').length,
      totalSizeBytes: completed.reduce((total, d) => total + (d.downloadedBytes || 0), 0),
      availableStorageBytes: await downloadStorage.getFreeStorageBytes(),
    };
  }

  /** Enqueues every track of an album or playlist at the download limit. */
  async enqueueMany(tracks: Track[]): Promise<void> {
    for (const track of tracks) {
      await this.enqueue(track);
    }
  }
}

/** Falls back to the requested quality when the URL carries no extension. */
function guessExtensionFromUrl(url: string): string | null {
  const withoutQuery = url.split('?')[0];
  const match = /\.([a-z0-9]{2,4})$/i.exec(withoutQuery);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  if (ext === 'flac' || ext === 'mp3' || ext === 'm4a' || ext === 'aac' || ext === 'ogg' || ext === 'opus') {
    return ext;
  }
  return null;
}

export const downloadManager = DownloadManager.getInstance();
export { EXTENSION_BY_MIME };