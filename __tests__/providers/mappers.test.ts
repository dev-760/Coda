import {
  mapHifiApiTrack,
  mapHifiApiTracks,
  mapHifiApiArtist,
  mapHifiApiAlbum,
  mapAlbumWithTracks,
  readSearchBucket,
  readArtistAlbums,
  readArtistTracks,
  tidalCoverUrl,
} from '../../src/providers/mappers';

/**
 * These cover the response shapes the live API actually returns, including the
 * inconsistent envelopes that previously made search return nothing.
 */

describe('tidalCoverUrl', () => {
  it('converts a uuid to the CDN path', () => {
    expect(tidalCoverUrl('13c6aa66-410e-433f-a8d8-a4b13cefe446')).toBe(
      'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
    );
  });
});

describe('mapHifiApiTrack', () => {
  const bare = {
    id: 194567102,
    title: 'Still Sleepless',
    duration: 163,
    artist: { id: 1, name: 'Solomzy' },
    album: { id: 2, title: 'Solomzy', cover: 'aa-bb-cc-dd' },
  };

  it('maps a bare track payload', () => {
    expect(mapHifiApiTrack(bare)).toEqual({
      id: '194567102',
      title: 'Still Sleepless',
      artist: 'Solomzy',
      album: 'Solomzy',
      coverUrl: tidalCoverUrl('aa-bb-cc-dd'),
      durationMs: 163000,
    });
  });

  it('unwraps an { item } entry as used by album tracks', () => {
    expect(mapHifiApiTrack({ item: bare, type: 'TRACK' })?.id).toBe('194567102');
  });

  it('unwraps a { track } entry as used by recommendations', () => {
    expect(mapHifiApiTrack({ track: bare, sources: [] })?.title).toBe('Still Sleepless');
  });

  it('falls back to the artists array when artist is absent', () => {
    const { artist, ...withoutArtist } = bare;
    const track = mapHifiApiTrack({
      ...withoutArtist,
      artists: [{ id: 9, name: 'Contributed' }],
    });
    expect(track?.artist).toBe('Contributed');
  });

  it('reports Unknown Artist rather than inventing one', () => {
    const { artist, album, ...rest } = bare;
    const track = mapHifiApiTrack(rest);
    expect(track?.artist).toBe('Unknown Artist');
  });

  it('returns null for a payload missing required fields', () => {
    expect(mapHifiApiTrack({ duration: 100 })).toBeNull();
    expect(mapHifiApiTrack(null)).toBeNull();
  });

  it('maps string artist and album shapes', () => {
    const track = mapHifiApiTrack({ id: 1, title: 'X', artist: 'A', album: 'B' });
    expect(track).toMatchObject({ artist: 'A', album: 'B', coverUrl: undefined });
  });
});

describe('mapHifiApiTracks', () => {
  it('drops unparseable entries instead of propagating them', () => {
    const result = mapHifiApiTracks([
      { id: 1, title: 'Valid', artist: { name: 'A' } },
      { nonsense: true },
      null,
    ]);
    expect(result).toHaveLength(1);
  });

  it('returns empty for a non-array', () => {
    expect(mapHifiApiTracks(undefined)).toEqual([]);
  });
});

describe('mapHifiApiArtist', () => {
  it('resolves the bare uuid picture into a URL', () => {
    const artist = mapHifiApiArtist({
      artist: {
        id: 8847,
        name: 'Daft Punk',
        picture: '65d23ddc-7b3b-4b17-bc84-b02832ddc204',
        popularity: 95,
        mixes: { ARTIST_MIX: '0002737adb8d077f4591c4cdb7ba60' },
      },
    });
    expect(artist).toEqual({
      id: '8847',
      name: 'Daft Punk',
      picture: tidalCoverUrl('65d23ddc-7b3b-4b17-bc84-b02832ddc204'),
      mixId: '0002737adb8d077f4591c4cdb7ba60',
      popularity: 95,
    });
  });

  it('accepts a bare artist object', () => {
    expect(mapHifiApiArtist({ id: 5, name: 'Solo' })?.name).toBe('Solo');
  });

  it('allows a missing picture', () => {
    expect(mapHifiApiArtist({ id: 5, name: 'Solo' })?.picture).toBeNull();
  });
});

describe('mapHifiApiAlbum', () => {
  it('resolves the cover uuid and artist ref', () => {
    const album = mapHifiApiAlbum({
      id: 328631591,
      title: 'Random Access Memories',
      cover: '3ca5a58c-5ce7-4343-a8cd-dca24fcba071',
      artist: { id: 8847, name: 'Daft Punk' },
      releaseDate: '2013-05-20',
      numberOfTracks: 13,
      explicit: false,
    });
    expect(album).toMatchObject({
      id: '328631591',
      artist: 'Daft Punk',
      artistId: '8847',
      releaseDate: '2013-05-20',
      numberOfTracks: 13,
      cover: tidalCoverUrl('3ca5a58c-5ce7-4343-a8cd-dca24fcba071'),
    });
  });
});

describe('mapAlbumWithTracks', () => {
  it('reads the { data: { items } } album envelope with wrapped tracks', () => {
    const result = mapAlbumWithTracks({
      version: '2.10',
      data: {
        id: 1,
        title: 'Album',
        cover: 'a-b',
        artist: { id: 2, name: 'Artist' },
        items: [
          { item: { id: 10, title: 'One', duration: 100, artist: { name: 'Artist' } }, type: 'TRACK' },
        ],
      },
    });
    expect(result?.tracks).toHaveLength(1);
    expect(result?.tracks[0].title).toBe('One');
  });

  it('returns null when the album itself is missing', () => {
    expect(mapAlbumWithTracks({ version: '2.10' })).toBeNull();
    expect(mapAlbumWithTracks(null)).toBeNull();
  });
});

describe('readSearchBucket', () => {
  const searchResponse = {
    version: '2.10',
    data: {
      tracks: { items: [{ id: 1, title: 'T' }] },
      artists: { items: [{ id: 2, name: 'A' }] },
      albums: { items: [{ id: 3, title: 'Al' }] },
    },
  };

  it('reads each nested search bucket', () => {
    expect(readSearchBucket(searchResponse, 'tracks')).toHaveLength(1);
    expect(readSearchBucket(searchResponse, 'artists')).toHaveLength(1);
    expect(readSearchBucket(searchResponse, 'albums')).toHaveLength(1);
  });

  it('returns empty for a missing bucket', () => {
    expect(readSearchBucket(searchResponse, 'playlists')).toEqual([]);
    expect(readSearchBucket(undefined, 'tracks')).toEqual([]);
  });

  it('is the reason the old search returned nothing: items are under data', () => {
    expect((searchResponse as { items?: unknown }).items).toBeUndefined();
  });
});

describe('readArtistAlbums / readArtistTracks', () => {
  const modeB = {
    version: '2.10',
    albums: { items: [{ id: 1, title: 'Album' }] },
    tracks: [{ id: 2, title: 'Track', duration: 200 }],
  };

  it('reads the Mode B shapes', () => {
    expect(readArtistAlbums(modeB)).toHaveLength(1);
    expect(readArtistTracks(modeB)).toHaveLength(1);
  });

  it('returns empty for the other artist mode', () => {
    expect(readArtistAlbums({ artist: {} })).toEqual([]);
    expect(readArtistTracks({ artist: {} })).toEqual([]);
  });
});
