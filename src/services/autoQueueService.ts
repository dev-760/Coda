import { useQueueStore, getCachedTrack } from '../store/queueStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useListeningStore } from '../store/listeningStore';
import { getSuggestions } from './suggestionEngine';
import { AUTO_QUEUE_FILL_COUNT, AUTO_QUEUE_MIN_REMAINING } from './suggestionWeights';
import { logger } from '../logging/Logger';

/**
 * Refills the context tier when it runs low, so a queue started from a small
 * list does not dead-end. Gated on repeat being off, because wrapping or
 * repeating one means the existing entries are not going to run out.
 */
class AutoQueueService {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;
  private running = false;
  private readonly checkIntervalMs = 30_000;

  start(): void {
    if (this.unsubscribe) return;

    // React to playhead moves rather than waiting for the poll tick.
    this.unsubscribe = useQueueStore.subscribe((state, prev) => {
      if (state.currentIndex !== prev.currentIndex || state.entries !== prev.entries) {
        void this.checkAndFill();
      }
    });

    this.syncWithSetting();
  }

  private startPolling(): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => {
      void this.checkAndFill();
    }, this.checkIntervalMs);
  }

  private stopPolling(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /** Called when the user toggles the setting, so it survives a relaunch. */
  syncWithSetting(): void {
    if (useListeningStore.getState().autoQueueEnabled) {
      this.startPolling();
      void this.checkAndFill();
    } else {
      this.stopPolling();
    }
  }

  private async checkAndFill(): Promise<void> {
    // A second trigger while the first is awaiting the network is wasted work.
    if (this.running) return;
    if (!useListeningStore.getState().autoQueueEnabled) return;
    if (!usePlaybackStore.getState().isPlaying) return;

    const queue = useQueueStore.getState();
    if (queue.upcomingCount() > AUTO_QUEUE_MIN_REMAINING) return;
    if (queue.repeat !== 'off') return;

    const seedEntry = queue.currentEntry();
    if (!seedEntry) return;
    const seed = getCachedTrack(seedEntry.trackId);
    if (!seed) return;

    this.running = true;
    try {
      const suggestions = await getSuggestions(seed, AUTO_QUEUE_FILL_COUNT);
      const existing = new Set(queue.entries.map((entry) => entry.trackId));

      // Deduplicate against the queue and within the incoming batch.
      const fresh = suggestions
        .map((s) => s.track)
        .filter((track) => {
          if (existing.has(track.id)) return false;
          existing.add(track.id);
          return true;
        });

      if (fresh.length > 0) {
        useQueueStore.getState().appendSuggestions(fresh);
        logger.info('AutoQueueService', `Added ${fresh.length} tracks to the queue`);
      }
    } catch (error) {
      logger.warn('AutoQueueService', 'Could not refill the queue', error);
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    this.stopPolling();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const autoQueueService = new AutoQueueService();
