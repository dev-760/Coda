import { z } from 'zod';
import { Track } from './types';

/**
 * Shared mapping from raw Hifi API track payloads to the app's Track type.
 * Single source of truth — replaces the three inline copies that previously
 * existed in recommendationsService, queueStore and the web client.
 */

const HifiTrackSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  artist: z
    .union([z.string(), z.object({ name: z.string() }).passthrough()])
    .optional(),
  album: z
    .union([
      z.string(),
      z.object({ title: z.string().optional(), cover: z.string().optional() }).passthrough(),
    ])
    .optional(),
  coverUrl: z.string().optional(),
  duration: z.number().optional(),
});

export function tidalCoverUrl(coverId: string, size = '320x320'): string {
  return `https://resources.tidal.com/images/${coverId.replace(/-/g, '/')}/${size}.jpg`;
}

/**
 * Maps a raw Hifi API track payload (or a wrapped `{ item: ... }` payload)
 * to a Track. Returns null when the payload lacks the minimum viable fields,
 * so callers can filter instead of propagating garbage tracks.
 */
export function mapHifiApiTrack(raw: unknown): Track | null {
  let candidate: unknown = raw;
  if (candidate && typeof candidate === 'object' && 'item' in candidate) {
    candidate = (candidate as { item: unknown }).item;
  }

  const parsed = HifiTrackSchema.safeParse(candidate);
  if (!parsed.success) return null;

  const t = parsed.data;
  const artist =
    typeof t.artist === 'string' ? t.artist : t.artist?.name ?? 'Unknown Artist';
  const albumTitle = typeof t.album === 'string' ? t.album : t.album?.title;
  const coverId = typeof t.album === 'object' ? t.album.cover : undefined;

  return {
    id: String(t.id),
    title: t.title,
    artist,
    album: albumTitle,
    coverUrl: coverId ? tidalCoverUrl(coverId) : t.coverUrl,
    durationMs: t.duration ? t.duration * 1000 : 0,
  };
}

/** Maps a list of raw payloads, dropping unparseable entries. */
export function mapHifiApiTracks(rawItems: unknown): Track[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map(mapHifiApiTrack)
    .filter((track): track is Track => track !== null);
}
