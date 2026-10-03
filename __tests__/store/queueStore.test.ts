import {
  useQueueStore,
  getCachedTrack,
  hydrateTrackCache,
  QueueEntry,
} from '../../src/store/queueStore';
import { Track } from '../../src/providers/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const makeTrack = (id: string, artist = 'Artist'): Track => ({
  id,
  title: `Track ${id}`,
  artist,
});

const entryIds = () => useQueueStore.getState().entries.map((e) => e.entryId);
const trackIds = () => useQueueStore.getState().entries.map((e) => e.trackId);
const sources = () => useQueueStore.getState().entries.map((e) => e.source);

const resetStore = () => {
  useQueueStore.setState({
    entries: [],
    currentIndex: 0,
    repeat: 'off',
    shuffle: false,
    context: null,
    originalOrder: null,
    history: [],
  });
};

/** Seeds a queue of context entries, with the playhead at startIndex. */
const seedContext = (ids: string[], startIndex = 0) => {
  const tracks = ids.map((id) => makeTrack(id));
  useQueueStore.getState().playContext(tracks, startIndex, { type: 'album', name: 'Album' });
};

const currentId = () => {
  const s = useQueueStore.getState();
  const entry = s.entries[s.currentIndex];
  return entry ? entry.trackId : null;
};

describe('queueStore', () => {
  beforeEach(resetStore);

  describe('two tier insertion', () => {
    it('playNext inserts at the front of the user tier', () => {
      seedContext(['A', 'C1', 'C2']);
      useQueueStore.getState().playNext(makeTrack('U'));
      expect(trackIds()).toEqual(['A', 'U', 'C1', 'C2']);
      expect(sources()).toEqual(['context', 'user', 'context', 'context']);
    });

    it('playNext puts the newest entry before an existing user entry', () => {
      seedContext(['A', 'C1']);
      useQueueStore.getState().playNext(makeTrack('U1'));
      useQueueStore.getState().playNext(makeTrack('U2'));
      expect(trackIds()).toEqual(['A', 'U2', 'U1', 'C1']);
    });

    it('addToQueue appends to the end of the user tier, before context entries', () => {
      seedContext(['A', 'C1', 'C2']);
      useQueueStore.getState().addToQueue(makeTrack('U'));
      expect(trackIds()).toEqual(['A', 'U', 'C1', 'C2']);
    });

    it('user entries always play before context entries', () => {
      seedContext(['A', 'C1', 'C2']);
      useQueueStore.getState().addToQueue(makeTrack('U'));
      expect(useQueueStore.getState().advanceForTrackEnd()?.id).toBe('U');
      expect(useQueueStore.getState().advanceForTrackEnd()?.id).toBe('C1');
    });

    it('allows the same track twice as separate entries', () => {
      seedContext(['A', 'B']);
      useQueueStore.getState().playNext(makeTrack('B'));
      expect(trackIds()).toEqual(['A', 'B', 'B']);
      const [first, second] = useQueueStore.getState().entries;
      expect(first.entryId).not.toBe(second.entryId);
    });
  });

  describe('playContext', () => {
    it('sets the context and starts at the tapped track', () => {
      seedContext(['A', 'B', 'C'], 1);
      expect(currentId()).toBe('B');
      expect(useQueueStore.getState().context?.name).toBe('Album');
    });

    it('replacing the context keeps the playhead in range', () => {
      seedContext(['A', 'B', 'C'], 2);
      seedContext(['X', 'Y'], 0);
      expect(currentId()).toBe('X');
    });
  });

  describe('removal relative to the playhead', () => {
    it('removing after the playhead does not move it', () => {
      seedContext(['A', 'B', 'C', 'D'], 1);
      useQueueStore.getState().removeAt(3);
      expect(trackIds()).toEqual(['A', 'B', 'C']);
      expect(currentId()).toBe('B');
      expect(useQueueStore.getState().currentIndex).toBe(1);
    });

    it('removing before the playhead shifts it left', () => {
      seedContext(['A', 'B', 'C'], 1);
      useQueueStore.getState().removeAt(0);
      expect(currentId()).toBe('B');
      expect(useQueueStore.getState().currentIndex).toBe(0);
    });

    it('removing the current entry keeps the playhead on what slides in', () => {
      seedContext(['A', 'B', 'C'], 1);
      useQueueStore.getState().removeAt(1);
      expect(currentId()).toBe('C');
      expect(useQueueStore.getState().currentIndex).toBe(1);
    });

    it('removing the last entry when the playhead is on it clamps the index', () => {
      seedContext(['A', 'B'], 1);
      useQueueStore.getState().removeAt(1);
      expect(currentId()).toBe('A');
      expect(useQueueStore.getState().currentIndex).toBe(0);
    });

    it('clearQueue keeps the current entry and drops everything after it', () => {
      seedContext(['A', 'B', 'C'], 1);
      useQueueStore.getState().clearQueue();
      expect(trackIds()).toEqual(['A', 'B']);
      expect(currentId()).toBe('B');
      expect(useQueueStore.getState().context).toBeNull();
    });
  });

  describe('repeat', () => {
    it('off stops at the end on a natural end', () => {
      seedContext(['A', 'B'], 1);
      expect(useQueueStore.getState().advanceForTrackEnd()).toBeNull();
      expect(currentId()).toBe('B');
    });

    it('all wraps at the end on a natural end', () => {
      seedContext(['A', 'B'], 1);
      useQueueStore.getState().setRepeat('all');
      expect(useQueueStore.getState().advanceForTrackEnd()?.id).toBe('A');
    });

    it('one replays the current track on a natural end', () => {
      seedContext(['A', 'B', 'C'], 1);
      useQueueStore.getState().setRepeat('one');
      expect(useQueueStore.getState().advanceForTrackEnd()?.id).toBe('B');
      expect(useQueueStore.getState().currentIndex).toBe(1);
    });

    it('one still advances on a manual next and keeps the mode', () => {
      seedContext(['A', 'B', 'C'], 1);
      useQueueStore.getState().setRepeat('one');
      expect(useQueueStore.getState().advanceForManualNext()?.id).toBe('C');
      expect(useQueueStore.getState().repeat).toBe('one');
    });

    it('off stops at the end on a manual next', () => {
      seedContext(['A', 'B'], 1);
      expect(useQueueStore.getState().advanceForManualNext()).toBeNull();
    });

    it('all wraps on a manual next at the end', () => {
      seedContext(['A', 'B'], 1);
      useQueueStore.getState().setRepeat('all');
      expect(useQueueStore.getState().advanceForManualNext()?.id).toBe('A');
    });
  });

  describe('previous', () => {
    it('goes back one entry when not at the head', () => {
      seedContext(['A', 'B', 'C'], 2);
      expect(useQueueStore.getState().goBack()?.id).toBe('B');
      expect(currentId()).toBe('B');
    });

    it('uses history when the playhead is already at the head', () => {
          seedContext(['A', 'B', 'C'], 0);
          // Reaching index 0 again with history present is what a shuffle
          // re-entry looks like, so seed that state directly.
          const entries = useQueueStore.getState().entries;
          useQueueStore.setState({
            currentIndex: 0,
            history: [entries[1].entryId],
          });
          expect(useQueueStore.getState().goBack()?.id).toBe('B');
        });

    it('returns null with no history', () => {
      seedContext(['A', 'B'], 0);
      expect(useQueueStore.getState().goBack()).toBeNull();
    });
  });

  describe('shuffle', () => {
    it('keeps the current track current', () => {
      seedContext(['A', 'B', 'C', 'D'], 0);
      useQueueStore.getState().toggleShuffle();
      expect(currentId()).toBe('A');
    });

    it('reorders only the context tier and leaves the user tier in place', () => {
      seedContext(['A', 'C1', 'C2', 'C3'], 0);
      useQueueStore.getState().addToQueue(makeTrack('U'));
      useQueueStore.getState().toggleShuffle();
      expect(trackIds()[0]).toBe('A');
      expect(trackIds()[1]).toBe('U');
      expect(new Set(trackIds().slice(2))).toEqual(new Set(['C1', 'C2', 'C3']));
    });

    it('un-shuffle restores the original order', () => {
      seedContext(['A', 'C1', 'C2', 'C3'], 0);
      useQueueStore.getState().toggleShuffle();
      useQueueStore.getState().toggleShuffle();
      expect(trackIds()).toEqual(['A', 'C1', 'C2', 'C3']);
      expect(useQueueStore.getState().shuffle).toBe(false);
      expect(useQueueStore.getState().originalOrder).toBeNull();
    });

    it('un-shuffle keeps the same current track playing', () => {
      seedContext(['A', 'B', 'C', 'D'], 0);
      useQueueStore.getState().advanceForManualNext();
      useQueueStore.getState().toggleShuffle();
      useQueueStore.getState().toggleShuffle();
      expect(currentId()).toBe('B');
    });

    it('does not reshuffle on every advance', () => {
      seedContext(['A', 'B', 'C', 'D', 'E'], 0);
      useQueueStore.getState().toggleShuffle();
      const order = trackIds();
      useQueueStore.getState().advanceForManualNext();
      expect(trackIds().slice(1)).toEqual(order.slice(1));
    });
  });

  describe('reorder', () => {
    it('refuses to move a context entry', () => {
      seedContext(['A', 'C1', 'C2'], 0);
      useQueueStore.getState().addToQueue(makeTrack('U'));
      const before = entryIds();
      useQueueStore.getState().reorder(3, 1);
      expect(entryIds()).toEqual(before);
    });

    it('moves a user entry earlier and keeps the playhead on the current track', () => {
      seedContext(['A', 'C1'], 0);
      useQueueStore.getState().addToQueue(makeTrack('U1'));
      useQueueStore.getState().addToQueue(makeTrack('U2'));
          // Layout: A U1 U2 C1
          useQueueStore.getState().advanceForManualNext(); // playhead moves onto U1
          expect(currentId()).toBe('U1');

          useQueueStore.getState().reorder(2, 1); // move U2 in front of U1

          expect(trackIds()).toEqual(['A', 'U2', 'U1', 'C1']);
          // U1 is still the track playing, its index just shifted right.
          expect(currentId()).toBe('U1');
          expect(useQueueStore.getState().currentIndex).toBe(2);
        });

    it('ignores an out of range index', () => {
      seedContext(['A', 'C1'], 0);
      useQueueStore.getState().addToQueue(makeTrack('U1'));
      const before = entryIds();
      useQueueStore.getState().reorder(0, 99);
      useQueueStore.getState().reorder(-1, 0);
      expect(entryIds()).toEqual(before);
    });
  });

  describe('suggestions', () => {
    it('appends suggestions after existing entries', () => {
      seedContext(['A', 'C1'], 0);
      useQueueStore.getState().appendSuggestions([makeTrack('S1'), makeTrack('S2')]);
      expect(trackIds()).toEqual(['A', 'C1', 'S1', 'S2']);
      expect(sources()).toEqual(['context', 'context', 'suggestion', 'suggestion']);
    });

    it('appending nothing changes nothing', () => {
      seedContext(['A', 'C1'], 0);
      useQueueStore.getState().appendSuggestions([]);
      expect(trackIds()).toEqual(['A', 'C1']);
    });

    it('counts only upcoming entries', () => {
      seedContext(['A', 'B', 'C'], 1);
      expect(useQueueStore.getState().upcomingCount()).toBe(1);
    });
  });

  describe('track cache', () => {
    it('stores metadata outside the entries so entries stay small', () => {
      seedContext(['A', 'B'], 0);
      const entries: QueueEntry[] = useQueueStore.getState().entries;
      expect(entries[0]).toEqual({ entryId: expect.any(String), trackId: 'A', source: 'context' });
      expect(getCachedTrack('A')?.title).toBe('Track A');
    });

    it('serializes the cache so a restored queue can still resolve its tracks', () => {
      seedContext(['A', 'B', 'C'], 0);
      const persisted = useQueueStore.persist.getOptions().partialize!(
        useQueueStore.getState(),
      ) as { trackCache: Record<string, Track> };

      // Entries alone are only ids. Without the cache in the persisted payload
      // the queue cannot resolve a track after a reload, which is what made it
      // stop partway through a session.
      expect(persisted.trackCache.A.id).toBe('A');
      expect(persisted.trackCache.A.title).toBe('Track A');
    });

    it('hydrates a cache written by a previous session', () => {
      seedContext(['A'], 0);
      const persisted = useQueueStore.persist.getOptions().partialize!(
        useQueueStore.getState(),
      ) as { trackCache: Record<string, Track> };

      hydrateTrackCache(persisted.trackCache);
      expect(getCachedTrack('A')?.artist).toBe('Artist');
    });
  });
});