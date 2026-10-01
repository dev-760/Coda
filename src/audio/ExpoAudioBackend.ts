import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import type { AudioPlayer, AudioSource } from 'expo-audio';
import { AudioBackend, AudioBackendEvents } from './AudioBackend';
import { StreamInfo, Track } from '../providers/types';
import { logger } from '../logging/Logger';

const SEEK_STEP_SECONDS = 5;

/**
 * expo-audio reports position in seconds; every boundary in this app uses
 * milliseconds, so conversion happens here and nowhere else.
 */
function toSource(stream: StreamInfo): AudioSource {
  return { uri: stream.url, headers: stream.headers };
}

export class ExpoAudioBackend implements AudioBackend {
  readonly events: AudioBackendEvents = {
    onTrackEnded: null,
    onProgress: null,
    onPauseRequested: null,
    onError: null,
  };

  private player: AudioPlayer | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private currentTrack: Track | null = null;
  /** Guards the ended event so a track end cannot be handled twice. */
  private endReported = false;
  private volume = 1;
  private playbackRate = 1;

  async init(): Promise<void> {
    // interruptionMode must be doNotMix or the OS will not bind lock screen
    // controls to this player.
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
    });
    await setIsAudioActiveAsync(true);
    this.player = createAudioPlayer(null);
    this.player.volume = this.volume;
    this.player.setPlaybackRate(this.playbackRate);
    logger.info('ExpoAudioBackend', 'Audio engine ready');
  }

  private requirePlayer(): AudioPlayer {
    if (!this.player) {
      throw new Error('Audio engine is not initialized');
    }
    return this.player;
  }

  async play(stream: StreamInfo, track: Track): Promise<void> {
    const player = this.requirePlayer();
    this.endReported = false;
    this.currentTrack = track;

    player.replace(toSource(stream));
    this.publishMetadata(track);
    player.play();
    this.startProgressTimer();
  }

  private publishMetadata(track: Track): void {
    if (!this.player) return;
    this.player.updateLockScreenMetadata({
      title: track.title,
      artist: track.artist,
      albumTitle: track.album,
      artworkUrl: track.coverUrl ?? track.artwork,
    });
  }

  updateMetadata(track: Track): void {
    this.currentTrack = track;
    this.publishMetadata(track);
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      const player = this.player;
      if (!player) return;

      const positionMs = player.currentTime * 1000;
      const durationMs = player.duration * 1000;

      // Some stream formats never report a duration. When playback has stopped
      // near the end of a known duration, treat it as complete.
      if (
        !player.playing &&
        durationMs > 0 &&
        positionMs > 0 &&
        positionMs >= durationMs - SEEK_STEP_SECONDS * 1000
      ) {
        this.reportEnd();
        return;
      }

      this.events.onProgress?.(positionMs, durationMs);
    }, 250);
  }

  private reportEnd(): void {
    if (this.endReported) return;
    this.endReported = true;
    this.stopProgressTimer();
    this.events.onProgress?.(0, 0);
    this.events.onTrackEnded?.();
  }

  private stopProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  async pause(): Promise<void> {
    this.requirePlayer().pause();
    this.stopProgressTimer();
  }

  async resume(): Promise<void> {
    const player = this.requirePlayer();
    player.play();
    this.startProgressTimer();
  }

  async stop(): Promise<void> {
    const player = this.requirePlayer();
    this.stopProgressTimer();
    player.pause();
    player.replace(null);
  }

  async seekTo(positionMs: number): Promise<void> {
    await this.requirePlayer().seekTo(Math.max(0, positionMs / 1000));
  }

  async getPosition(): Promise<number> {
    return (this.player?.currentTime ?? 0) * 1000;
  }

  async getDuration(): Promise<number> {
    const player = this.player;
    if (!player) return 0;
    const nativeDuration = player.duration * 1000;
    // A stream that never reports its own duration falls back to the catalog value.
    return nativeDuration > 0 ? nativeDuration : (this.currentTrack?.durationMs ?? 0);
  }

  async setVolume(volume: number): Promise<void> {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.player) this.player.volume = this.volume;
  }

  async setPlaybackRate(rate: number): Promise<void> {
    this.playbackRate = Math.min(2, Math.max(0.5, rate));
    this.requirePlayer().setPlaybackRate(this.playbackRate);
  }

  async preload(stream: StreamInfo): Promise<void> {
    // A preload failure is not fatal, the next track starts without the head start.
    try {
      const { preload } = await import('expo-audio');
      await preload(toSource(stream), { preferredForwardBufferDuration: 30 });
    } catch (error) {
      logger.warn('ExpoAudioBackend', 'Preload failed, continuing without it', error);
    }
  }

  async dispose(): Promise<void> {
    this.stopProgressTimer();
    this.player?.remove();
    this.player = null;
    await setIsAudioActiveAsync(false);
  }
}
