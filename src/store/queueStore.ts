import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../providers/types';
import { useLibraryStore } from './libraryStore';
import { useDownloadStore } from '../downloads/downloadStore';

export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Where a queue tier came from. User entries play before context entries, which
 * is how "Next in queue" always wins over "Next from: <context>".
 */
export type EntrySource = 'user' | 'context' | 'suggestion';

/**
 * Every entry carries its own id so the same track can appear more than once,
 * matching the MusicKit queue model.
 */
export interface QueueEntry {
  entryId: string;
  trackId: string;
  source: EntrySource;
}

export interface QueueContext {
  type: 'album' | 'playlist' | 'artist' | 'search' | 'collection' | 'radio';
  id?: string;
  name: string;
}

interface QueueState {
  entries: QueueEntry[];
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  context: QueueContext | null;
  /** Pre-shuffle entry ids, transient, used to restore order on un-shuffle. */
  originalOrder: string[] | null;
  /** Entry ids that have played, so Previous survives a shuffle. */
  history: string[];

  // Queue mutation
  playContext: (tracks: Track[], startIndex: number, context: QueueContext) => void;
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  appendSuggestions: (tracks: Track[]) => void;
  removeAt: (index: number) => void;
  clearQueue: () => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  setContext: (context: QueueContext | null) => void;

  // Navigation, pure
  currentEntry: () => QueueEntry | null;
  getNextTrack: () => Track | null;
  peekNext: () => Track | null;
  advanceForTrackEnd: () => Track | null;
  advanceForManualNext: () => Track | null;
  goBack: () => Track | null;
  upcomingCount: () => number;
}

let entryCounter = 0;
function makeEntry(trackId: string, source: EntrySource): QueueEntry {
  entryCounter += 1;
  return { entryId: `${trackId}#${entryCounter}`, trackId, source };
}

/**
 * Track metadata lives outside the entries so persisting the queue does not
 * duplicate a full Track object per entry.
 */
const trackCache = new Map<string, Track>();
export function cacheTracks(tracks: Track[]): void {
  for (const track of tracks) trackCache.set(track.id, track);
}
export function getCachedTrack(trackId: string): Track | undefined {
  return trackCache.get(trackId);
}

/**
 * Snapshot of the cache, for persisting alongside the entries.
 *
 * The queue stores only ids, so without this the metadata is lost on reload and
 * every lookup after it resolves to nothing. That is what made the queue work
 * for the first few tracks and then stop, and why it appeared to work on some
 * songs and not others.
 */
function serializeTrackCache(): Record<string, Track> {
  return Object.fromEntries(trackCache);
}

/** Restores the metadata cache after a reload. */
export function hydrateTrackCache(tracks: Record<string, Track> | undefined): void {
  if (!tracks) return;
  for (const [trackId, track] of Object.entries(tracks)) {
    if (track && typeof track.id === 'string') trackCache.set(trackId, track);
  }
}

/**
 * Last resort for an entry whose metadata is missing: looks the id up in the
 * places a track is durably stored, so a queue saved by an older version still
 * plays instead of silently stalling on an unresolvable id.
 */
function findKnownTrack(trackId: string): Track | undefined {
  const library = useLibraryStore.getState();
  const fromLibrary =
    library.favorites.find((track) => track.id === trackId) ??
    library.recentlyPlayed.find((track) => track.id === trackId);
  if (fromLibrary) return fromLibrary;

  for (const playlist of library.playlists) {
    const match = playlist.tracks.find((track) => track.id === trackId);
    if (match) return match as Track;
  }

  for (const item of useDownloadStore.getState().downloads) {
    if (item.track?.id === trackId) return item.track;
  }

  return undefined;
}

function isContextSource(source: EntrySource): boolean {
  return source === 'context' || source === 'suggestion';
}

/** End of the user tier: after the current entry, before any context entry. */
function userTierEnd(entries: QueueEntry[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < entries.length; i += 1) {
    if (isContextSource(entries[i].source)) return i;
  }
  return entries.length;
}

/** Play next goes to the very front of the user tier. */
function userTierStart(entries: QueueEntry[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < entries.length; i += 1) {
    if (entries[i].source === 'user') return i;
  }
  return userTierEnd(entries, currentIndex);
}

function fisherYates<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Swaps out long runs of one artist so a shuffle does not cluster them. */
function reduceArtistRuns(entries: QueueEntry[], maxRun: number): QueueEntry[] {
  const artistOf = (entry: QueueEntry): string | undefined =>
    trackCache.get(entry.trackId)?.artist;
  const result = [...entries];

  for (let i = 1; i < result.length; i += 1) {
    let runLength = 1;
    while (
      i - runLength >= 0 &&
      artistOf(result[i - runLength]) === artistOf(result[i]) &&
      runLength <= maxRun
    ) {
      runLength += 1;
    }
    if (runLength > maxRun + 1 && i + 1 < result.length && artistOf(result[i + 1]) !== artistOf(result[i])) {
      [result[i], result[i + 1]] = [result[i + 1], result[i]];
    }
  }
  return result;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      entries: [],
      currentIndex: 0,
      repeat: 'off',
      shuffle: false,
      context: null,
      originalOrder: null,
      history: [],

      playContext: (tracks, startIndex, context) => {
        cacheTracks(tracks);
        set({
          entries: tracks.map((track) => makeEntry(track.id, 'context')),
          currentIndex: Math.max(0, Math.min(startIndex, tracks.length - 1)),
          context,
          shuffle: false,
          originalOrder: null,
          history: [],
        });
      },

      playNext: (track) => {
        cacheTracks([track]);
        set((state) => {
          const entries = [...state.entries];
          entries.splice(userTierStart(entries, state.currentIndex), 0, makeEntry(track.id, 'user'));
          return { entries };
        });
      },

      addToQueue: (track) => {
        cacheTracks([track]);
        set((state) => {
          const entries = [...state.entries];
          entries.splice(userTierEnd(entries, state.currentIndex), 0, makeEntry(track.id, 'user'));
          return { entries };
        });
      },

      /** Used by the suggestion engine to refill a nearly empty context tier. */
      appendSuggestions: (tracks: Track[]) => {
        if (tracks.length === 0) return;
        cacheTracks(tracks);
        set((state) => ({
          entries: [
            ...state.entries,
            ...tracks.map((track) => makeEntry(track.id, 'suggestion' as EntrySource)),
          ],
        }));
      },

      removeAt: (index) => {
        set((state) => {
          if (index < 0 || index >= state.entries.length) return {};
          const entries = state.entries.filter((_, i) => i !== index);
          let currentIndex = state.currentIndex;

          if (index < state.currentIndex) {
            // A played entry was removed, so the playhead shifts left.
            currentIndex -= 1;
          } else if (index === state.currentIndex) {
            // Whatever was playing keeps its slot; the next entry slides in.
            currentIndex = Math.min(state.currentIndex, entries.length - 1);
          }
          // Removing an entry after the playhead must not move it.

          return { entries, currentIndex: Math.max(0, currentIndex) };
        });
      },

      clearQueue: () => {
        set((state) => ({
          // The current entry keeps playing; only what is queued is dropped.
          entries: state.entries.slice(0, state.currentIndex + 1),
          context: null,
          shuffle: false,
          originalOrder: null,
        }));
      },

      reorder: (fromIndex, toIndex) => {
        set((state) => {
          const { entries, currentIndex } = state;
          if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= entries.length ||
            toIndex >= entries.length
          ) {
            return {};
          }
          // Only the user tier is reorderable, which is what the screen renders.
          if (entries[fromIndex].source !== 'user' || entries[toIndex].source !== 'user') return {};

          const next = [...entries];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);

          let nextIndex = currentIndex;
          if (fromIndex === currentIndex) {
            nextIndex = toIndex;
          } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
            nextIndex = currentIndex - 1;
          } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
            nextIndex = currentIndex + 1;
          }

          return { entries: next, currentIndex: nextIndex };
        });
      },

      setRepeat: (mode) => set({ repeat: mode }),

      toggleShuffle: () => {
        set((state) => {
          const { entries, currentIndex } = state;

          if (!state.shuffle) {
            const head = entries.slice(0, currentIndex + 1);
            const upcoming = entries.slice(currentIndex + 1);
            const contextEntries = upcoming.filter((entry) => isContextSource(entry.source));
            const shuffledContext = reduceArtistRuns(fisherYates(contextEntries), 2);

            let cursor = 0;
            const merged = upcoming.map((entry) =>
              isContextSource(entry.source) ? shuffledContext[cursor++] : entry,
            );

            return {
              entries: [...head, ...merged],
              shuffle: true,
              originalOrder: entries.map((entry) => entry.entryId),
            };
          }

          if (!state.originalOrder) return { shuffle: false };

          // Duplicate entry ids are impossible, so a plain rank map is enough.
          const ranks = new Map<string, number>();
          state.originalOrder.forEach((entryId, i) => ranks.set(entryId, i));

          const currentEntryId = entries[currentIndex]?.entryId;
          const restored = [...entries]
            .map((entry) => ({ entry, rank: ranks.get(entry.entryId) ?? Number.MAX_SAFE_INTEGER }))
            .sort((a, b) => a.rank - b.rank)
            .map((item) => item.entry);

          const restoredIndex = currentEntryId
            ? restored.findIndex((entry) => entry.entryId === currentEntryId)
            : -1;

          return {
            entries: restored,
            shuffle: false,
            originalOrder: null,
            currentIndex: restoredIndex >= 0 ? restoredIndex : state.currentIndex,
          };
        });
      },

      setContext: (context) => set({ context }),

      currentEntry: () => get().entries[get().currentIndex] ?? null,

      getNextTrack: () => {
        const { entries, currentIndex } = get();
        const entry = entries[currentIndex + 1];
        return entry ? getCachedTrack(entry.trackId) ?? null : null;
      },

      peekNext: () => get().getNextTrack(),

      /**
       * Natural end. Repeat one replays the current entry without moving the
       * playhead, so history is not extended.
       */
      advanceForTrackEnd: () => {
        const { entries, currentIndex, repeat } = get();
        if (entries.length === 0) return null;

        const currentEntry = entries[currentIndex];
        const pushHistory = (history: string[]) => [currentEntry.entryId, ...history].slice(0, 50);

        if (repeat === 'one') {
          set({ history: pushHistory(get().history) });
          return getCachedTrack(currentEntry.trackId) ?? null;
        }

        let nextIndex: number;
        if (currentIndex >= entries.length - 1) {
          if (repeat !== 'all') return null;
          nextIndex = 0;
        } else {
          nextIndex = currentIndex + 1;
        }

        set({ currentIndex: nextIndex, history: pushHistory(get().history) });
        return getCachedTrack(entries[nextIndex].trackId) ?? null;
      },

      /** Manual Next always advances, even while repeat one is selected. */
      advanceForManualNext: () => {
        const { entries, currentIndex, repeat } = get();
        if (entries.length === 0) return null;

        const currentEntry = entries[currentIndex];
        const history = [currentEntry.entryId, ...get().history].slice(0, 50);

        if (currentIndex >= entries.length - 1 && repeat !== 'all') {
          set({ history });
          return null;
        }

        const nextIndex = currentIndex >= entries.length - 1 ? 0 : currentIndex + 1;
        set({ currentIndex: nextIndex, history });
        return getCachedTrack(entries[nextIndex].trackId) ?? null;
      },

      goBack: () => {
        const { entries, currentIndex, history } = get();
        if (currentIndex > 0) {
          const target = currentIndex - 1;
          set({ currentIndex: target });
          return getCachedTrack(entries[target].trackId) ?? null;
        }

        // At the head of the queue, history is the only way back.
        const [previousEntryId] = history;
        if (!previousEntryId) return null;
        const index = entries.findIndex((entry) => entry.entryId === previousEntryId);
        if (index === -1) return null;
        set({ currentIndex: index });
        return getCachedTrack(entries[index].trackId) ?? null;
      },

      upcomingCount: () => {
        const { entries, currentIndex } = get();
        return Math.max(0, entries.length - currentIndex - 1);
      },
    }),
    {
      name: 'luma-queue-storage',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        entries: state.entries,
        currentIndex: state.currentIndex,
        repeat: state.repeat,
        context: state.context,
        // Persisted so a restored queue can still resolve its tracks. Entries
        // alone are only ids, and losing the metadata stops playback entirely.
        trackCache: serializeTrackCache(),
        // A shuffled order cannot survive a reload, so it is never persisted.
        shuffle: false,
      }),
      migrate: (persisted) => {
        const legacy = (persisted ?? {}) as {
          tracks?: Track[];
          entries?: QueueEntry[];
          currentIndex?: number;
          repeat?: string;
          context?: QueueContext | null;
          sourceContext?: QueueContext | null;
          trackCache?: Record<string, Track>;
        };
        if (Array.isArray(legacy.tracks)) {
          // v2 stored full tracks in a single tier. Rebuild the entry model so
          // an existing queue survives the upgrade.
          cacheTracks(legacy.tracks);
          return {
            entries: legacy.tracks.map((track) => makeEntry(track.id, 'context')),
            currentIndex: typeof legacy.currentIndex === 'number' ? legacy.currentIndex : 0,
            repeat: legacy.repeat === 'all' || legacy.repeat === 'one' ? legacy.repeat : 'off',
            context: legacy.sourceContext ?? null,
            shuffle: false,
            originalOrder: null,
            history: [],
          };
        }

        // A queue saved by an earlier version has no cache, but the library and
        // downloads can still supply metadata for it, so it is restored below
        // rather than being left permanently unplayable.
        hydrateTrackCache(legacy.trackCache);

        return {
          entries: Array.isArray(legacy.entries) ? legacy.entries : [],
          currentIndex: typeof legacy.currentIndex === 'number' ? legacy.currentIndex : 0,
          repeat: legacy.repeat === 'all' || legacy.repeat === 'one' ? legacy.repeat : 'off',
          context: legacy.context ?? null,
          shuffle: false,
          originalOrder: null,
          history: [],
        };
      },
      onRehydrateStorage: () => (state) => {
        // Re-seeding from the library covers entries cached before this version
        // and any track the cache is missing after a migration.
        if (!state) return;
        for (const entry of state.entries) {
          if (trackCache.has(entry.trackId)) continue;
          const known = findKnownTrack(entry.trackId);
          if (known) trackCache.set(entry.trackId, known);
        }
      },
    }
  )
);
