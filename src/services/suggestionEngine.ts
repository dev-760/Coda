import { Track } from '../providers/types';
import { useLibraryStore } from '../store/libraryStore';
import { useListeningStore } from '../store/listeningStore';
import { useDownloadStore } from '../downloads/downloadStore';
import {
  API_CANDIDATE_TTL_MS,
  MAX_CACHED_API_CANDIDATES,
  MAX_SAME_ARTIST_IN_A_ROW,
  MAX_TRACKS_PER_ARTIST_IN_POOL,
  SUGGESTION_WEIGHTS,
} from './suggestionWeights';
import { getActiveProvider } from '../providers/registry';
import { getTrackRecommendations } from './catalogService';
import * as Network from 'expo-network';

export interface Suggestion {
  track: Track;
  score: number;
  /** A sentence the user can verify, never a fabricated statistic. */
  reason: string;
}

interface CacheEntry {
  tracks: Track[];
  expiresAt: number;
}

/** API candidates go stale, so they are re-fetched rather than refetched per screen. */
const apiCandidateCache = new Map<string, CacheEntry>();

function cacheKeyFor(track: Track | null): string {
  return track ? `similar_${track.id}` : 'discover';
}

function readCache(key: string): Track[] | null {
  const entry = apiCandidateCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    apiCandidateCache.delete(key);
    return null;
  }
  return entry.tracks;
}

function writeCache(key: string, tracks: Track[]): void {
  if (apiCandidateCache.size >= MAX_CACHED_API_CANDIDATES) {
    const oldest = apiCandidateCache.keys().next().value;
    if (oldest) apiCandidateCache.delete(oldest);
  }
  apiCandidateCache.set(key, { tracks, expiresAt: Date.now() + API_CANDIDATE_TTL_MS });
}

export function clearSuggestionCache(): void {
  apiCandidateCache.clear();
}

async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isInternetReachable !== false;
  } catch {
    // If connectivity cannot be determined, allow the network attempt and let
    // the request itself fail rather than blocking on an error.
    return true;
  }
}

/** Everything always available: favorites, playlists, and downloaded tracks. */
function localCandidates(): Track[] {
  const library = useLibraryStore.getState();
  const candidates = new Map<string, Track>();

  for (const track of library.favorites) candidates.set(track.id, track);
  for (const playlist of library.playlists) {
    for (const track of playlist.tracks) candidates.set(track.id, track);
  }
  for (const item of useDownloadStore.getState().downloads) {
    if (item.status === 'completed' && item.track) {
      candidates.set(item.track.id, item.track);
    }
  }

  return [...candidates.values()];
}

/** Recently played tracks, newest first, that still carry streamable metadata. */
function recentCandidates(limit: number): Track[] {
  return useLibraryStore
    .getState()
    .recentlyPlayed.slice(0, limit)
    .filter((track) => Boolean(track?.id));
}

/**
 * Artists the user has actually spent time with, most recent first. These are
 * the queries that give the discovery pool something real to search on.
 */
function affinityArtists(limit: number): string[] {
  const now = Date.now();
  const scores = new Map<string, number>();

  for (const entry of Object.values(useListeningStore.getState().stats)) {
    if (!entry.artist || entry.completedPlays <= 0) continue;
    const ageDays = (now - entry.lastPlayedAt) / 86_400_000;
    const multiplier = Math.max(
      SUGGESTION_WEIGHTS.minRecencyMultiplier,
      Math.pow(0.5, ageDays / SUGGESTION_WEIGHTS.recencyHalfLifeDays),
    );
    scores.set(
      entry.artist,
      (scores.get(entry.artist) ?? 0) + entry.completedPlays * multiplier,
    );
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([artist]) => artist);
}

async function apiCandidates(seed: Track | null, limit: number): Promise<Track[]> {
  if (!(await isOnline())) return [];

  const key = cacheKeyFor(seed);
  const cached = readCache(key);
  if (cached) return cached.slice(0, limit);

  try {
    const provider = getActiveProvider();
    // An empty search term returns nothing, so a seedless pool has to be built
    // from real queries: similar tracks for recently played ones, and a search
    // for the artists the user actually completes.
    const requests: Promise<Track[]>[] = [];

    if (seed) {
      requests.push(
        provider.search(`${seed.title} ${seed.artist}`),
        getTrackRecommendations(seed.id, 20),
      );
    } else {
      for (const recent of recentCandidates(SUGGESTION_WEIGHTS.maxSimilarSeeds)) {
        requests.push(getTrackRecommendations(recent.id, 20));
      }
      for (const artist of affinityArtists(SUGGESTION_WEIGHTS.maxSeedArtists)) {
        requests.push(provider.search(artist));
      }
      const library = useLibraryStore.getState();
      if (requests.length === 0 && library.favorites.length > 0) {
        for (const fav of library.favorites.slice(0, 3)) {
          requests.push(getTrackRecommendations(fav.id, 20));
          if (fav.artist) requests.push(provider.search(fav.artist));
        }
      }
      if (requests.length === 0) {
        requests.push(
          provider.search('Electronic'),
          provider.search('Chill'),
          provider.search('Ambient'),
          provider.search('Lo-Fi'),
        );
      }
    }

    const settled = await Promise.allSettled(requests);
    const merged = new Map<string, Track>();
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      for (const track of result.value) merged.set(track.id, track);
    }

    const tracks = [...merged.values()];
    if (tracks.length > 0) writeCache(key, tracks);
    return tracks.slice(0, limit);
  } catch {
    // Offline or the API is down. The local pool still works.
    return [];
  }
}

function recencyMultiplier(lastPlayedAt: number): number {
  if (!lastPlayedAt) return 1;
  const ageDays = (Date.now() - lastPlayedAt) / 86_400_000;
  return Math.max(
    SUGGESTION_WEIGHTS.minRecencyMultiplier,
    Math.pow(0.5, ageDays / SUGGESTION_WEIGHTS.recencyHalfLifeDays),
  );
}

function scoreTrack(
  track: Track,
  recentIds: Set<string>,
  favorites: Set<string>,
  /** True when the track came from a real lookup rather than the local library. */
  discovered: boolean,
  seed?: Track | null,
): {
  score: number;
  reason: string;
} {
  const listening = useListeningStore.getState();
  const stats = listening.stats[track.id];

  const artist = listening.artistAffinity(track.artist);
  const album = track.album ? listening.albumAffinity(track.album) : { score: 0, lastPlayedAt: 0 };

  // A candidate found through a real lookup is worth showing even with no
  // direct affinity, otherwise the section only ever renders library echoes.
  // Library items keep the stricter rule: a download or a playlist entry on its
  // own is not evidence of interest, so it needs actual affinity to qualify.
  let score = discovered ? SUGGESTION_WEIGHTS.discoveryBaseline : 0;
  let reason = seed ? `Sounds like ${seed.title}` : 'New for you';

  if (favorites.has(track.id)) {
    score += SUGGESTION_WEIGHTS.favoriteBoost;
    reason = 'From your favorites';
  }

  if (artist.score > 0) {
    const contribution = artist.score * SUGGESTION_WEIGHTS.artistAffinity * recencyMultiplier(artist.lastPlayedAt);
    score += contribution;
    if (favorites.has(track.id)) {
      reason = `Because you play ${track.artist}`;
    } else {
      reason = `Because you played ${track.artist}`;
    }
  }

  if (album.score > 0) {
    score += album.score * SUGGESTION_WEIGHTS.albumAffinity * recencyMultiplier(album.lastPlayedAt);
  }

  if (seed && track.artist === seed.artist) {
    score += SUGGESTION_WEIGHTS.seedArtistBoost;
    reason = `More from ${track.artist}`;
  }

  if (stats && stats.skips > 0) {
    score -= stats.skips * SUGGESTION_WEIGHTS.skipPenalty;
  }

  if (recentIds.has(track.id)) {
    score *= SUGGESTION_WEIGHTS.recentPlayPenalty;
  }

  return { score, reason };
}

/** Keeps at most two consecutive entries from one artist. */
function applyDiversity(suggestions: Suggestion[]): Suggestion[] {
  const result: Suggestion[] = [];
  const perArtist = new Map<string, number>();

  for (const suggestion of suggestions) {
    const artist = suggestion.track.artist;
    const used = perArtist.get(artist) ?? 0;
    const lastTwo = result.slice(-2);

    if (
      used >= MAX_TRACKS_PER_ARTIST_IN_POOL ||
      lastTwo.length === MAX_SAME_ARTIST_IN_A_ROW &&
        lastTwo.every((s) => s.track.artist === artist)
    ) {
      continue;
    }
    result.push(suggestion);
    perArtist.set(artist, used + 1);
  }

  return result;
}

/**
 * Ranks candidates for the user. Offline it uses only local data, so a user
 * with no history gets an empty list rather than invented suggestions.
 */
export async function getSuggestions(
  seed: Track | null,
  limit = 20,
): Promise<Suggestion[]> {
  const listening = useListeningStore.getState();
  const library = useLibraryStore.getState();

  const favorites = new Set(library.favorites.map((track) => track.id));
  const recentIds = new Set(listening.recentTrackIds(SUGGESTION_WEIGHTS.recentPlayWindow));
  const seedId = seed?.id;

  const pool = new Map<string, Track>();
  for (const track of localCandidates()) pool.set(track.id, track);
  for (const track of recentCandidates(SUGGESTION_WEIGHTS.maxSimilarSeeds)) {
    pool.set(track.id, track);
  }

  // Provenance is tracked so a real lookup keeps its baseline even when the same
  // track is also in the library, where a bare download would not qualify.
  const discoveredIds = new Set<string>();
  for (const track of await apiCandidates(seed, limit * 4)) {
    pool.set(track.id, track);
    discoveredIds.add(track.id);
  }

  const scored: Suggestion[] = [];
  for (const track of pool.values()) {
    // Never suggest what is playing, and never repeat something just played.
    if (track.id === seedId || recentIds.has(track.id)) continue;
    const { score, reason } = scoreTrack(
      track,
      recentIds,
      favorites,
      discoveredIds.has(track.id),
      seed,
    );
    if (score <= 0) continue;
    scored.push({ track, score, reason });
  }

  scored.sort((a, b) => b.score - a.score);
  return applyDiversity(scored).slice(0, limit);
}

export function hasEnoughHistoryForSuggestions(): boolean {
  return useListeningStore.getState().hasHistory();
}
