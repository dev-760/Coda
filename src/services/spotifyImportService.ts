import { searchCatalog } from './catalogService';
import { Track } from '../providers/types';
import { logger } from '../logging/Logger';

export interface SpotifyTrackInfo {
  title: string;
  artist: string;
  durationMs?: number;
}

export interface SpotifyPlaylistData {
  title: string;
  description?: string;
  coverUrl?: string;
  tracks: SpotifyTrackInfo[];
}

export interface ImportProgress {
  total: number;
  processed: number;
  matched: number;
  currentTrackName?: string;
}

export interface ImportResult {
  title: string;
  coverUrl?: string;
  matchedTracks: Track[];
  unmatchedTracks: SpotifyTrackInfo[];
}

/**
 * Extracts the Spotify entity type and ID from standard, embed, or mobile URLs.
 * e.g., https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
 */
export function parseSpotifyUrl(url: string): { type: 'playlist' | 'album' | 'track'; id: string } | null {
  const trimmed = url.trim();
  const match = trimmed.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/i);
  if (!match) return null;
  return {
    type: match[1].toLowerCase() as 'playlist' | 'album' | 'track',
    id: match[2],
  };
}

/**
 * Normalizes string for fuzzy comparison (removes punctuation, lowercase).
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches public Spotify playlist metadata and track listing using Spotify's public embed page.
 * Requires no authentication tokens or API keys.
 */
export async function fetchSpotifyPlaylist(url: string): Promise<SpotifyPlaylistData> {
  const parsed = parseSpotifyUrl(url);
  if (!parsed) {
    throw new Error('Invalid Spotify link. Please paste a valid open.spotify.com playlist URL.');
  }

  const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;

  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load Spotify playlist (HTTP ${response.status}). Make sure the playlist is public.`);
  }

  const html = await response.text();

  // Extract __NEXT_DATA__ JSON embedded script
  const startTag = '<script id="__NEXT_DATA__" type="application/json">';
  const endTag = '</script>';
  const startIndex = html.indexOf(startTag);

  if (startIndex === -1) {
    throw new Error('Could not parse Spotify playlist data. Spotify page structure may have changed.');
  }

  const jsonStart = startIndex + startTag.length;
  const jsonEnd = html.indexOf(endTag, jsonStart);
  if (jsonEnd === -1) {
    throw new Error('Malformed Spotify embed payload.');
  }

  const jsonStr = html.substring(jsonStart, jsonEnd);
  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to deserialize Spotify playlist JSON.');
  }

  const entity = data?.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error('No playlist information found at this link. Please verify the URL.');
  }

  const title = entity.title || 'Imported Spotify Playlist';
  const description = entity.subtitle || entity.description || '';
  const coverUrl = entity.visualIdentity?.image?.[1]?.url || entity.visualIdentity?.image?.[0]?.url;

  const rawTracks = entity.trackList || [];
  const tracks: SpotifyTrackInfo[] = rawTracks.map((t: any) => ({
    title: t.title || '',
    artist: t.subtitle || '',
    durationMs: t.duration || 0,
  })).filter((t: SpotifyTrackInfo) => t.title.length > 0);

  return {
    title,
    description,
    coverUrl,
    tracks,
  };
}

/**
 * Searches and matches Spotify track items against Coda's HiFi music catalog.
 */
export async function matchSpotifyTracks(
  tracks: SpotifyTrackInfo[],
  onProgress?: (progress: ImportProgress) => void,
  abortSignal?: AbortSignal,
): Promise<{ matchedTracks: Track[]; unmatchedTracks: SpotifyTrackInfo[] }> {
  const matchedTracks: Track[] = [];
  const unmatchedTracks: SpotifyTrackInfo[] = [];

  const seenTrackIds = new Set<string>();

  for (let i = 0; i < tracks.length; i++) {
    if (abortSignal?.aborted) break;

    const spotifyTrack = tracks[i];
    onProgress?.({
      total: tracks.length,
      processed: i,
      matched: matchedTracks.length,
      currentTrackName: `${spotifyTrack.title} - ${spotifyTrack.artist}`,
    });

    try {
      // Query catalog with title and primary artist
      const query = `${spotifyTrack.title} ${spotifyTrack.artist}`;
      const results = await searchCatalog(query, 5, abortSignal);

      if (results.tracks && results.tracks.length > 0) {
        // Find best match by comparing normalized title
        const normTitle = normalizeString(spotifyTrack.title);
        const normArtist = normalizeString(spotifyTrack.artist);

        let bestMatch: Track = results.tracks[0];

        // Find exact or closest match if available
        for (const candidate of results.tracks) {
          const candidateTitle = normalizeString(candidate.title);
          const candidateArtist = normalizeString(candidate.artist);

          if (candidateTitle === normTitle || candidateTitle.includes(normTitle)) {
            bestMatch = candidate;
            if (candidateArtist.includes(normArtist) || normArtist.includes(candidateArtist)) {
              break;
            }
          }
        }

        if (!seenTrackIds.has(bestMatch.id)) {
          seenTrackIds.add(bestMatch.id);
          matchedTracks.push(bestMatch);
        }
      } else {
        unmatchedTracks.push(spotifyTrack);
      }
    } catch (err) {
      logger.warn('SpotifyImportService', `Failed to match track: ${spotifyTrack.title}`, err);
      unmatchedTracks.push(spotifyTrack);
    }
  }

  onProgress?.({
    total: tracks.length,
    processed: tracks.length,
    matched: matchedTracks.length,
  });

  return { matchedTracks, unmatchedTracks };
}
