import { CACHE_CONFIG } from '../config/cacheConfig';

/**
 * Scoring weights for the on-device suggestion engine. Each value is a
 * multiplier applied to a normalized signal, so changing one weight does not
 * require re-tuning the others.
 */
export const SUGGESTION_WEIGHTS = {
  /** Plays that ran past the skip threshold, per artist and per album. */
  artistAffinity: 3.0,
  albumAffinity: 1.5,

  /** A track the user explicitly favorited. */
  favoriteBoost: 4.0,

  /** Artists and albums that show up in the same playlists as the seed. */
  playlistCoOccurrence: 2.0,

  /**
   * Multiplier applied to affinity as a track ages. A track played a year ago
   * counts far less than one played last week.
   */
  recencyHalfLifeDays: 21,

  /** Added for each time the user skipped this track in under 30 seconds. */
  skipPenalty: 2.5,

  /** Multiplier for a track played within the very recent window. */
  recentPlayPenalty: 0.25,

  /** A track played within this many entries gets the recent penalty. */
  recentPlayWindow: 10,

  /** Hard floor for the recency multiplier, so old plays never reach zero. */
  minRecencyMultiplier: 0.1,

  /**
   * Baseline for a track reached through a real source (a similar-track lookup
   * or a search on an artist the user plays) but with no direct affinity of its
   * own. Without it every candidate scored 0 and was discarded, so the section
   * stayed empty however much the user played.
   */
  discoveryBaseline: 1.0,

  /** Bonus when the candidate comes from the artist of the seed track. */
  seedArtistBoost: 2.5,

  /** How many distinct artists are searched when building a discovery pool. */
  maxSeedArtists: 3,

  /** How many recent tracks are asked for similar-track recommendations. */
  maxSimilarSeeds: 3,
} as const;

export const AUTO_QUEUE_MIN_REMAINING = 3;
export const AUTO_QUEUE_FILL_COUNT = 10;
export const MAX_SAME_ARTIST_IN_A_ROW = 2;
export const MAX_TRACKS_PER_ARTIST_IN_POOL = 3;

/** Consolidated cache settings re-exported for backwards compatibility */
export const API_CANDIDATE_TTL_MS = CACHE_CONFIG.suggestionApiCandidates.ttlMs;
export const MAX_CACHED_API_CANDIDATES = CACHE_CONFIG.suggestionApiCandidates.limit;
