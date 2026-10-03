import { ExpoAudioBackend } from './ExpoAudioBackend';
import { usePlaybackStore } from '../store/playbackStore';
import { useQueueStore } from '../store/queueStore';
import { useSettingsStore } from '../store/settingsStore';
import { logger } from '../logging/Logger';
import { Track, StreamInfo } from '../providers/types';
import { getActiveProvider } from '../providers/registry';
import { useDownloadStore } from '../downloads/downloadStore';
import { recordCompletedPlay } from '../store/listeningStore';
import { useLibraryStore } from '../store/libraryStore';

const SEEK_STEP_MS = 5000;
const PREVIOUS_RESTART_MS = 3000;
/** How many consecutive unplayable tracks to skip before giving up. */
const MAX_CONSECUTIVE_SKIPS = 3;

/**
 * Owns the audio engine and the conversation with the queue store. It plays
 * what it is told and reports events; the queue store stays pure and never
 * touches audio.
 */
class AudioService {
  private backend = new ExpoAudioBackend();
  private initialized = false;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  private preloadToken = 0;
  private consecutiveSkips = 0;

  async init(): Promise<void> {
    await this.backend.init();
    this.initialized = true;

    this.backend.events.onProgress = (positionMs, durationMs) => {
      usePlaybackStore.getState().setProgress(positionMs, durationMs);
    };
    this.backend.events.onTrackEnded = () => {
      void this.handleTrackEnded();
    };
    this.backend.events.onPauseRequested = (reason) => {
      logger.info('AudioService', `Paused by system: ${reason}`);
      usePlaybackStore.getState().setPlaying(false);
    };
    this.backend.events.onPlayingChanged = (isPlaying) => {
      // The OS media session changed the transport behind our back (lock
      // screen, headset button, notification shade). Follow it, and mirror it
      // into the sleep timer so it does not fire during an OS-initiated pause.
      const store = usePlaybackStore.getState();
      if (store.isPlaying === isPlaying) return;
      store.setPlaying(isPlaying);
      if (isPlaying) {
        this.startSleepTimer();
      } else {
        this.cancelSleepTimer();
      }
    };
    this.backend.events.onError = (message) => {
      usePlaybackStore.getState().setError(message);
      usePlaybackStore.getState().setPlaying(false);
    };

    await this.applyPlaybackSpeed();
  }

  private async applyPlaybackSpeed(): Promise<void> {
    const speed = useSettingsStore.getState().audio.playbackSpeed;
    if (speed !== 1) await this.backend.setPlaybackRate(speed);
  }

  async playTrack(track: Track): Promise<void> {
    await this.playAttempt(track, 0);
  }

  /**
   * A stream URL can expire or 404. One retry with a freshly resolved URL
   * fixes that case; a second failure means the track is genuinely
   * unplayable, so it is skipped rather than retried forever.
   */
  private async playAttempt(track: Track, attempt: number): Promise<void> {
    const store = usePlaybackStore.getState();
    if (!this.initialized) {
      store.setError('Audio engine is not ready');
      return;
    }

    // Anything playing at this point was abandoned rather than finished, so
    // its play is settled before the new one is credited.
    this.commitListen(usePlaybackStore.getState().currentTrack, usePlaybackStore.getState().positionMs);

    store.setLoading(true);
    store.setError(null);

    try {
      const stream = await this.resolveStream(track);
      store.setCurrentTrack(track);
      store.setStreamInfo(stream);
      await this.backend.play(stream, track);
      store.setPlaying(true);
      this.consecutiveSkips = 0;
      this.startSleepTimer();
      this.schedulePreload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Playback failed';
      logger.error('AudioService', `Failed to play track ${track.id}`, error);

      if (attempt === 0 && isLikelyTransient(error)) {
        this.playAttempt(track, attempt + 1);
        return;
      }

      store.setError(message);
      store.setPlaying(false);
      await this.skipUnplayable(track);
    } finally {
      store.setLoading(false);
    }
  }

  private async skipUnplayable(track: Track): Promise<void> {
    this.consecutiveSkips += 1;

    if (this.consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
      // The whole queue is unplayable, so stop instead of cycling forever.
      usePlaybackStore.getState().setPlaying(false);
      logger.error('AudioService', `${MAX_CONSECUTIVE_SKIPS} tracks failed in a row, stopping`);
      return;
    }

    usePlaybackStore
      .getState()
      .setError(`Skipped ${track.title}: it could not be played.`);

    const next = useQueueStore.getState().advanceForManualNext();
    if (!next) return;
    await this.playAttempt(next, 0);
  }

  /** Local file first, then network. Keeps downloaded music playable offline. */
  private async resolveStream(track: Track): Promise<StreamInfo> {
    const localPath = await useDownloadStore.getState().getOfflineTrackUrl(track.id);
    if (localPath) {
      logger.info('AudioService', `Playing downloaded file for track ${track.id}`);
      return { url: localPath, format: 'unknown' };
    }
    return getActiveProvider().getStreamInfo(track.id);
  }

  private schedulePreload(): void {
    const next = useQueueStore.getState().getNextTrack();
    if (!next) return;
    const token = ++this.preloadToken;
    void (async () => {
      try {
        const stream = await this.resolveStream(next);
        // The playhead may have moved while the stream URL was resolving.
        if (token !== this.preloadToken) return;
        await this.backend.preload(stream);
      } catch (error) {
        logger.warn('AudioService', 'Could not preload next track', error);
      }
    })();
  }

  /**
   * Credits a play to the listening store and to recently played.
   *
   * This is the only writer of listening history, and it has to run on both the
   * natural-end and abandon paths. Without it nothing ever reaches the
   * listening store, which is why the suggestion engine scored every candidate
   * at zero and Made for You stayed empty however much was played.
   *
   * Track is passed in rather than read from the store because callers settle
   * a track after the store has already moved on to the next one.
   */
  private commitListen(track: Track | null, positionMs: number): void {
    if (!track) return;

    recordCompletedPlay(track, positionMs);
    void useLibraryStore.getState().addToRecentlyPlayed(track).catch((error) => {
      logger.warn('AudioService', 'Could not update recently played', error);
    });
  }

  /**
   * The queue is the only source of truth for what plays next, so a natural
   * end and a manual Next both go through the same commit.
   */
  private async handleTrackEnded(): Promise<void> {
    const store = usePlaybackStore.getState();
    store.setPlaying(false);

    const finishedTrack = store.currentTrack;
    const playedMs = store.positionMs;

    const queue = useQueueStore.getState();
    const next = queue.advanceForTrackEnd();
    if (!next) {
      // Nothing queued behind it, so this is the one play that still has to be
      // recorded, otherwise finishing the last track is silently dropped.
      this.commitListen(finishedTrack, playedMs);
      await this.backend.stop();
      return;
    }

    this.commitListen(finishedTrack, playedMs);
    this.consecutiveSkips = 0;
    await this.playTrack(next);
  }

  /** Manual Next. Ignores repeat-one, which only applies to a natural end. */
  async playNextInQueue(): Promise<void> {
    const next = useQueueStore.getState().advanceForManualNext();
    if (!next) return;
    this.consecutiveSkips = 0;
    await this.playTrack(next);
  }

  async playPrevious(): Promise<void> {
    if (usePlaybackStore.getState().positionMs > PREVIOUS_RESTART_MS) {
      await this.seekTo(0);
      return;
    }
    const previous = useQueueStore.getState().goBack();
    if (!previous) return;
    await this.playTrack(previous);
  }

  async pause(): Promise<void> {
    this.cancelSleepTimer();
    await this.backend.pause();
    usePlaybackStore.getState().setPlaying(false);
  }

  async resume(): Promise<void> {
    await this.backend.resume();
    usePlaybackStore.getState().setPlaying(true);
    this.startSleepTimer();
  }

  async stop(): Promise<void> {
    this.cancelSleepTimer();
    await this.backend.stop();
    usePlaybackStore.getState().setPlaying(false);
  }

  async seekTo(positionMs: number): Promise<void> {
    await this.backend.seekTo(positionMs);
  }

  async rewind(): Promise<void> {
    const position = await this.backend.getPosition();
    await this.backend.seekTo(Math.max(0, position - SEEK_STEP_MS));
  }

  async fastForward(): Promise<void> {
    const position = await this.backend.getPosition();
    const duration = await this.backend.getDuration();
    await this.backend.seekTo(Math.min(duration, position + SEEK_STEP_MS));
  }

  async setPlaybackSpeed(speed: number): Promise<void> {
    useSettingsStore.getState().setPlaybackSpeed(speed);
    await this.applyPlaybackSpeed();
  }

  private startSleepTimer(): void {
    this.cancelSleepTimer();
    const { sleepTimerEnabled, sleepTimerDuration } = useSettingsStore.getState().audio;
    if (!sleepTimerEnabled) return;

    if (sleepTimerDuration === 'end') {
      // Canceled by the queue once the track that was playing finishes.
      this.sleepTimer = setTimeout(() => {}, Number.MAX_SAFE_INTEGER);
      return;
    }
    this.sleepTimer = setTimeout(() => {
      void this.pause();
    }, sleepTimerDuration * 60_000);
  }

  cancelSleepTimer(): void {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
  }

  async dispose(): Promise<void> {
    this.cancelSleepTimer();
    await this.backend.dispose();
  }
}

/** A 404 or a network error is worth one retry; a bad file is not. */
function isLikelyTransient(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('network') ||
    message.includes('404') ||
    message.includes('403') ||
    message.includes('failed to fetch')
  );
}

export const audioService = new AudioService();
