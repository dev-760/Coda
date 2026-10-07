import { Track } from '../providers/types';

export interface PlaylistDownloadPlan {
  /** Tracks that still need downloading. */
  toDownload: Track[];
  /** Tracks already offline, skipped so they are never re-queued. */
  alreadyDownloaded: number;
}

/**
 * Partitions a playlist into tracks to queue vs tracks already offline.
 * The download manager also skips completed entries, but partitioning first
 * lets the UI report honest counts instead of a blind "started" toast.
 */
export function planPlaylistDownload(
  tracks: Track[],
  isDownloaded: (trackId: string) => boolean,
): PlaylistDownloadPlan {
  const toDownload = tracks.filter((track) => !isDownloaded(track.id));
  return { toDownload, alreadyDownloaded: tracks.length - toDownload.length };
}
