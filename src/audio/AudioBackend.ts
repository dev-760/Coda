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
  /**
   * The transport state changed outside our own calls, e.g. the user pressed
   * play or pause on the lock screen. The native player is the source of truth
   * for those, so the store has to follow it rather than assume it is right.
   */
  onPlayingChanged: ((isPlaying: boolean) => void) | null;
  /** Next track triggered from lock screen, notification shade or media button. */
  onNext?: (() => void) | null;
  /** Previous track triggered from lock screen, notification shade or media button. */
  onPrevious?: (() => void) | null;
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
  /**
   * Registers this player as the OS media session so the lock screen, shade and
   * headphone buttons drive it. Called on playback, not at init: binding it for
   * the whole app lifetime would put an idle player in the media session.
   */
  activateMediaSession(track: Track | null): void;
  /** Detaches from the OS media session and clears now-playing info. */
  deactivateMediaSession(): void;
  /** Warm the native decoder so the next track starts without delay. */
  preload(stream: StreamInfo): Promise<void>;
  dispose(): Promise<void>;
  readonly events: AudioBackendEvents;
}
