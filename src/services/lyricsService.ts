import { hifiApiClient } from './hifiApiClient';
import {
  parseLyricsPayload,
  parseLrcString,
  synthesizeTimestamps,
  LyricLineItem,
  isArabicText,
} from './lyricsParser';
import { Track } from '../providers/types';
import { logger } from '../logging/Logger';

export interface LyricsResponse {
  items: LyricLineItem[];
  synced: boolean;
  hasArabic: boolean;
  source: 'hifi-synced' | 'lrclib-synced' | 'synthetic' | 'plain' | 'none';
}

const LRCLIB_BASE = 'https://lrclib.net/api';
const REQUEST_TIMEOUT_MS = 4000;

class LyricsService {
  private cache = new Map<string, LyricsResponse>();

  /**
   * Helper to perform a timeout-guarded JSON fetch from external APIs.
   */
  private async fetchWithTimeout(url: string): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CodaMusicPlayer/4.5.0' },
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Queries LRCLIB for synchronized lyrics.
   * Tries exact track+artist matching first, then falls back to catalog search.
   */
  private async queryLrclib(title: string, artist?: string): Promise<{
    synced?: string;
    plain?: string;
  } | null> {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = (artist || '').replace(/\(.*?\)/g, '').trim();

    // 1. Try exact get
    if (cleanTitle && cleanArtist) {
      try {
        const getUrl = `${LRCLIB_BASE}/get?track_name=${encodeURIComponent(
          cleanTitle,
        )}&artist_name=${encodeURIComponent(cleanArtist)}`;
        const data = await this.fetchWithTimeout(getUrl);
        if (data?.syncedLyrics) {
          return { synced: data.syncedLyrics, plain: data.plainLyrics };
        }
        if (data?.plainLyrics) {
          return { plain: data.plainLyrics };
        }
      } catch {}
    }

    // 2. Try search by title + artist
    const queriesToTry = [
      `${cleanTitle} ${cleanArtist}`.trim(),
      cleanTitle,
    ].filter(Boolean);

    for (const q of queriesToTry) {
      try {
        const searchUrl = `${LRCLIB_BASE}/search?q=${encodeURIComponent(q)}`;
        const results = await this.fetchWithTimeout(searchUrl);
        if (Array.isArray(results) && results.length > 0) {
          // Look for any item with syncedLyrics
          const withSynced = results.find((r) => typeof r.syncedLyrics === 'string' && r.syncedLyrics.trim().length > 0);
          if (withSynced) {
            return { synced: withSynced.syncedLyrics, plain: withSynced.plainLyrics };
          }
          const withPlain = results.find((r) => typeof r.plainLyrics === 'string' && r.plainLyrics.trim().length > 0);
          if (withPlain) {
            return { plain: withPlain.plainLyrics };
          }
        }
      } catch {}
    }

    return null;
  }

  /**
   * Fetches lyrics for a track, coordinating HiFi API, LRCLIB synced lyrics,
   * and synthesized timestamps for plain lyrics.
   */
  async getLyrics(track: Track, durationMs?: number): Promise<LyricsResponse> {
    const trackId = track.id;
    if (this.cache.has(trackId)) {
      const cached = this.cache.get(trackId)!;
      // If cached was plain/synthetic but durationMs just became known, synthesize
      if (!cached.synced && durationMs && durationMs > 0 && cached.items.length > 0) {
        const synth = synthesizeTimestamps(cached.items, durationMs);
        const updated: LyricsResponse = {
          items: synth,
          synced: true,
          hasArabic: cached.hasArabic,
          source: 'synthetic',
        };
        this.cache.set(trackId, updated);
        return updated;
      }
      return cached;
    }

    let plainCandidate: LyricLineItem[] = [];

    // --- Tier 1: HiFi API ---
    try {
      const hifiData = await hifiApiClient.getLyrics(trackId);
      if (hifiData) {
        const parsed = parseLyricsPayload(hifiData);
        const hasSync = parsed.some((l) => l.timeMs !== undefined);
        if (hasSync && parsed.length > 0) {
          const res: LyricsResponse = {
            items: parsed,
            synced: true,
            hasArabic: parsed.some((l) => isArabicText(l.text)),
            source: 'hifi-synced',
          };
          this.cache.set(trackId, res);
          return res;
        } else if (parsed.length > 0) {
          plainCandidate = parsed;
        }
      }
    } catch (error) {
      logger.info('LyricsService', `HiFi API lyrics lookup failed for ${trackId}: ${String(error)}`);
    }

    // --- Tier 2: LRCLIB (Specialized Synchronized Lyrics Provider) ---
    try {
      const lrclibRes = await this.queryLrclib(track.title, track.artist);
      if (lrclibRes?.synced) {
        const parsedLrc = parseLrcString(lrclibRes.synced);
        if (parsedLrc.length > 0) {
          const res: LyricsResponse = {
            items: parsedLrc,
            synced: true,
            hasArabic: parsedLrc.some((l) => isArabicText(l.text)),
            source: 'lrclib-synced',
          };
          this.cache.set(trackId, res);
          return res;
        }
      }
      if (lrclibRes?.plain && plainCandidate.length === 0) {
        plainCandidate = parseLyricsPayload(lrclibRes.plain);
      }
    } catch (error) {
      logger.info('LyricsService', `LRCLIB lookup failed: ${String(error)}`);
    }

    // --- Tier 3: Plain text with duration synthesis ---
    if (plainCandidate.length > 0) {
      const targetDuration = durationMs || track.durationMs;
      if (targetDuration && targetDuration > 0) {
        const synth = synthesizeTimestamps(plainCandidate, targetDuration);
        const res: LyricsResponse = {
          items: synth,
          synced: true,
          hasArabic: synth.some((l) => isArabicText(l.text)),
          source: 'synthetic',
        };
        this.cache.set(trackId, res);
        return res;
      }

      // Plain without known duration yet
      const res: LyricsResponse = {
        items: plainCandidate,
        synced: false,
        hasArabic: plainCandidate.some((l) => isArabicText(l.text)),
        source: 'plain',
      };
      this.cache.set(trackId, res);
      return res;
    }

    const emptyRes: LyricsResponse = {
      items: [],
      synced: false,
      hasArabic: false,
      source: 'none',
    };
    return emptyRes;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const lyricsService = new LyricsService();
