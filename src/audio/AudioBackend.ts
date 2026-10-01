import { StreamInfo, Track } from '../providers/types';

export interface AudioBackendEvents {
  /** A track reached its natural end. Fires once per playback. */
  onTrackEnded: (() => void) | null;
  /** Position/duration ticks, roughly 4x per second. */
  onProgress: ((positionMs: number, durationMs: number) => void) | null;
  /** An interruption (call, other app) or route change asked us to pause. */
  onPauseRequested: ((reason: string) => void) | null;
  /** Playback failed after starting. */
  onError: ((message: string) => void) | null;
}

export interface AudioBackend {
  init(): Promise<void>;
  play(stream: StreamInfo, track: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  /** 0.5 to 2.0. Pitch is corrected to the original key. */
  setPlaybackRate(rate: number): Promise<void>;
  /** Update lock screen now-playing metadata for the active track. */
  updateMetadata(track: Track): void;
  /** Warm the native decoder so the next track starts without delay. */
  preload(stream: StreamInfo): Promise<void>;
  dispose(): Promise<void>;
  readonly events: AudioBackendEvents;
}
