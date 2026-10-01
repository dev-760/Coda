import { hifiApiClient } from './hifiApiClient';
import { Track } from '../providers/types';
import { CatalogAlbum, CatalogArtist, CatalogTrackList } from '../providers/catalogTypes';
import {
  mapAlbumWithTracks,
  mapHifiApiAlbums,
  mapHifiApiArtist,
  mapHifiApiArtists,
  mapHifiApiTracks,
  readArtistAlbums,
  readArtistTracks,
  readSearchBucket,
} from '../providers/mappers';

/**
 * Catalog reads for artists, albums and multi-kind search.
 *
 * Every method here resolves the API's inconsistent envelopes (see mappers.ts)
 * and returns domain types. Screens call this instead of touching the raw
 * client, so a change in envelope shape stays contained.
 *
 * A failed lookup returns null or an empty array rather than throwing, because
 * every caller needs to render an empty state rather than an error boundary.
 */

const CACHE_LIMIT = 60;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function readCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function writeCache(key: string, value: unknown): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCatalogCache(): void {
  cache.clear();
}

export interface CatalogSearchResults {
  tracks: Track[];
  artists: CatalogArtist[];
  albums: CatalogAlbum[];
}

/**
 * Searches one kind. The API returns the same envelope for every kind, so the
 * kind is selected rather than fetched separately.
 */
async function searchKind(
  query: string,
  kind: 'tracks' | 'artists' | 'albums' | 'playlists',
  limit: number,
): Promise<unknown[]> {
  const key = `search_${kind}_${query}_${limit}`;
  const cached = readCache<unknown[]>(key);
  if (cached) return cached;

  const raw = kind === 'tracks'
    ? await hifiApiClient.searchTracks(query, limit, 0)
    : kind === 'artists'
      ? await hifiApiClient.searchArtists(query, limit)
      : kind === 'albums'
        ? await hifiApiClient.searchAlbums(query, limit)
        : await hifiApiClient.searchPlaylists(query, limit);

  const items = readSearchBucket(raw, kind);
  writeCache(key, items);
  return items;
}

/** Searches tracks, artists and albums in parallel. Never throws. */
export async function searchCatalog(query: string, limit = 20): Promise<CatalogSearchResults> {
  const term = query.trim();
  if (!term) return { tracks: [], artists: [], albums: [] };

  const [tracksRaw, artistsRaw, albumsRaw] = await Promise.all([
    searchKind(term, 'tracks', limit).catch(() => []),
    searchKind(term, 'artists', limit).catch(() => []),
    searchKind(term, 'albums', limit).catch(() => []),
  ]);

  return {
    tracks: mapHifiApiTracks(tracksRaw),
    artists: mapHifiApiArtists(artistsRaw),
    albums: mapHifiApiAlbums(albumsRaw),
  };
}

export async function getArtist(artistId: string): Promise<CatalogArtist | null> {
  if (!artistId) return null;
  const key = `artist_${artistId}`;
  const cached = readCache<CatalogArtist | null>(key);
  if (cached) return cached;

  try {
    const raw = await hifiApiClient.getArtist(artistId);
    const artist = mapHifiApiArtist(raw);
    writeCache(key, artist);
    return artist;
  } catch {
    return null;
  }
}

/**
 * Recovers an artist from the raw `/artist/?f=` payload. Its track entries carry
 * a full `artists[]` array (with id, name and picture) that the flattened Track
 * type discards, so the credit is read from the raw shape.
 */
function artistFromTracks(raw: unknown): CatalogArtist | null {
  const first = readArtistTracks(raw)[0];
  if (!first || typeof first !== 'object') return null;
  const artists = (first as { artists?: unknown }).artists;
  if (!Array.isArray(artists) || artists.length === 0) return null;
  return mapHifiApiArtist(artists[0]);
}

/**
 * Fetches an artist's albums and top tracks.
 *
 * `/artist/?f=` is the only endpoint that returns both, and it is slow upstream
 * (it gathers far more metadata than `/artist/?id=`), so the artist is
 * requested once and cached rather than called per screen.
 *
 * `skip_tracks` is deliberately not set: the track list is the point of this
 * call, and asking the API to skip it would empty the only source we have.
 */
export async function getArtistCatalog(
  artistId: string,
): Promise<{ artist: CatalogArtist | null; albums: CatalogAlbum[]; tracks: Track[] }> {
  if (!artistId) return { artist: null, albums: [], tracks: [] };

  const key = `artistFull_${artistId}`;
  const cached = readCache<{ artist: CatalogArtist | null; albums: CatalogAlbum[]; tracks: Track[] }>(key);
  if (cached) return cached;

  try {
    const raw = await hifiApiClient.getArtist(Number(artistId), Number(artistId), false);
    const tracks = mapHifiApiTracks(readArtistTracks(raw));

    // Mode B (`?f=`) returns only { albums, tracks } with no artist object, so
    // the artist is recovered from the first track's credited artist. That
    // avoids a second, slow request just for the name and portrait.
    const direct = mapHifiApiArtist(raw);
    const artist = direct ?? artistFromTracks(raw) ?? { id: artistId, name: 'Unknown Artist', picture: null, mixId: null, popularity: 0 };

    const result = {
      artist,
      albums: mapHifiApiAlbums(readArtistAlbums(raw)),
      tracks,
    };
    writeCache(key, result);
    return result;
  } catch {
    return { artist: null, albums: [], tracks: [] };
  }
}

/** Fetches an album and its track list. Null when the album cannot be read. */
export async function getAlbum(albumId: string): Promise<CatalogTrackList | null> {
  if (!albumId) return null;
  const key = `album_${albumId}`;
  const cached = readCache<CatalogTrackList | null>(key);
  if (cached) return cached;

  try {
    const raw = await hifiApiClient.getAlbum(albumId, 200, 0);
    const album = mapAlbumWithTracks(raw);
    writeCache(key, album);
    return album;
  } catch {
    return null;
  }
}

/** Fetches tracks similar to a seed track. Never throws. */
export async function getTrackRecommendations(trackId: string, limit = 20): Promise<Track[]> {
  if (!trackId) return [];
  const key = `recs_${trackId}_${limit}`;
  const cached = readCache<Track[]>(key);
  if (cached) return cached;

  try {
    const raw = await hifiApiClient.getRecommendations(trackId);
    const data = (raw as { data?: { items?: unknown } })?.data;
    const tracks = mapHifiApiTracks(data?.items);
    writeCache(key, tracks);
    return tracks;
  } catch {
    return [];
  }
}
