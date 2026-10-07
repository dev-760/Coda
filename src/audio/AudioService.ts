import { ExpoAudioBackend } from './ExpoAudioBackend';
import { usePlaybackStore } from '../store/playbackStore';
import { useQueueStore, getCachedTrack } from '../store/queueStore';
import { useSettingsStore } from '../store/settingsStore';
import { logger } from '../logging/Logger';
import { Track, StreamInfo } from '../providers/types';
import { getActiveProvider } from '../providers/registry';
import { useDownloadStore } from '../downloads/downloadStore';
import { recordCompletedPlay, useListeningStore } from '../store/listeningStore';
import { useLibraryStore } from '../store/libraryStore';
import { isOnline } from '../services/connectivity';

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
    this.backend.events.onNext = () => {
      void this.playNextInQueue();
    };
    this.backend.events.onPrevious = () => {
      void this.playPrevious();
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
        await this.playAttempt(track, attempt + 1);
        return;
      }

      store.setError(message);
      store.setPlaying(false);
      await this.skipUnplayable(track, message);
    } finally {
      store.setLoading(false);
    }
  }

  private async skipUnplayable(track: Track, reason?: string): Promise<void> {
    this.consecutiveSkips += 1;

    if (this.consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
      // The whole queue is unplayable, so stop instead of cycling forever.
      usePlaybackStore.getState().setPlaying(false);
      usePlaybackStore
        .getState()
        .setError('Playback stopped: multiple tracks could not be played. Check your connection or audio quality.');
      logger.error('AudioService', `${MAX_CONSECUTIVE_SKIPS} tracks failed in a row, stopping`);
      return;
    }

    usePlaybackStore
      .getState()
      // Prefer the specific cause (e.g. Offline Mode) over a generic failure.
      .setError(reason ?? `Skipped ${track.title}: it could not be played.`);

    const next = useQueueStore.getState().advanceForManualNext();
    if (!next) return;
    await this.playAttempt(next, 0);
  }

  /**
   * Local file first, then network. Keeps downloaded music playable offline.
   *
   * When Offline Mode is on, a track with no downloaded copy is refused rather
   * than silently falling through to the network. The toggle is otherwise inert:
   * it was persisted but nothing consulted it, so switching it on looked like
   * it should avoid mobile data and did not.
   */
  private async resolveStream(track: Track): Promise<StreamInfo> {
    const localPath = await useDownloadStore.getState().getOfflineTrackUrl(track.id);
    if (localPath) {
      logger.info('AudioService', `Playing downloaded file for track ${track.id}`);
      return { url: localPath, format: 'unknown' };
    }
    if (useSettingsStore.getState().offlineMode) {
      throw new Error(`"${track.title}" is not downloaded and Offline Mode is on.`);
    }
    if (!isOnline()) {
      throw new Error(`"${track.title}" is not downloaded and no network connection is available.`);
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

      // If AutoQueue is enabled and we are online, seamlessly continue playback
      if (
        finishedTrack &&
        useListeningStore.getState().autoQueueEnabled &&
        isOnline() &&
        !useSettingsStore.getState().offlineMode
      ) {
        try {
          const { recommendationsService } = await import('../services/recommendationsService');
          const similar = await recommendationsService.getSimilarTracks(finishedTrack.id, 10);
          if (similar && similar.length > 0) {
            queue.appendSuggestions(similar);
            const autoNext = queue.advanceForTrackEnd();
            if (autoNext) {
              this.consecutiveSkips = 0;
              await this.playTrack(autoNext);
              return;
            }
          }
        } catch (error) {
          logger.warn('AudioService', 'AutoQueue refill on track end failed', error);
        }
      }

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

  private lastPreviousClickTime = 0;

  async playPrevious(forcePrevious = false): Promise<void> {
    const now = Date.now();
    const isDoubleTap = now - this.lastPreviousClickTime < 2000;
    this.lastPreviousClickTime = now;

    if (!forcePrevious && !isDoubleTap && usePlaybackStore.getState().positionMs > PREVIOUS_RESTART_MS) {
      await this.seekTo(0);
      return;
    }
    const previous = useQueueStore.getState().goBack();
    if (!previous) {
      await this.seekTo(0);
      return;
    }
    await this.playTrack(previous);
  }

  async pause(): Promise<void> {
    this.cancelSleepTimer();
    usePlaybackStore.getState().setPlaying(false);
    if (this.backend.hasLoadedTrack()) {
      await this.backend.pause();
    }
  }

  async resume(): Promise<void> {
    const store = usePlaybackStore.getState();
    const currentQueueTrack = (() => {
      const entry = useQueueStore.getState().currentEntry();
      return entry ? getCachedTrack(entry.trackId) ?? null : null;
    })();
    const trackToPlay = store.currentTrack ?? currentQueueTrack;

    if (!this.backend.hasLoadedTrack()) {
      if (trackToPlay) {
        const targetPos = store.positionMs;
        await this.playAttempt(trackToPlay, 0);
        if (targetPos > 0) {
          await this.seekTo(targetPos);
        }
        return;
      }
      return;
    }

    usePlaybackStore.getState().setPlaying(true);
    await this.backend.resume();
    this.startSleepTimer();
  }

  async stop(): Promise<void> {
    this.cancelSleepTimer();
    await this.backend.stop();
    usePlaybackStore.getState().setPlaying(false);
  }

  async seekTo(positionMs: number): Promise<void> {
    usePlaybackStore.setState({ positionMs });
    if (this.backend.hasLoadedTrack()) {
      await this.backend.seekTo(positionMs);
    }
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

  startSleepTimer(): void {
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

  resetSleepTimer(): void {
    const isPlaying = usePlaybackStore.getState().isPlaying;
    if (isPlaying) {
      this.startSleepTimer();
    } else {
      this.cancelSleepTimer();
    }
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
    message.includes('429') ||
    message.includes('failed to fetch') ||
    message.includes('connection')
  );
}

export const audioService = new AudioService();
