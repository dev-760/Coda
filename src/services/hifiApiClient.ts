import { HIFI_API_CONFIG, AudioQuality, VideoQuality } from '../config/hifiApi';

/**
 * Carries the API's FastAPI `detail` text through to the UI, so a failure says
 * why (unknown track, unsupported quality, downloads disabled) instead of just
 * a status number.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const PLAYBACK_POLL_INITIAL_DELAY_MS = 1000;
const PLAYBACK_POLL_MAX_DELAY_MS = 10_000;
const PLAYBACK_POLL_TIMEOUT_MS = 90_000;

/** How long the queue may hold a request before the caller gives up. */
const QUEUED_PLAYBACK_BUDGET_MS = 110_000;

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
    let deadline = Date.now() + this.timeout;

    const abortAtDeadline = () => controller.abort();
    const timeoutId = setTimeout(abortAtDeadline, this.timeout);

    // An external signal must cancel the request too, otherwise a caller that
    // unmounts mid-request leaves it running to the timeout.
    const externalAbort = () => controller.abort();
    abortSignal?.addEventListener('abort', externalAbort);
    const signal = controller.signal;

    const armDeadline = () => {
      clearTimeout(timeoutId);
      const remaining = deadline - Date.now();
      // A non-positive remaining time aborts immediately, which is the correct
      // outcome once the queue budget is spent.
      setTimeout(abortAtDeadline, Math.max(0, remaining));
    };

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

      // The API queues playback requests and answers 202 until ready. Waiting
      // for a queue slot can outlast the normal request timeout, so the
      // deadline is pushed out for the duration of the polling.
      if (response.status === 202) {
        const requestId = await this.readRequestIdWithBody(response);
        if (!requestId) {
          throw new ApiError('The API queued this request but did not say how to track it.');
        }

        deadline = Date.now() + QUEUED_PLAYBACK_BUDGET_MS;
        armDeadline();

        response = await this.pollPlaybackRequest(requestId, signal);
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.toApiError(response);
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
   * Reads the job id off a 202. The API documents `requestId` in the body and
   * `X-Playback-Request-Id` in the headers, with a `request_id` body field on
   * older builds, so all three are accepted.
   */
  private readRequestId(response: Response): string | undefined {
    const header = response.headers.get('X-Playback-Request-Id');
    if (header) return header;
    return undefined;
  }

  private async readRequestIdWithBody(response: Response): Promise<string | undefined> {
    const fromHeader = this.readRequestId(response);
    if (fromHeader) return fromHeader;

    const location = response.headers.get('Location');
    if (location) {
      const match = location.match(/requests\/([^/?#]+)/);
      if (match) return match[1];
    }

    // The body is single-use, so it is cloned before being peeked at.
    try {
      const body = (await response.clone().json()) as Record<string, unknown> | null;
      const id = body?.requestId ?? body?.request_id;
      if (typeof id === 'string' && id) return id;
      if (typeof body?.statusUrl === 'string') {
        const match = body.statusUrl.match(/requests\/([^/?#]+)/);
        if (match) return match[1];
      }
    } catch {
      // A 202 with an unparseable body is reported by the caller.
    }
    return undefined;
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
    let delay = PLAYBACK_POLL_INITIAL_DELAY_MS;

    while (Date.now() < deadline) {
      const wait = Math.min(delay, Math.max(0, deadline - Date.now()));
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }

      const pollRes = await fetch(`${this.baseURL}/playback/requests/${requestId}`, {
        signal,
        headers: { ...HIFI_API_CONFIG.headers },
      });

      if (pollRes.status === 200) return pollRes;
      if (pollRes.status === 202) {
        const retryAfter = Number(pollRes.headers.get('Retry-After'));
        delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, PLAYBACK_POLL_MAX_DELAY_MS)
          : Math.min(delay * 2, PLAYBACK_POLL_MAX_DELAY_MS);
        continue;
      }

      throw await this.toApiError(pollRes);
    }

    throw new ApiError('Playback request timed out. Try again in a moment.');
  }

  /**
   * Builds an error carrying the API's FastAPI `detail` message, which is the
   * only place the real cause (bad quality, unknown track, disabled downloads)
   * is stated.
   */
  private async toApiError(response: Response): Promise<ApiError> {
    let detail = '';
    try {
      const body = (await response.json()) as { detail?: unknown } | null;
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      // Non-JSON error bodies fall back to the status line.
    }
    const suffix = detail ? `: ${detail}` : '';
    return new ApiError(`Request failed (${response.status})${suffix}`, response.status);
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

  async searchArtists(query: string, limit = 25, offset = 0, abortSignal?: AbortSignal): Promise<any> {
    return this.get('/search/', { a: query, limit: limit.toString(), offset: offset.toString() }, abortSignal);
  }

  async searchAlbums(query: string, limit = 25, offset = 0, abortSignal?: AbortSignal): Promise<any> {
    return this.get('/search/', { al: query, limit: limit.toString(), offset: offset.toString() }, abortSignal);
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