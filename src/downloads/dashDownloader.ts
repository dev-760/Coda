import { File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { logger } from '../logging/Logger';

export interface DashSegmentPlan {
  initUrl: string;
  mediaTemplate: string;
  startNumber: number;
  totalSegments: number;
  mimeType: string;
  codecs: string;
}

/** Checks whether a given stream URL points to an MPEG-DASH manifest. */
export function isDashManifestUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase();
  return clean.includes('.mpd') || clean.includes('dash+xml');
}

/** Parses initialization and segment URL templates from an MPD XML document. */
export function parseDashManifest(xml: string): DashSegmentPlan | null {
  try {
    const initMatch = xml.match(/initialization="([^"]+)"/);
    if (!initMatch) return null;
    const initUrl = initMatch[1].replace(/&amp;/g, '&');

    const mediaMatch = xml.match(/media="([^"]+)"/);
    if (!mediaMatch) return null;
    const mediaTemplate = mediaMatch[1].replace(/&amp;/g, '&');

    const startMatch = xml.match(/startNumber="(\d+)"/);
    const startNumber = startMatch ? parseInt(startMatch[1], 10) : 1;

    const mimeMatch = xml.match(/mimeType="([^"]+)"/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mp4';

    const codecMatch = xml.match(/codecs="([^"]+)"/);
    const codecs = codecMatch ? codecMatch[1] : 'flac';

    let totalSegments = 0;
    const timelineMatch = xml.match(/<SegmentTimeline>([\s\S]*?)<\/SegmentTimeline>/);
    if (timelineMatch) {
      const sTags = timelineMatch[1].matchAll(/<S\s+[^>]*?(\/>|>[\s\S]*?<\/S>)/g);
      for (const s of sTags) {
        const tag = s[0];
        const rMatch = tag.match(/r="(\d+)"/);
        if (rMatch) {
          totalSegments += 1 + parseInt(rMatch[1], 10);
        } else {
          totalSegments += 1;
        }
      }
    }

    if (totalSegments === 0) {
      // Single segment fallback when SegmentTimeline is omitted.
      totalSegments = 1;
    }

    let baseUrl = '';
    const baseMatch = xml.match(/<BaseURL>([^<]+)<\/BaseURL>/i);
    if (baseMatch) {
      baseUrl = baseMatch[1].trim();
    }

    const fullInitUrl = (!initUrl.startsWith('http') && baseUrl) ? `${baseUrl}${initUrl}` : initUrl;
    const fullMediaTemplate = (!mediaTemplate.startsWith('http') && baseUrl) ? `${baseUrl}${mediaTemplate}` : mediaTemplate;

    return {
      initUrl: fullInitUrl,
      mediaTemplate: fullMediaTemplate,
      startNumber,
      totalSegments,
      mimeType,
      codecs,
    };
  } catch (error) {
    logger.error('DashDownloader', 'Failed to parse DASH manifest', error);
    return null;
  }
}

export interface DashDownloadOptions {
  signal?: AbortSignal;
  onProgress?: (bytesWritten: number, totalBytes: number) => void;
}

/**
 * Downloads all segments of a fragmented MP4 (fMP4) DASH stream and sequentially
 * appends them into a single, fully standard playable audio file (.m4a/.flac).
 */
export async function downloadDashStream(
  manifestUrlOrFile: string,
  destination: File,
  options: DashDownloadOptions = {}
): Promise<{ size: number }> {
  const { signal, onProgress } = options;

  let xmlContent = '';
  if (manifestUrlOrFile.startsWith('file:') || manifestUrlOrFile.startsWith('/')) {
    try {
      xmlContent = await FileSystemLegacy.readAsStringAsync(manifestUrlOrFile, {
        encoding: FileSystemLegacy.EncodingType.UTF8,
      });
    } catch {
      const f = new File(manifestUrlOrFile);
      xmlContent = await f.text();
    }
  } else if (manifestUrlOrFile.startsWith('http:') || manifestUrlOrFile.startsWith('https:')) {
    const res = await fetch(manifestUrlOrFile, { signal });
    if (!res.ok) throw new Error(`Failed to fetch manifest: HTTP ${res.status}`);
    xmlContent = await res.text();
  } else {
    xmlContent = manifestUrlOrFile;
  }

  const plan = parseDashManifest(xmlContent);
  if (!plan) {
    throw new Error('Could not parse DASH manifest. Stream format is invalid or unsupported.');
  }

  if (destination.exists) {
    destination.delete();
  }
  destination.create();

  let bytesWritten = 0;
  const estimatedTotalBytes = (plan.totalSegments + 1) * 320 * 1024;

  if (signal?.aborted) throw new Error('Download cancelled.');
  const initRes = await fetch(plan.initUrl, { signal });
  if (!initRes.ok) throw new Error(`Failed to fetch init segment: HTTP ${initRes.status}`);
  const initBuf = await initRes.arrayBuffer();
  destination.write(new Uint8Array(initBuf), { append: true });
  bytesWritten += initBuf.byteLength;
  onProgress?.(bytesWritten, estimatedTotalBytes);

  const endNumber = plan.startNumber + plan.totalSegments - 1;
  for (let seg = plan.startNumber; seg <= endNumber; seg++) {
    if (signal?.aborted) throw new Error('Download cancelled.');

    const segUrl = plan.mediaTemplate.replace('$Number$', seg.toString());
    const segRes = await fetch(segUrl, { signal });
    if (!segRes.ok) {
      throw new Error(`Failed downloading segment ${seg}/${plan.totalSegments} (HTTP ${segRes.status})`);
    }

    const segBuf = await segRes.arrayBuffer();
    destination.write(new Uint8Array(segBuf), { append: true });
    bytesWritten += segBuf.byteLength;

    const currentTotal = Math.max(bytesWritten, Math.round((bytesWritten / seg) * plan.totalSegments));
    onProgress?.(bytesWritten, currentTotal);
  }

  return { size: bytesWritten };
}

/** Checks whether a given stream URL points to an HLS playlist manifest. */
export function isHlsManifestUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase();
  return clean.includes('.m3u8') || clean.includes('mpegurl');
}

/**
 * Downloads all segments of an HLS stream and sequentially appends them into destination.
 */
export async function downloadHlsStream(
  manifestUrlOrFile: string,
  destination: File,
  options: DashDownloadOptions = {}
): Promise<{ size: number }> {
  const { signal, onProgress } = options;

  let content = '';
  let baseUri = '';
  if (manifestUrlOrFile.startsWith('file:') || manifestUrlOrFile.startsWith('/')) {
    try {
      content = await FileSystemLegacy.readAsStringAsync(manifestUrlOrFile, {
        encoding: FileSystemLegacy.EncodingType.UTF8,
      });
    } catch {
      const f = new File(manifestUrlOrFile);
      content = await f.text();
    }
  } else if (manifestUrlOrFile.startsWith('http:') || manifestUrlOrFile.startsWith('https:')) {
    const res = await fetch(manifestUrlOrFile, { signal });
    if (!res.ok) throw new Error(`Failed to fetch HLS manifest: HTTP ${res.status}`);
    content = await res.text();
    baseUri = manifestUrlOrFile.substring(0, manifestUrlOrFile.lastIndexOf('/') + 1);
  } else {
    content = manifestUrlOrFile;
  }

  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  // If master playlist with variants, find the sub-playlist
  const variantLine = lines.find((l) => !l.startsWith('#') && (l.includes('.m3u8') || l.includes('http')));
  if (variantLine && !lines.some((l) => l.startsWith('#EXTINF'))) {
    const subUrl = variantLine.startsWith('http') ? variantLine : `${baseUri}${variantLine}`;
    return downloadHlsStream(subUrl, destination, options);
  }

  const segmentUrls: string[] = [];
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    const url = line.startsWith('http') ? line : `${baseUri}${line}`;
    segmentUrls.push(url);
  }

  if (segmentUrls.length === 0) {
    throw new Error('No playable segments found in HLS stream.');
  }

  if (destination.exists) {
    destination.delete();
  }
  destination.create();

  let bytesWritten = 0;
  for (let i = 0; i < segmentUrls.length; i++) {
    if (signal?.aborted) throw new Error('Download cancelled.');
    const segRes = await fetch(segmentUrls[i], { signal });
    if (!segRes.ok) {
      throw new Error(`Failed downloading HLS segment ${i + 1}/${segmentUrls.length} (HTTP ${segRes.status})`);
    }
    const buf = await segRes.arrayBuffer();
    destination.write(new Uint8Array(buf), { append: true });
    bytesWritten += buf.byteLength;
    const currentTotal = Math.max(bytesWritten, Math.round((bytesWritten / (i + 1)) * segmentUrls.length));
    onProgress?.(bytesWritten, currentTotal);
  }

  return { size: bytesWritten };
}
