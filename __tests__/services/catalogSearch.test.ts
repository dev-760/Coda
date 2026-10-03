/**
 * Cover for multi-kind search.
 *
 * `/search/?s=` answers `{ data: { items } }` while `?a=` and `?al=` answer the
 * top-hits form `{ data: { artists: { items }, albums: { items }, ... } }`.
 * The screen showed only artists because the suggestion list rendered nothing
 * else; these tests pin the request fan-out and the bucket parsing.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSearchTracks = jest.fn();
const mockSearchArtists = jest.fn();
const mockSearchAlbums = jest.fn();
const mockSearchPlaylists = jest.fn();

jest.mock('../../src/services/hifiApiClient', () => ({
    hifiApiClient: {
        searchTracks: (...a: unknown[]) => mockSearchTracks(...a),
        searchArtists: (...a: unknown[]) => mockSearchArtists(...a),
        searchAlbums: (...a: unknown[]) => mockSearchAlbums(...a),
        searchPlaylists: (...a: unknown[]) => mockSearchPlaylists(...a),
    },
}));

import { clearCatalogCache, searchCatalog } from '../../src/services/catalogService';

/** A `/search/?s=` payload: the flat paged form. */
function flatTracks(items: unknown[]) {
    return {
        version: '2.10',
        data: { limit: 25, offset: 0, totalNumberOfItems: items.length, items },
    };
}

/** A `/search/?a=` or `?al=` payload: the top-hits form. */
function topHits(bucket: string, items: unknown[]) {
    return {
        version: '2.10',
        data: {
            artists: { items: [] },
            albums: { items: [] },
            tracks: { items: [] },
            [bucket]: { items },
        },
    };
}

const TRACK = {
    id: 1550546,
    title: 'One More Time',
    duration: 320,
    artist: { id: 8847, name: 'Daft Punk' },
    album: { id: 1550545, title: 'Discovery', cover: '7d3b9810-5634-400c-ad89-50609e0ce800' },
};

const ARTIST = { id: 8847, name: 'Daft Punk', picture: 'c92cf3f5-066f-4f0a-87d0-c2bebff46d36' };

const ALBUM = {
    id: 1550545,
    title: 'Discovery',
    cover: '7d3b9810-5634-400c-ad89-50609e0ce800',
    releaseDate: '2001-03-12',
    numberOfTracks: 14,
    artists: [{ id: 8847, name: 'Daft Punk' }],
};

describe('searchCatalog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearCatalogCache();
        mockSearchTracks.mockResolvedValue(flatTracks([TRACK]));
        mockSearchArtists.mockResolvedValue(topHits('artists', [ARTIST]));
        mockSearchAlbums.mockResolvedValue(topHits('albums', [ALBUM]));
    });

    it('returns tracks, artists and albums together', async () => {
        const result = await searchCatalog('daft punk', 25);

        expect(result.tracks).toHaveLength(1);
        expect(result.artists).toHaveLength(1);
        expect(result.albums).toHaveLength(1);

        expect(result.tracks[0].title).toBe('One More Time');
        expect(result.artists[0].name).toBe('Daft Punk');
        expect(result.albums[0].title).toBe('Discovery');
    });

    it('sends the correct query parameter for each kind', async () => {
        await searchCatalog('daft punk', 25);

            expect(mockSearchTracks).toHaveBeenCalledWith('daft punk', 25, 0, undefined);
            expect(mockSearchArtists).toHaveBeenCalledWith('daft punk', 25, 0, undefined);
            expect(mockSearchAlbums).toHaveBeenCalledWith('daft punk', 25, 0, undefined);
    });

        it('passes an abort signal through to every kind', async () => {
            const controller = new AbortController();

            await searchCatalog('daft punk', 25, controller.signal);

            expect(mockSearchTracks).toHaveBeenCalledWith('daft punk', 25, 0, controller.signal);
            expect(mockSearchArtists).toHaveBeenCalledWith('daft punk', 25, 0, controller.signal);
            expect(mockSearchAlbums).toHaveBeenCalledWith('daft punk', 25, 0, controller.signal);
        });

    it('resolves Tidal cover uuids for artists and albums', async () => {
        const result = await searchCatalog('daft punk', 25);

        expect(result.artists[0].picture).toBe(
            'https://resources.tidal.com/images/c92cf3f5/066f/4f0a/87d0/c2bebff46d36/320x320.jpg',
        );
        expect(result.albums[0].cover).toBe(
            'https://resources.tidal.com/images/7d3b9810/5634/400c/ad89/50609e0ce800/320x320.jpg',
        );
    });

    it('keeps the other kinds when one request fails', async () => {
        mockSearchAlbums.mockRejectedValue(new Error('boom'));

        const result = await searchCatalog('daft punk', 25);

        // A single failed kind must not blank the whole screen.
        expect(result.artists).toHaveLength(1);
        expect(result.tracks).toHaveLength(1);
        expect(result.albums).toEqual([]);
    });

    it('reads a flat payload off the data envelope, not the root', async () => {
        // Regression: reading `.items` off the response root returned undefined.
        mockSearchTracks.mockResolvedValue(flatTracks([TRACK]));

        const result = await searchCatalog('daft punk', 25);

        expect(result.tracks).toHaveLength(1);
    });

    it('returns empty lists for a blank query without calling the API', async () => {
        const result = await searchCatalog('   ', 25);

        expect(result).toEqual({ tracks: [], artists: [], albums: [] });
        expect(mockSearchTracks).not.toHaveBeenCalled();
    });
});