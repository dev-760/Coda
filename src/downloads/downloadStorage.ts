import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage/StorageKeys';
import { DownloadMetadata, DownloadStatus } from './downloadTypes';

const INDEX_KEY = STORAGE_KEYS.DOWNLOAD_METADATA;

/**
 * Downloads live in the app-private document directory, so no storage
 * permission is ever needed on either platform.
 */
class DownloadStorage {
  private static instance: DownloadStorage;

  static getInstance(): DownloadStorage {
    if (!DownloadStorage.instance) {
      DownloadStorage.instance = new DownloadStorage();
    }
    return DownloadStorage.instance;
  }

  get directory(): Directory {
    return new Directory(Paths.document, 'downloads');
  }

  get artworkDirectory(): Directory {
    return new Directory(Paths.document, 'downloads', 'artwork');
  }

  async ensureDirectories(): Promise<void> {
    if (!this.directory.exists) this.directory.create({ intermediates: true });
    if (!this.artworkDirectory.exists) this.artworkDirectory.create({ intermediates: true });
  }

  fileFor(trackId: string, extension: string): File {
    return new File(this.directory, `${trackId}.${extension}`);
  }

  artworkFileFor(trackId: string, extension: string): File {
    return new File(this.artworkDirectory, `${trackId}.${extension}`);
  }

  async getAllDownloads(): Promise<DownloadMetadata[]> {
    const data = await AsyncStorage.getItem(INDEX_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // A corrupt index must not stop the app from starting.
      return [];
    }
  }

  private async writeAll(downloads: DownloadMetadata[]): Promise<void> {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(downloads));
  }

  async getDownloadByTrackId(trackId: string): Promise<DownloadMetadata | null> {
    const downloads = await this.getAllDownloads();
    return downloads.find((d) => d.trackId === trackId) ?? null;
  }

  async saveDownloadMetadata(metadata: DownloadMetadata): Promise<void> {
    const downloads = await this.getAllDownloads();
    const index = downloads.findIndex((d) => d.trackId === metadata.trackId);
    if (index >= 0) downloads[index] = metadata;
    else downloads.push(metadata);
    await this.writeAll(downloads);
  }

  async updateProgress(
    trackId: string,
    downloadedBytes: number,
    totalBytes: number,
  ): Promise<void> {
    const downloads = await this.getAllDownloads();
    const index = downloads.findIndex((d) => d.trackId === trackId);
    if (index < 0) return;

    const progress = totalBytes > 0
      ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
      : 0;

    downloads[index] = {
      ...downloads[index],
      downloadedBytes,
      totalBytes,
      progress,
      status: 'downloading',
    };
    await this.writeAll(downloads);
  }

  async updateStatus(
    trackId: string,
    status: DownloadStatus,
    changes: Partial<DownloadMetadata> = {},
  ): Promise<void> {
    const downloads = await this.getAllDownloads();
    const index = downloads.findIndex((d) => d.trackId === trackId);
    if (index < 0) return;

    downloads[index] = {
      ...downloads[index],
      ...changes,
      status,
      completedAt: status === 'completed' ? Date.now() : downloads[index].completedAt,
      failedAt: status === 'failed' ? Date.now() : downloads[index].failedAt,
    };
    await this.writeAll(downloads);
  }

  /** Removes the index entry and the files on disk. */
  async deleteDownload(trackId: string): Promise<void> {
    const download = await this.getDownloadByTrackId(trackId);
    if (download) {
      if (download.filePath) {
        try {
          const file = new File(download.filePath);
          if (file.exists) file.delete();
        } catch {
          // The file may already be gone. The index entry is what matters.
        }
      }
      if (download.artworkPath) {
        try {
          const artwork = new File(download.artworkPath);
          if (artwork.exists) artwork.delete();
        } catch {
          // Same as above.
        }
      }
    }

    const downloads = await this.getAllDownloads();
    await this.writeAll(downloads.filter((d) => d.trackId !== trackId));
  }

  async clearAllDownloads(): Promise<void> {
    const downloads = await this.getAllDownloads();
    for (const download of downloads) {
      await this.deleteDownload(download.trackId);
    }
    await this.writeAll([]);
  }

  /**
   * Drops index entries whose file vanished or whose size no longer matches,
   * so a half-written download never plays back as if it were complete.
   */
  async repairIndex(): Promise<string[]> {
    const downloads = await this.getAllDownloads();
    const repaired: DownloadMetadata[] = [];
    const removed: string[] = [];

    for (const download of downloads) {
      if (download.status !== 'completed' || !download.filePath) {
        if (download.status === 'downloading') {
          // Interrupted by an app restart; make it retryable.
          repaired.push({ ...download, status: 'pending' });
        } else {
          repaired.push(download);
        }
        continue;
      }

      try {
        const file = new File(download.filePath);
        if (!file.exists) {
          removed.push(download.trackId);
          continue;
        }
        const size = file.size ?? 0;
        if (download.totalBytes > 0 && size !== download.totalBytes) {
          removed.push(download.trackId);
          continue;
        }
        repaired.push(download);
      } catch {
        removed.push(download.trackId);
      }
    }

    await this.writeAll(repaired);
    return removed;
  }

  async isTrackDownloaded(trackId: string): Promise<boolean> {
    const download = await this.getDownloadByTrackId(trackId);
    return download?.status === 'completed' && download.filePath !== null;
  }

  async getFreeStorageBytes(): Promise<number> {
      try {
        return Paths.availableDiskSpace;
      } catch {
        return 0;
      }
    }
}

export const downloadStorage = DownloadStorage.getInstance();