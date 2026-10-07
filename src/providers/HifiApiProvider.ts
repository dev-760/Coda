import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioQuality } from '../config/hifiApi';
import { logger } from '../logging/Logger';
import { hifiApiClient } from '../services/hifiApiClient';
import { useSettingsStore } from '../store/settingsStore';
import { mapHifiApiTracks } from './mappers';
import { MusicProvider, ProviderHealth, StreamInfo, Track } from './types';

/**
 * The `data` payload of a `/track/` response. Declared here so the envelope
 * unwrap above is typed rather than an unchecked cast to `any`.
 */
interface HifiTrackPayload {
  trackId?: number;
  manifest?: string;
  manifestHash?: string;
  manifestMimeType?: string;
  audioQuality?: string;
  bitDepth?: number;
  sampleRate?: number;
}

/**
 * A failure whose message is already safe and specific enough to show the
 * user. Anything else is replaced with a generic message, so the catch in
 * `getStreamInfo` can tell "already explained" from "unexpected" by type
 * rather than by guessing at message text.
 */
class StreamResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StreamResolutionError';
  }
}

class HifiApiProvider implements MusicProvider {
  id = 'hifi-api';
  name = 'HiFi-API';
  capabilities = { search: true, stream: true, live: false };

  private getPreferredQuality(): AudioQuality {
    return useSettingsStore.getState().audio.hifiAudioQuality;
  }

  async search(query: string, abortSignal?: AbortSignal): Promise<Track[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const sanitizedQuery = query.trim().slice(0, 100);

    try {
      const response = await hifiApiClient.searchTracks(sanitizedQuery, 25, 0, abortSignal);

      // `/search/?s=` returns `{ version, data: { items } }`. Reading `items`
      // off the envelope yields undefined and search silently returns nothing.
      const data = (response?.data ?? response) as { items?: unknown };
      const rawItems = Array.isArray(data.items) ? data.items : [];
      const items = rawItems.map((i: any) => i.item ?? i);
      return mapHifiApiTracks(items);
    } catch (error) {
      logger.error('HifiApiProvider', 'Search failed', error);
      throw new Error('Search failed. Check your connection and try again.');
    }
  }

  private static readonly QUALITY_FALLBACK_ORDER: Record<AudioQuality, AudioQuality[]> = {
    LOSSLESS: ['LOSSLESS', 'HIGH', 'LOW'],
    HIGH: ['HIGH', 'LOW'],
    LOW: ['LOW'],
  };

  async getStreamInfo(trackId: string, _abortSignal?: AbortSignal): Promise<StreamInfo> {
    const numericId = parseInt(trackId, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid track ID');
    }

    const preferredQuality = this.getPreferredQuality();
    const candidateQualities = HifiApiProvider.QUALITY_FALLBACK_ORDER[preferredQuality] ?? [preferredQuality];

    let lastError: unknown = null;

    for (const quality of candidateQualities) {
      try {
        const response = await hifiApiClient.getTrack(numericId, quality, false);

        // Payloads are wrapped in { version, data }.
        const payload = (response?.data ?? response) as HifiTrackPayload;
        const { manifest, manifestMimeType, audioQuality } = payload;

        if (!manifest) {
          throw new StreamResolutionError(
            `This track is not available in the selected quality (${audioQuality ?? quality ?? 'unknown'}). Try a lower quality in Settings.`,
          );
        }

        const audioUrl = await this.extractAudioUrl(manifest, manifestMimeType);

        let format: StreamInfo['format'] = this.getFormatFromQuality(audioQuality ?? quality);
        if (manifestMimeType === 'application/dash+xml') format = 'dash';
        if (manifestMimeType === 'application/vnd.apple.mpegurl') format = 'hls';

        if (quality !== preferredQuality) {
          logger.info(
            'HifiApiProvider',
            `Quality waterfall: track ${trackId} stepped down from ${preferredQuality} to ${quality}`,
          );
        }

        return {
          url: audioUrl,
          format,
        };
      } catch (error) {
        lastError = error;

        // If it's a 422, missing manifest, or unsupported quality error, cascade down
        const isQualityMismatch =
          error instanceof StreamResolutionError ||
          (typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === 422) ||
          (error instanceof Error && (error.message.includes('422') || error.message.toLowerCase().includes('quality')));

        if (!isQualityMismatch) {
          // Hard failures (404, network error, abort) don't benefit from lower bitrates; abort cascade
          if (error instanceof StreamResolutionError) {
            logger.warn('HifiApiProvider', error.message);
            throw error;
          }
          logger.error('HifiApiProvider', 'Could not resolve stream', error);
          throw new Error('Failed to get stream info. Please try again later.');
        }

        logger.warn(
          'HifiApiProvider',
          `Quality ${quality} failed for track ${trackId}; cascading to next quality tier...`,
        );
      }
    }

    // A StreamResolutionError already carries a message worth showing;
    // anything else (network, timeout, unknown shape) stays generic.
    if (lastError instanceof StreamResolutionError) {
      logger.warn('HifiApiProvider', lastError.message);
      throw lastError;
    }
    logger.error('HifiApiProvider', 'Could not resolve stream across any quality tier', lastError);
    throw new Error('Failed to get stream info. Please try again later.');
  }

  async getHealth(): Promise<ProviderHealth> {
    try {
      await hifiApiClient.getRoot();
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'offline',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getTrackInfo(trackId: string | number): Promise<any> {
    return hifiApiClient.getInfo(trackId);
  }

  async getAlbum(albumId: string | number, limit = 100, offset = 0): Promise<any> {
    return hifiApiClient.getAlbum(albumId, limit, offset);
  }

  async getSimilarAlbums(albumId: string | number, cursor?: string | number): Promise<any> {
    return hifiApiClient.getSimilarAlbums(albumId, cursor);
  }

  async getArtist(artistId: string | number, f?: number, skipTracks = false): Promise<any> {
    return hifiApiClient.getArtist(artistId, f, skipTracks);
  }

  async getSimilarArtists(artistId: string | number, cursor?: string | number): Promise<any> {
    return hifiApiClient.getSimilarArtists(artistId, cursor);
  }

  async getPlaylist(playlistId: string, limit = 100, offset = 0): Promise<any> {
    return hifiApiClient.getPlaylist(playlistId, limit, offset);
  }

  async getMix(mixId: string): Promise<any> {
    return hifiApiClient.getMix(mixId);
  }

  async getRecommendations(trackId: string | number): Promise<any> {
    return hifiApiClient.getRecommendations(trackId);
  }

  async getCover(trackId: string | number): Promise<any> {
    return hifiApiClient.getCover(trackId);
  }

  async getCoverByQuery(query: string): Promise<any> {
    return hifiApiClient.getCoverByQuery(query);
  }

  async getLyrics(trackId: string | number): Promise<any> {
    return hifiApiClient.getLyrics(trackId);
  }

  async getTopVideos(
    countryCode = 'US',
    locale = 'en_US',
    deviceType = 'BROWSER',
    limit = 25,
    offset = 0
  ): Promise<any> {
    return hifiApiClient.getTopVideos(countryCode, locale, deviceType, limit, offset);
  }

  async getVideo(
    videoId: number,
    quality = 'HIGH' as const,
    mode = 'STREAM',
    presentation = 'FULL'
  ): Promise<any> {
    return hifiApiClient.getVideo(videoId, quality, mode, presentation);
  }

  private async extractAudioUrl(manifest: string, mimeType?: string): Promise<string> {
    // Buffer.from rejects undefined with a TypeError that buries the real
    // problem, so guard the input before decoding anything.
    if (typeof manifest !== 'string' || manifest.length === 0) {
      throw new StreamResolutionError('The audio manifest was empty.');
    }

    try {
      const decodedManifest = Buffer.from(manifest, 'base64').toString('utf-8');

      // If the manifest is DASH or HLS, write it to a temp file and return the file:// URI
      // This prevents ExoPlayer's UnsupportedOperationException when parsing opaque data URIs
      if (mimeType === 'application/dash+xml' || mimeType === 'application/vnd.apple.mpegurl') {
        const ext = mimeType === 'application/dash+xml' ? 'mpd' : 'm3u8';
        const fileUri = `${FileSystem.cacheDirectory}manifest_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(fileUri, decodedManifest, { encoding: FileSystem.EncodingType.UTF8 });
        return fileUri;
      }

      const urlMatch = decodedManifest.match(/https?:\/\/[^\s"']+/);

      if (!urlMatch) {
        throw new StreamResolutionError('Could not find a playable audio stream for this track.');
      }

      return urlMatch[0];
    } catch (error) {
      if (error instanceof StreamResolutionError) throw error;
      throw new StreamResolutionError('Failed to parse audio manifest');
    }
  }

  private getFormatFromQuality(quality?: string): StreamInfo['format'] {
    if (!quality) return 'unknown';
    if (quality.includes('HI_RES') || quality.includes('LOSSLESS')) {
      return 'flac';
    }
    if (quality === 'HIGH') {
      return 'aac';
    }
    if (quality === 'LOW') {
      return 'mp3';
    }
    return 'unknown';
  }
}

export const hifiApiProvider = new HifiApiProvider();