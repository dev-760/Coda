import { Track } from '../providers/types';
import { CatalogAlbum, CatalogArtist } from '../providers/catalogTypes';
import {
  getTrackRecommendations,
  searchCatalog,
} from './catalogService';
import { hifiApiClient } from './hifiApiClient';
import { mapHifiApiTracks } from '../providers/mappers';

export interface RecommendationResponse {
  tracks: Track[];
  sources: RecommendationSource[];
}

export interface RecommendationSource {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'genre' | 'similar';
  reason: string;
}

export interface SearchResults {
  tracks: Track[];
  artists: CatalogArtist[];
  albums: CatalogAlbum[];
}

interface HomeRecommendations {
  recommendedTracks: Track[];
  mixes: Track[];
}

const CACHE_LIMIT = 50;

/**
 * Thin facade over catalogService.
 *
 * It previously read `.items` off each response, but the API wraps payloads in
 * `{ version, data: { items } }`, so every list came back undefined and search
 * silently returned nothing. Envelope handling now lives in catalogService and
 * the shared mappers.
 */
export class RecommendationsService {
  private cache = new Map<string, unknown>();

  private setCache(key: string, value: unknown): void {
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }

  async searchMulti(query: string): Promise<SearchResults> {
    const term = query.trim();
    if (!term) return { tracks: [], artists: [], albums: [] };

    const cacheKey = `search_${term}`;
    const cached = this.cache.get(cacheKey) as SearchResults | undefined;
    if (cached) return cached;

    const results = await searchCatalog(term, 25);
    this.setCache(cacheKey, results);
    return results;
  }

  /**
   * Track-derived recommendations. With no playing track there is nothing real to
   * base them on, so this returns empty rather than a hardcoded demo track.
   */
  async getHomeRecommendations(currentTrack: Track | null): Promise<HomeRecommendations> {
    if (!currentTrack) return { recommendedTracks: [], mixes: [] };

    const cacheKey = `home_${currentTrack.id}`;
    const cached = this.cache.get(cacheKey) as HomeRecommendations | undefined;
    if (cached) return cached;

    const tracks = await getTrackRecommendations(currentTrack.id, 20);
    const results: HomeRecommendations = {
      recommendedTracks: tracks.slice(0, 10),
      mixes: tracks.slice(10, 20),
    };

    this.setCache(cacheKey, results);
    return results;
  }

  async getRecommendations(request: { trackId?: string }): Promise<RecommendationResponse> {
    if (!request.trackId) return { tracks: [], sources: [] };

    const tracks = await getTrackRecommendations(request.trackId, 20);
    return {
      tracks,
      sources: tracks.length
        ? [
            {
              id: 'hifi-api',
              name: 'Hifi Recommendations',
              type: 'similar',
              reason: 'Because you listened to this track',
            },
          ]
        : [],
    };
  }

  async getSimilarTracks(trackId: string, limit = 10): Promise<Track[]> {
    return getTrackRecommendations(trackId, limit);
  }

  async getMixRecommendations(mixId: string): Promise<Track[]> {
    try {
      const mix = await hifiApiClient.getMix(mixId);
      const data = (mix as { data?: { items?: unknown } })?.data;
      return mapHifiApiTracks(data?.items);
    } catch (error) {
      console.error('Failed to get mix recommendations:', error);
      return [];
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const recommendationsService = new RecommendationsService();
