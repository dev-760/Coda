import { NitroModules } from 'react-native-nitro-modules';

export interface PlaybackEngineSpec {
  name: string;
  equals(other: PlaybackEngineSpec): boolean;
  init(): Promise<void>;
  play(streamUrl: string, trackId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  getPosition(): Promise<number>;
  getDuration(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  stop(): Promise<void>;
  preload(streamUrl: string): Promise<void>;
  dispose(): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  hasLoadedTrack(): boolean;
  readonly events: {
    onProgress: ((positionMs: number, durationMs: number) => void) | null;
    onTrackEnded: (() => void) | null;
    onPauseRequested: ((reason: string) => void) | null;
    onPlayingChanged: ((isPlaying: boolean) => void) | null;
    onError: ((message: string) => void) | null;
    onNext?: (() => void) | null;
    onPrevious?: (() => void) | null;
  };
}

export const PlaybackEngine = NitroModules.createHybridObject<PlaybackEngineSpec>('PlaybackEngine');
