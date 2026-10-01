import { Track } from '../providers/types';

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';

export interface DownloadMetadata {
  trackId: string;
  /** Snapshot of the track so Now Playing works with no network. */
  track: Track;
  status: DownloadStatus;
  /** 0 to 100. Only meaningful when totalBytes is known. */
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  filePath: string | null;
  /** Extension without a dot, taken from the response content type. */
  format: string;
  quality: string;
  /** Path to a downloaded cover image, when one was fetched. */
  artworkPath?: string | null;
  lyrics?: string | null;
  createdAt: number;
  completedAt?: number;
  failedAt?: number;
  errorMessage?: string;
  retryCount: number;
}

export interface DownloadProgress {
  trackId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: DownloadStatus;
}

export interface DownloadStats {
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  downloadingCount: number;
  totalSizeBytes: number;
  availableStorageBytes: number;
}

export interface DownloadManagerConfig {
  maxConcurrentDownloads: number;
  /** Free space required before a download starts. */
  minFreeSpaceBytes: number;
}