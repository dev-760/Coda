/**
 * Consolidated API and catalog cache configurations.
 *
 * Centralizes cache lifetimes and limits across the catalog, recommendations,
 * and suggestion discovery services to avoid drift across domain modules.
 */

export const CACHE_CONFIG = {
  /** In-memory cache for resolved catalog items (artists, albums, search queries) */
  catalog: {
    ttlMs: 5 * 60 * 1000, // 5 minutes
    limit: 60,
  },
  /** In-memory cache for API discovery candidate tracks used in suggestions */
  suggestionApiCandidates: {
    ttlMs: 10 * 60 * 1000, // 10 minutes
    limit: 30,
  },
} as const;
