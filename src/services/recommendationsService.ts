import { Track } from '../providers/types';
import { hifiApiClient } from '../services/hifiApiClient';
import { mapHifiApiTracks } from '../providers/mappers';

export interface RecommendationRequest {
  trackId?: string;
  artistId?: string;
  genre?: string;
  limit?: number;
}

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

interface HomeRecommendations {
  recommendedTracks: Track[];
  similarArtists: unknown[];
  similarAlbums: unknown[];
  mixes: Track[];
  topVideos: unknown[];
  aiInsights: Track[];
}

interface SearchResults {
  tracks: Track[];
  artists: unknown[];
  albums: unknown[];
  playlists: unknown[];
}

const CACHE_LIMIT = 50;

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
    const cacheKey = `search_${query}`;
    const cached = this.cache.get(cacheKey) as SearchResults | undefined;
    if (cached) return cached;

    try {
      const [tracks, artists, albums, playlists] = await Promise.all([
        hifiApiClient.searchTracks(query, 10).catch(() => ({ items: [] as unknown[] })),
        hifiApiClient.searchArtists(query, 5).catch(() => ({ items: [] as unknown[] })),
        hifiApiClient.searchAlbums(query, 5).catch(() => ({ items: [] as unknown[] })),
        hifiApiClient.searchPlaylists(query, 5).catch(() => ({ items: [] as unknown[] })),
      ]);

      const results: SearchResults = {
        tracks: mapHifiApiTracks(tracks?.items),
        artists: artists?.items ?? [],
        albums: albums?.items ?? [],
        playlists: playlists?.items ?? [],
      };

      this.setCache(cacheKey, results);
      return results;
    } catch (e) {
      console.error(e);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }

  async getHomeRecommendations(currentTrack: Track | null): Promise<HomeRecommendations> {
    const empty: HomeRecommendations = {
      recommendedTracks: [],
      similarArtists: [],
      similarAlbums: [],
      mixes: [],
      topVideos: [],
      aiInsights: [],
    };

    if (!currentTrack) {
      // Recommendations are track-derived; with no listening context there is
      // nothing real to show (previously this fetched a hardcoded demo track).
      return empty;
    }

    const cacheKey = `home_${currentTrack.id}`;
    const cached = this.cache.get(cacheKey) as HomeRecommendations | undefined;
    if (cached) return cached;

    try {
      const aiRecs = await hifiApiClient.getRecommendations(currentTrack.id);
      const topVideos = await hifiApiClient
        .getTopVideos('US', 'en_US', 'BROWSER', 5, 0)
        .catch(() => ({ items: [] as unknown[] }));

      const recommendedTracks = mapHifiApiTracks(aiRecs?.items);

      const results: HomeRecommendations = {
        recommendedTracks: recommendedTracks.slice(0, 10),
        // Similar albums/artists need an album/artist ID, which Track does not
        // carry. Left empty instead of faked with a hardcoded ID - wire a
        // provider lookup through before enabling these shelves.
        similarArtists: [],
        similarAlbums: [],
        mixes: recommendedTracks.slice(10, 20),
        topVideos: topVideos?.items ?? [],
        aiInsights: recommendedTracks,
      };

      this.setCache(cacheKey, results);
      return results;
    } catch (e) {
      console.error('Failed to get home recommendations', e);
      return empty;
    }
  }

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    try {
      if (!request.trackId) {
        return { tracks: [], sources: [] };
      }
      const response = await hifiApiClient.getRecommendations(request.trackId);
      return {
        tracks: mapHifiApiTracks(response?.items),
        sources: [
          {
            id: 'hifi-api',
            name: 'Hifi Recommendations',
            type: 'similar',
            reason: 'Because you listened to this track',
          },
        ],
      };
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      return { tracks: [], sources: [] };
    }
  }

  async getSimilarTracks(trackId: string, limit = 10): Promise<Track[]> {
    const response = await this.getRecommendations({ trackId, limit });
    return response.tracks;
  }

  async getArtistRecommendations(artistId: string | number): Promise<unknown[]> {
    try {
      const similarArtists = await hifiApiClient.getSimilarArtists(artistId);
      return similarArtists?.items ?? [];
    } catch (error) {
      console.error('Failed to get artist recommendations:', error);
      return [];
    }
  }

  async getAlbumRecommendations(albumId: string | number): Promise<unknown[]> {
    try {
      const similarAlbums = await hifiApiClient.getSimilarAlbums(albumId);
      return similarAlbums?.items ?? [];
    } catch (error) {
      console.error('Failed to get album recommendations:', error);
      return [];
    }
  }

  async getMixRecommendations(mixId: string): Promise<Track[]> {
    try {
      const mix = await hifiApiClient.getMix(mixId);
      return mapHifiApiTracks(mix?.items);
    } catch (error) {
      console.error('Failed to get mix recommendations:', error);
      return [];
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const recommendationsService = new RecommendationsService();
