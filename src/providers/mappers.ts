import { z } from 'zod';
import { Track } from './types';
import { CatalogAlbum, CatalogArtist, CatalogTrackList } from './catalogTypes';

/**
 * Mapping from raw Hifi API payloads to the app domain types.
 *
 * The upstream service is inconsistent about envelopes. Verified shapes:
 *   /info/, /album/, /search/, /recommendations/  -> { version, data }
 *   /artist/?id=                                 -> { version, artist, cover }
 *   /artist/?f=                                  -> { version, albums, tracks }
 *   /cover/                                      -> { version, covers }
 *
 * Search nests results by kind under data (artists/albums/playlists/tracks/
 * videos/genres/topHits), and list entries come as bare objects, `{ item }`
 * (album tracks) or `{ track }` (recommendations). Every mapper below reads
 * defensively instead of assuming a single path.
 */

/**
 * A referenced artist. `id` is optional because credits on some track payloads
 * carry only a name; requiring it would reject an otherwise valid track.
 */
const ArtistRefSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string(),
  })
  .passthrough();

/** A referenced album. As with artists, `id` may be absent. */
const AlbumRefSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string(),
    cover: z.string().optional(),
  })
  .passthrough();

const HifiTrackSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  artist: z.union([z.string(), ArtistRefSchema]).optional(),
  artists: z.array(ArtistRefSchema).optional(),
  album: z.union([z.string(), AlbumRefSchema]).optional(),
  coverUrl: z.string().optional(),
  duration: z.number().optional(),
});

export function tidalCoverUrl(coverId: string, size = '320x320'): string {
  return `https://resources.tidal.com/images/${coverId.replace(/-/g, '/')}/${size}.jpg`;
}

/**
 * Retargets an already-resolved cover URL to another CDN size.
 *
 * The API hands back one size per cover, but the same URL is reused for list
 * thumbnails and full-bleed artwork. Asking the CDN for the size actually being
 * drawn avoids downloading a 320px image to fill a 48px row. Non-Tidal and
 * already-correct URLs are returned untouched.
 */
export function withCoverSize(url: string | null | undefined, size: string): string | null {
  if (!url) return null;
  if (!url.includes('resources.tidal.com/images/')) return url;
  return url.replace(/\/\d+x\d+\.jpg$/, `/${size}.jpg`);
}

/**
 * Unwraps the several list entry shapes the API mixes: bare objects,
 * `{ item }` (album tracks) and `{ track }` (recommendations).
 */
function unwrapEntry(candidate: unknown): unknown {
  let current = candidate;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== 'object') return current;
    const obj = current as Record<string, unknown>;
    if (obj.item && typeof obj.item === 'object') {
      current = obj.item;
      continue;
    }
    if (obj.track && typeof obj.track === 'object') {
      current = obj.track;
      continue;
    }
    return current;
  }
  return current;
}

function resolveCover(parsed: z.infer<typeof HifiTrackSchema>): string | undefined {
  if (parsed.coverUrl) return parsed.coverUrl;
  const { album } = parsed;
  if (album && typeof album === 'object' && album.cover) {
    return tidalCoverUrl(album.cover);
  }
  return undefined;
}

function resolveArtist(parsed: z.infer<typeof HifiTrackSchema>): string {
  const { artist } = parsed;
  if (typeof artist === 'string' && artist) return artist;
  if (artist && typeof artist === 'object' && typeof artist.name === 'string' && artist.name) {
    return artist.name;
  }
  const first = parsed.artists?.[0];
  if (first?.name) return first.name;
  return 'Unknown Artist';
}

export function mapHifiApiTrack(raw: unknown): Track | null {
  const parsed = HifiTrackSchema.safeParse(unwrapEntry(raw));
  if (!parsed.success) return null;

  const t = parsed.data;
  const { album } = t;
  return {
    id: String(t.id),
    title: t.title,
    artist: resolveArtist(t),
    album: typeof album === 'string' ? album : album?.title,
    coverUrl: resolveCover(t),
    durationMs: t.duration ? t.duration * 1000 : 0,
  };
}

export function mapHifiApiTracks(rawItems: unknown): Track[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map(mapHifiApiTrack)
    .filter((track): track is Track => track !== null);
}

/**
 * Maps an artist payload. `picture` is a bare uuid upstream, not a URL, so it
 * is resolved here rather than handed to an <Image> directly.
 */
export function mapHifiApiArtist(raw: unknown): CatalogArtist | null {
  const hasEnvelope =
    raw && typeof raw === 'object' && 'artist' in raw && (raw as { artist: unknown }).artist;
  const candidate = hasEnvelope ? (raw as { artist: unknown }).artist : raw;

  const parsed = ArtistRefSchema.extend({ picture: z.string().optional() }).safeParse(candidate);
  if (!parsed.success || parsed.data.id == null) return null;

  const a = parsed.data;
  const mixes = (candidate as { mixes?: Record<string, string> })?.mixes;
  const popularity = (candidate as { popularity?: number })?.popularity ?? 0;

  return {
    id: String(a.id),
    name: a.name,
    picture: a.picture ? tidalCoverUrl(a.picture) : null,
    mixId: mixes?.ARTIST_MIX ?? null,
    popularity,
  };
}

export function mapHifiApiArtists(rawItems: unknown): CatalogArtist[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map(mapHifiApiArtist)
    .filter((artist): artist is CatalogArtist => artist !== null);
}

/** Maps an album payload. `cover` is a bare uuid upstream. */
export function mapHifiApiAlbum(raw: unknown): CatalogAlbum | null {
  // Not unwrapped: an album entry is a bare object, and unwrapping would look
  // for item/track keys that a top-level album record never has.
  const parsed = AlbumRefSchema.extend({
    artist: z.union([z.string(), ArtistRefSchema]).nullish(),
    artists: z.array(ArtistRefSchema).optional(),
    releaseDate: z.string().nullish(),
    numberOfTracks: z.number().optional(),
    type: z.string().optional(),
    explicit: z.boolean().optional(),
  }).safeParse(raw);
  if (!parsed.success || parsed.data.id == null) return null;

  const a = parsed.data;
  const credit =
    a.artist ?? a.artists?.find((entry) => entry.id != null) ?? a.artists?.[0];
  const artistName =
    typeof credit === 'string' ? credit : credit?.name ?? 'Unknown Artist';
  const artistId =
    credit && typeof credit === 'object' && credit.id != null ? String(credit.id) : null;

  return {
    id: String(a.id),
    title: a.title,
    artist: artistName,
    artistId,
    cover: a.cover ? tidalCoverUrl(a.cover) : null,
    releaseDate: a.releaseDate ?? null,
    numberOfTracks: a.numberOfTracks ?? 0,
    type: a.type ?? 'ALBUM',
    explicit: a.explicit ?? false,
  };
}

export function mapHifiApiAlbums(rawItems: unknown): CatalogAlbum[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map(mapHifiApiAlbum)
    .filter((album): album is CatalogAlbum => album !== null);
}

/**
 * Reads an album and its tracks from a `/album/` response. Returns null when the
 * album itself is missing, so callers can tell "not found" from "empty".
 */
export function mapAlbumWithTracks(raw: unknown): CatalogTrackList | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = (raw as { data?: unknown }).data;
  if (!data) return null;

  const album = mapHifiApiAlbum(data);
  if (!album) return null;

  const items = (data as { items?: unknown }).items;
  return { album, tracks: mapHifiApiTracks(items) };
}

/**
 * Reads the array out of a search response.
 *
 * `/search/?s=` is the outlier: it returns `{ data: { items } }` directly,
 * while every other kind returns `{ data: { <kind>: { items } } }`. Both are
 * checked, in that order, so the same reader works for either.
 */
export function readSearchBucket(
  raw: unknown,
  kind: 'tracks' | 'artists' | 'albums' | 'playlists' | 'videos',
): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = (raw as { data?: Record<string, unknown> }).data;
  if (!data) return [];

  const bucket = data[kind];
  if (bucket && typeof bucket === 'object') {
    const nested = (bucket as { items?: unknown }).items;
    if (Array.isArray(nested)) return nested;
  }

  // `/search/?s=` puts the array straight on data.
  if (kind === 'tracks' && Array.isArray(data.items)) return data.items;

  return [];
}

/** Reads the `{ version, albums: { items: [...] } }` shape of `/artist/?f=`. */
export function readArtistAlbums(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const albums = (raw as { albums?: { items?: unknown } }).albums;
  return Array.isArray(albums?.items) ? albums.items : [];
}

/** Reads the `{ version, tracks: [...] }` shape of `/artist/?f=` (a bare array). */
export function readArtistTracks(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const tracks = (raw as { tracks?: unknown }).tracks;
  return Array.isArray(tracks) ? tracks : [];
}
