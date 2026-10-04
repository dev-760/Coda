import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import type { AudioPlayer, AudioSource, AudioStatus } from 'expo-audio';
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
    onPlayingChanged: null,
  };

  private player: AudioPlayer | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private statusSubscription: { remove: () => void } | null = null;
  private currentTrack: Track | null = null;
  /** Guards the ended event so a track end cannot be handled twice. */
  private endReported = false;
  /**
   * Transport state as the player last reported it. Compared against each
   * status event so only genuine changes reach the store, otherwise every
   * position tick would re-render the whole player.
   */
  private lastReportedPlaying = false;
  private sessionActive = false;
  /**
   * Final progress seen for the current track, kept so the end-of-track report
   * can carry real values instead of zeros.
   */
  private lastKnownPositionMs = 0;
  private lastKnownDurationMs = 0;
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
    this.player = createAudioPlayer(null, { updateInterval: 250 });
    this.player.volume = this.volume;
    this.player.setPlaybackRate(this.playbackRate);
    this.subscribeToStatus();
    logger.info('ExpoAudioBackend', 'Audio engine ready');
  }

  /**
   * Lock screen and headset buttons act on the native player directly, so the
   * player is the authority on whether audio is actually playing. Without this
   * the app UI would keep showing "playing" after the user paused from the lock
   * screen, and would ignore play pressed from there.
   */
  private subscribeToStatus(): void {
    const player = this.player;
    if (!player) return;

    this.statusSubscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.didJustFinish) {
        this.reportEnd();
        return;
      }

      if (status.playing !== this.lastReportedPlaying) {
        this.lastReportedPlaying = status.playing;
        this.events.onPlayingChanged?.(status.playing);
      }
    });
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
    this.lastKnownPositionMs = 0;
    this.lastKnownDurationMs = track.durationMs ?? 0;

    player.replace(toSource(stream));
    // Bound before play so the media session is live by the time audio starts,
    // otherwise the first moments of every track are not on the lock screen.
    this.activateMediaSession(track);
    player.play();
    this.lastReportedPlaying = true;
    this.startProgressTimer();
  }

  private publishMetadata(track: Track): void {
    if (!this.player) return;
    this.player.updateLockScreenMetadata({
      title: track.title,
      artist: track.artist,
      albumTitle: track.album || 'Luma Lossless',
      artworkUrl: track.coverUrl ?? track.artwork,
    });
  }

  updateMetadata(track: Track): void {
    this.currentTrack = track;
    this.publishMetadata(track);
  }

  activateMediaSession(track: Track | null): void {
    const player = this.player;
    if (!player) return;

    // A stream with no known duration gets treated as live so the OS hides the
    // scrub bar and seek buttons rather than offering controls that cannot work.
    const isLiveStream = !track?.durationMs || track.durationMs <= 0;

    player.setActiveForLockScreen(
      true,
      track
        ? {
            title: track.title,
            artist: track.artist,
            albumTitle: track.album || 'Luma Lossless',
            artworkUrl: track.coverUrl ?? track.artwork,
          }
        : undefined,
      {
        showSeekForward: !isLiveStream,
        showSeekBackward: !isLiveStream,
        isLiveStream,
      },
    );
    this.sessionActive = true;
    logger.info('ExpoAudioBackend', 'Media session active for the OS');
  }

  deactivateMediaSession(): void {
    if (!this.player || !this.sessionActive) return;
    this.player.clearLockScreenControls();
    this.sessionActive = false;
    logger.info('ExpoAudioBackend', 'Media session released');
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      const player = this.player;
      if (!player) return;

      const positionMs = player.currentTime * 1000;
      const durationMs = player.duration * 1000;
      this.lastKnownPositionMs = positionMs;
      this.lastKnownDurationMs = durationMs;

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
    this.lastReportedPlaying = false;
    this.stopProgressTimer();
    // Progress is reported before the end callback on purpose. Zeroing the
    // position first would make every finished track look like it played for
    // zero milliseconds, which the listening store counts as a skip, so the
    // suggestion engine would learn that every song is a track to skip past.
    this.events.onProgress?.(this.lastKnownPositionMs, this.lastKnownDurationMs);
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
    this.lastReportedPlaying = false;
    this.stopProgressTimer();
  }

  async resume(): Promise<void> {
    const player = this.requirePlayer();
    // Restoring the session covers the case where playback was started from
    // the lock screen, where the player had been detached by the OS.
    if (!this.sessionActive) this.activateMediaSession(this.currentTrack);
    player.play();
    this.lastReportedPlaying = true;
    this.startProgressTimer();
  }

  async stop(): Promise<void> {
    const player = this.requirePlayer();
    this.stopProgressTimer();
    player.pause();
    player.replace(null);
    this.lastReportedPlaying = false;
    this.deactivateMediaSession();
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
    this.statusSubscription?.remove();
    this.statusSubscription = null;
    this.deactivateMediaSession();
    this.player?.remove();
    this.player = null;
    await setIsAudioActiveAsync(false);
  }
}
