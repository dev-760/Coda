import { MusicProvider, Track, StreamInfo, ProviderHealth } from './types';
import { hifiApiClient } from '../services/hifiApiClient';
import { AudioQuality } from '../config/hifiApi';
import { useSettingsStore } from '../store/settingsStore';
import { mapHifiApiTracks } from './mappers';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';

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
      const items = (response?.items ?? []).map((i: any) => i.item ?? i);
      return mapHifiApiTracks(items);
    } catch (error) {
      console.error('Hifi API search error:', error);
      throw new Error('Search failed. Check your connection and try again.');
    }
  }

  async getStreamInfo(trackId: string, abortSignal?: AbortSignal): Promise<StreamInfo> {
    const numericId = parseInt(trackId, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid track ID');
    }

    try {
      const response = await hifiApiClient.getTrack(numericId, this.getPreferredQuality(), false);

      const audioUrl = await this.extractAudioUrl(response.manifest, response.manifestMimeType);

      let format: any = this.getFormatFromQuality(response.audioQuality);
      if (response.manifestMimeType === 'application/dash+xml') format = 'dash';
      if (response.manifestMimeType === 'application/vnd.apple.mpegurl') format = 'hls';

      return {
        url: audioUrl,
        format: format,
      };
    } catch (error) {
      console.error('Luma Core stream error:', error);
      throw new Error('Failed to get stream info. Please try again later.');
    }
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

  // Additional methods for accessing API features
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

  private async extractAudioUrl(manifest: string, mimeType: string): Promise<string> {
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

      // Fallback: try to decode and find a direct URL
      const urlMatch = decodedManifest.match(/https?:\/\/[^\s"']+/);
      
      if (!urlMatch) {
        throw new Error('Could not extract audio URL from manifest');
      }

      return urlMatch[0];
    } catch (error) {
      console.error('Error extracting audio URL:', error);
      throw new Error('Failed to parse audio manifest');
    }
  }

  private getFormatFromQuality(quality: string): 'flac' | 'mp3' | 'aac' | 'unknown' {
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