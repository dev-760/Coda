import { HIFI_API_CONFIG, AudioQuality, VideoQuality } from '../config/hifiApi';

const PLAYBACK_POLL_INTERVAL_MS = 2000;
const PLAYBACK_POLL_MAX_INTERVAL_MS = 10_000;
const PLAYBACK_POLL_MAX_ATTEMPTS = 15;
const PLAYBACK_POLL_TIMEOUT_MS = 90_000;

class HifiApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = HIFI_API_CONFIG.baseURL;
    this.timeout = HIFI_API_CONFIG.timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    abortSignal?: AbortSignal
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // An external signal must cancel the request too, otherwise a caller that
    // unmounts mid-request leaves it running to the timeout.
    const externalAbort = () => controller.abort();
    abortSignal?.addEventListener('abort', externalAbort);
    const signal = controller.signal;

    try {
      let response = await fetch(url, {
        ...options,
        signal,
        headers: {
          ...HIFI_API_CONFIG.headers,
          ...options.headers,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      // The API queues playback requests and answers 202 until ready.
      if (response.status === 202) {
        const queuedData = await response.json();
        const requestId = queuedData.request_id;
        if (!requestId) throw new Error('Received 202 but no request_id found.');

        response = await this.pollPlaybackRequest(requestId, signal);
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      abortSignal?.removeEventListener('abort', externalAbort);
      throw this.handleError(error);
    }
  }

  /**
   * Polls a queued playback request. Bounded on both attempt count and total
   * time, with a growing delay, so a request the API never finishes cannot
   * hang the caller forever.
   */
  private async pollPlaybackRequest(
    requestId: string,
    signal: AbortSignal,
  ): Promise<Response> {
    const deadline = Date.now() + PLAYBACK_POLL_TIMEOUT_MS;
    let attempt = 0;
    let delay = PLAYBACK_POLL_INTERVAL_MS;

    while (Date.now() < deadline && attempt < PLAYBACK_POLL_MAX_ATTEMPTS) {
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const pollRes = await fetch(`${this.baseURL}/playback/requests/${requestId}`, {
        signal,
        headers: { ...HIFI_API_CONFIG.headers },
      });

      if (pollRes.status === 200) return pollRes;
      if (pollRes.status !== 202) {
        throw new Error(`Playback request failed with status: ${pollRes.status}`);
      }

      delay = Math.min(delay * 2, PLAYBACK_POLL_MAX_INTERVAL_MS);
    }

    throw new Error('Playback request timed out. Try again in a moment.');
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error('Request timeout');
      }
      return error; // Return actual error for better debugging
    }
    return new Error('Unknown error occurred');
  }

  async get<T>(endpoint: string, params?: Record<string, string>, abortSignal?: AbortSignal): Promise<T> {
    const queryString = params 
      ? `?${new URLSearchParams(params).toString()}` 
      : '';
    return this.request<T>(`${endpoint}${queryString}`, {}, abortSignal);
  }

  async post<T>(endpoint: string, body?: unknown, abortSignal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }, abortSignal);
  }

  async delete<T>(endpoint: string, abortSignal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    }, abortSignal);
  }

  // Core / Meta
  async getRoot(): Promise<string> {
    const response = await fetch(`${this.baseURL}/`);
    return await response.text();
  }

  // Metadata & Search
  async getInfo(trackId: string | number): Promise<any> {
    return this.get('/info/', { id: trackId.toString() });
  }

  async searchTracks(query: string, limit = 25, offset = 0, abortSignal?: AbortSignal): Promise<any> {
    return this.get(
      '/search/',
      { s: query, limit: limit.toString(), offset: offset.toString() },
      abortSignal,
    );
  }

  async searchArtists(query: string, limit = 25, offset = 0): Promise<any> {
    return this.get('/search/', { a: query, limit: limit.toString(), offset: offset.toString() });
  }

  async searchAlbums(query: string, limit = 25, offset = 0): Promise<any> {
    return this.get('/search/', { al: query, limit: limit.toString(), offset: offset.toString() });
  }

  async searchVideos(query: string, limit = 25, offset = 0): Promise<any> {
    return this.get('/search/', { v: query, limit: limit.toString(), offset: offset.toString() });
  }

  async searchPlaylists(query: string, limit = 25, offset = 0): Promise<any> {
    return this.get('/search/', { p: query, limit: limit.toString(), offset: offset.toString() });
  }

  async searchByISRC(isrc: string): Promise<any> {
    return this.get('/search/', { i: isrc });
  }

  async getAlbum(albumId: string | number, limit = 100, offset = 0): Promise<any> {
    return this.get('/album/', { id: albumId.toString(), limit: limit.toString(), offset: offset.toString() });
  }

  async getSimilarAlbums(albumId: string | number, cursor?: string | number): Promise<any> {
    const params: Record<string, string> = { id: albumId.toString() };
    if (cursor) params.cursor = cursor.toString();
    return this.get('/album/similar/', params);
  }

  async getArtist(artistId: string | number, f?: number, skipTracks = false): Promise<any> {
    const params: Record<string, string> = {};
    if (f) {
      params.f = f.toString();
      params.skip_tracks = skipTracks.toString();
    } else {
      params.id = artistId.toString();
    }
    return this.get('/artist/', params);
  }

  async getSimilarArtists(artistId: string | number, cursor?: string | number): Promise<any> {
    const params: Record<string, string> = { id: artistId.toString() };
    if (cursor) params.cursor = cursor.toString();
    return this.get('/artist/similar/', params);
  }

  async getPlaylist(playlistId: string, limit = 100, offset = 0): Promise<any> {
    return this.get('/playlist/', { id: playlistId, limit: limit.toString(), offset: offset.toString() });
  }

  async getMix(mixId: string): Promise<any> {
    return this.get('/mix/', { id: mixId });
  }

  async getRecommendations(trackId: string | number): Promise<any> {
    return this.get('/recommendations/', { id: trackId.toString() });
  }

  async getCover(trackId: string | number): Promise<any> {
    return this.get('/cover/', { id: trackId.toString() });
  }

  async getCoverByQuery(query: string): Promise<any> {
    return this.get('/cover/', { q: query });
  }

  async getLyrics(trackId: string | number): Promise<any> {
    return this.get('/lyrics/', { id: trackId.toString() });
  }

  async getTopVideos(
    countryCode = 'US',
    locale = 'en_US',
    deviceType = 'BROWSER',
    limit = 25,
    offset = 0
  ): Promise<any> {
    return this.get('/topvideos/', {
      countryCode,
      locale,
      deviceType,
      limit: limit.toString(),
      offset: offset.toString()
    });
  }

  // Audio & Video Playback
  async getTrack(
    trackId: number,
    quality: AudioQuality = 'HI_RES_LOSSLESS',
    immersiveAudio = false
  ): Promise<any> {
    return this.get('/track/', {
      id: trackId.toString(),
      quality,
      immersiveaudio: immersiveAudio.toString()
    });
  }

  async getTrackManifests(
    trackId: string,
    formats?: string[],
    adaptive = 'true',
    manifestType = 'MPEG_DASH',
    uriScheme = 'HTTPS',
    usage = 'PLAYBACK'
  ): Promise<any> {
    const params: Record<string, string> = {
      id: trackId,
      adaptive,
      manifestType,
      uriScheme,
      usage
    };
    if (formats && formats.length > 0) {
      params.formats = formats.join(',');
    }
    return this.get('/trackManifests/', params);
  }

  async getVideo(
    videoId: number,
    quality: VideoQuality = 'HIGH',
    mode = 'STREAM',
    presentation = 'FULL'
  ): Promise<any> {
    return this.get('/video/', {
      id: videoId.toString(),
      quality,
      mode,
      presentation
    });
  }

  async getWidevineLicense(challenge: string): Promise<any> {
    return this.post('/widevine', { challenge });
  }

  // Async Queue Management
  async getPlaybackRequest(requestId: string): Promise<any> {
    return this.get(`/playback/requests/${requestId}`);
  }

  async cancelPlaybackRequest(requestId: string): Promise<any> {
    return this.delete(`/playback/requests/${requestId}`);
  }

  // Convenience method for multi-type search
  async searchMulti(query: string, type: 's' | 'a' | 'al' | 'v' | 'p', limit = 10): Promise<any> {
    const params: Record<string, string> = { limit: limit.toString() };
    params[type] = query;
    return this.get('/search/', params);
  }
}

export const hifiApiClient = new HifiApiClient();