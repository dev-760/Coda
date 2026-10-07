import { NitroModules } from 'react-native-nitro-modules';

export interface PlaybackEngine {
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
}

export const PlaybackEngine = NitroModules.createHybridObject<PlaybackEngine>('PlaybackEngine');
