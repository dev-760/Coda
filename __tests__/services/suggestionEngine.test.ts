import AsyncStorage from '@react-native-async-storage/async-storage';
import { useListeningStore, SKIP_THRESHOLD_MS } from '../../src/store/listeningStore';
import { useLibraryStore } from '../../src/store/libraryStore';
import { useDownloadStore } from '../../src/downloads/downloadStore';
import { getSuggestions, clearSuggestionCache } from '../../src/services/suggestionEngine';
import { Track } from '../../src/providers/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Offline is the default for these tests so only the local pool is used and
// the assertions stay deterministic.
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isInternetReachable: false, type: 'NONE' })),
  NetworkStateType: { WIFI: 'WIFI', CELLULAR: 'CELLULAR', NONE: 'NONE' },
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('../../src/providers/registry', () => ({
  getActiveProvider: () => ({
    search: jest.fn(async () => []),
    getStreamInfo: jest.fn(),
  }),
}));

const track = (id: string, artist: string, album?: string): Track => ({
  id,
  title: `Track ${id}`,
  artist,
  album,
});

function resetStores() {
  useListeningStore.setState({
    stats: {},
    history: [],
    autoQueueEnabled: false,
    clearedAt: null,
  });
  useLibraryStore.setState({ favorites: [], playlists: [], recentlyPlayed: [] });
  useDownloadStore.setState({ downloads: [], isLoading: false, error: null });
  clearSuggestionCache();
}

/** Records completed plays so artist affinity exists. */
function listen(tracks: Track[], timesPerTrack = 1) {
  for (let i = 0; i < timesPerTrack; i += 1) {
    for (const t of tracks) {
      useListeningStore.getState().recordPlay(t, SKIP_THRESHOLD_MS + 1000);
    }
  }
}

describe('suggestionEngine', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetStores();
  });

  describe('empty history', () => {
    it('returns nothing rather than inventing suggestions', async () => {
      useLibraryStore.setState({ favorites: [] });
      const result = await getSuggestions(null);
      expect(result).toEqual([]);
    });

    it('reports that there is no history', () => {
      expect(useListeningStore.getState().hasHistory()).toBe(false);
    });
  });

  describe('scoring', () => {
    it('ranks a track by the artist the user actually played', async () => {
      listen([track('seed', 'Alpha')]);

      useLibraryStore.setState({
        favorites: [track('like-artist', 'Alpha'), track('other-artist', 'Zeta')],
      });

      const results = await getSuggestions(null);
      expect(results[0].track.id).toBe('like-artist');
    });

    it('scores a favorite above a downloaded track from an equally unheard artist', async () => {
          listen([track('seed', 'Alpha')]);

          const favorite = track('fav', 'Beta');
          const downloaded = track('downloaded', 'Gamma');
          useLibraryStore.setState({ favorites: [favorite] });
          useDownloadStore.setState({
            downloads: [
              {
                trackId: 'downloaded',
                track: downloaded,
                status: 'completed',
                progress: 100,
                downloadedBytes: 10,
                totalBytes: 10,
                filePath: 'file:///a.flac',
                format: 'flac',
                quality: 'LOSSLESS',
                createdAt: 1,
                retryCount: 0,
              },
            ],
          });

          const results = await getSuggestions(null, 10);
          const ids = results.map((r) => r.track.id);
          expect(ids).toContain('fav');
          // A download alone gives no affinity, so it does not qualify.
          expect(ids).not.toContain('downloaded');
        });

        it('explains a ranking that came from artist affinity', async () => {
          listen([track('seed', 'Alpha')]);
          useLibraryStore.setState({ favorites: [track('fav', 'Alpha')] });

          const results = await getSuggestions(null);
          expect(results[0].reason).toBe('Because you play Alpha');
        });

        it('reports a favorite from an unheard artist as a favorite pick', async () => {
          listen([track('seed', 'Alpha')]);
          useLibraryStore.setState({ favorites: [track('solo-fav', 'Unheard')] });

          const results = await getSuggestions(null);
          const solo = results.find((r) => r.track.id === 'solo-fav');
          expect(solo?.reason).toBe('From your favorites');
        });

    it('penalises a track with a history of skips once it leaves the recent window', async () => {
      listen([track('seed', 'Alpha')]);

          // A track is only suggested once it falls out of the recent-play window,
          // so the skip history is what decides whether it comes back.
          const skipped = track('skipped', 'Beta');
          for (let i = 0; i < 3; i += 1) {
            useListeningStore.getState().recordPlay(skipped, 1000);
          }

          // Push it out of the recent window with other plays.
          for (let i = 0; i < 12; i += 1) {
            useListeningStore.getState().recordPlay(track(`filler-${i}`, 'Filler'), 200_000);
          }

          useLibraryStore.setState({ favorites: [skipped, track('fresh-fav', 'Gamma')] });

          const ids = (await getSuggestions(null, 10)).map((r) => r.track.id);
          // Three skips outweigh the favorite boost, so it is not suggested again.
          expect(ids).toContain('fresh-fav');
          expect(ids).not.toContain('skipped');
        });

        it('never suggests something already in the recent window', async () => {
          const recent = track('recent', 'Alpha');
          listen([recent, track('seed', 'Alpha')]);
          useLibraryStore.setState({ favorites: [recent] });

          const ids = (await getSuggestions(null, 10)).map((r) => r.track.id);
          expect(ids).not.toContain('recent');
        });

    it('applies recency decay so an old artist scores lower than a fresh one', async () => {
      const old = track('old-track', 'OldArtist');
      const fresh = track('fresh-track', 'FreshArtist');

      // Old plays are backdated well past the half life.
      const week = 86_400_000 * 40;
      useLibraryStore.setState({
        favorites: [old, fresh],
      });
      useListeningStore.setState({
        stats: {
          [old.id]: {
            trackId: old.id,
            artist: 'OldArtist',
            playCount: 1,
            completedPlays: 1,
            skips: 0,
            lastPlayedAt: Date.now() - week,
          },
          [fresh.id]: {
            trackId: fresh.id,
            artist: 'FreshArtist',
            playCount: 1,
            completedPlays: 1,
            skips: 0,
            lastPlayedAt: Date.now(),
          },
        },
        history: [],
        autoQueueEnabled: false,
        clearedAt: null,
      });

      const results = await getSuggestions(null);
      expect(results[0].track.id).toBe('fresh-track');
    });

    it('never suggests the seed track or anything just played', async () => {
      const seed = track('seed', 'Alpha');
      const recent = track('recent', 'Alpha');
      listen([seed, recent]);

      const results = await getSuggestions(seed);
      const ids = results.map((r) => r.track.id);
      expect(ids).not.toContain('seed');
      expect(ids).not.toContain('recent');
    });
  });

  describe('diversity', () => {
    it('does not put more than two of one artist in a row', async () => {
      const favorites = [
        track('a1', 'Same'),
        track('a2', 'Same'),
        track('a3', 'Same'),
        track('b1', 'Other'),
        track('b2', 'Other'),
      ];
      listen([track('seed', 'Seed')]);
      useLibraryStore.setState({ favorites });

      const results = await getSuggestions(null, 5);
      for (let i = 2; i < results.length; i += 1) {
        const a = results[i - 2].track.artist;
        const b = results[i - 1].track.artist;
        const c = results[i].track.artist;
        expect(a === b && b === c).toBe(false);
      }
    });

    it('de-duplicates so a track appears once', async () => {
      const t = track('dup', 'Alpha');
      // The same track present in favorites, a playlist, and downloads.
      useLibraryStore.setState({
        favorites: [t],
        playlists: [
          {
            id: 'p1',
            name: 'P',
            tracks: [t],
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      });
      listen([track('seed', 'Seed')]);

      const results = await getSuggestions(null, 10);
      expect(results.filter((r) => r.track.id === 'dup')).toHaveLength(1);
    });
  });

  describe('candidates', () => {
    it('uses completed downloads as candidates', async () => {
      listen([track('seed', 'Seed')]);
      useDownloadStore.setState({
        downloads: [
          {
            trackId: 'dl1',
            track: track('dl1', 'Seed'),
            status: 'completed',
            progress: 100,
            downloadedBytes: 10,
            totalBytes: 10,
            filePath: 'file:///a.flac',
            format: 'flac',
            quality: 'LOSSLESS',
            createdAt: 1,
            retryCount: 0,
          },
        ],
      });

      const results = await getSuggestions(null, 10);
      expect(results.map((r) => r.track.id)).toContain('dl1');
    });

    it('ignores an incomplete download', async () => {
      listen([track('seed', 'Seed')]);
      useDownloadStore.setState({
        downloads: [
          {
            trackId: 'partial',
            track: track('partial', 'Seed'),
            status: 'downloading',
            progress: 40,
            downloadedBytes: 4,
            totalBytes: 10,
            filePath: null,
            format: 'flac',
            quality: 'LOSSLESS',
            createdAt: 1,
            retryCount: 0,
          },
        ],
      });

      const results = await getSuggestions(null, 10);
      expect(results.map((r) => r.track.id)).not.toContain('partial');
    });
  });

  describe('reasons', () => {
    it('every suggestion carries a reason the user can verify', async () => {
      listen([track('seed', 'Alpha')]);
      useLibraryStore.setState({ favorites: [track('fav', 'Alpha')] });

      const results = await getSuggestions(null, 5);
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.reason.length).toBeGreaterThan(0);
            expect(result.reason).toMatch(/Because you play|From your favorites/);
      }
    });
  });

  describe('clearing listening data', () => {
    it('clearing listening data removes derived picks but keeps explicit favorites', async () => {
      listen([track('seed', 'Alpha')]);
      useLibraryStore.setState({ favorites: [track('fav', 'Alpha')] });

      expect(await getSuggestions(null)).not.toEqual([]);

          // Clearing listening data wipes history, but a favorite is an explicit
          // choice so it still qualifies on its own.
          useListeningStore.getState().clearListeningData();
          const afterClear = await getSuggestions(null);
          expect(afterClear.every((r) => r.reason === 'From your favorites')).toBe(true);

          // With no favorites either, there is nothing left to suggest.
          useLibraryStore.setState({ favorites: [] });
          expect(await getSuggestions(null)).toEqual([]);
        });
  });
});