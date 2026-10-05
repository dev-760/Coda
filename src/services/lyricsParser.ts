export interface LyricLineItem {
  id: string;
  timeMs?: number;
  text: string;
  isRtl?: boolean;
}

/**
 * Unicode range covering Arabic, Arabic Supplement, Arabic Extended-A,
 * and Arabic Presentation Forms A & B (includes Persian, Urdu, Pashto, Kurdish).
 */
export const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Checks whether a given string contains Arabic script characters.
 */
export function isArabicText(text: string): boolean {
  if (!text) return false;
  return ARABIC_REGEX.test(text);
}

/**
 * Detects whether the text should be rendered RTL (Arabic) or LTR (English/Latin).
 */
export function detectDirection(text: string): 'rtl' | 'ltr' {
  return isArabicText(text) ? 'rtl' : 'ltr';
}

/**
 * Parses raw LRC string content with support for:
 * - Standard [mm:ss.xx] and [mm:ss.xxx]
 * - Colon millisecond format [mm:ss:xx] and [mm:ss:xxx]
 * - Minutes 1 to 3 digits [m:ss.xx] / [mmm:ss.xx]
 * - Second-only timestamps [mm:ss]
 * - Multiple timestamps on a single line [00:10.00][00:20.00]Chorus
 * - Offset tags [offset:+/-ms]
 * - Strips metadata headers [ti:...], [ar:...], [al:...], etc.
 */
export function parseLrcString(content: string): LyricLineItem[] {
  if (!content || typeof content !== 'string') return [];

  const lines: LyricLineItem[] = [];
  const rawLines = content.split(/\r?\n/);
  let offsetMs = 0;
  let idx = 0;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Handle LRC offset tag e.g. [offset:+500] or [offset:-200]
    const offsetMatch = trimmed.match(/^\[offset:\s*([+-]?\d+)\s*\]/i);
    if (offsetMatch) {
      offsetMs = parseInt(offsetMatch[1], 10) || 0;
      continue;
    }

    // Skip metadata header tags
    if (/^\[(ti|ar|al|by|re|ve|length|kana|encoding):/i.test(trimmed)) {
      continue;
    }

    // Regex for LRC timestamp: [mm:ss.xx] or [mm:ss:xx] or [mm:ss]
    const tagRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = tagRegex.exec(trimmed)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      let ms = 0;
      if (match[3]) {
        const msStr = match[3].padEnd(3, '0').slice(0, 3);
        ms = parseInt(msStr, 10);
      }
      timestamps.push(min * 60 * 1000 + sec * 1000 + ms);
      lastIndex = tagRegex.lastIndex;
    }

    if (timestamps.length > 0) {
      const text = trimmed.slice(lastIndex).trim();
      if (text) {
        for (const t of timestamps) {
          const timeMs = Math.max(0, t + offsetMs);
          lines.push({
            id: `synced-${idx++}`,
            timeMs,
            text,
            isRtl: isArabicText(text),
          });
        }
      }
    }
  }

  lines.sort((a, b) => (a.timeMs || 0) - (b.timeMs || 0));
  return lines;
}

/**
 * If only plain text lyrics are available without timestamps,
 * generates proportional timestamps based on the track duration so
 * that lyrics stay synchronized with the playing song.
 */
export function synthesizeTimestamps(
  lines: LyricLineItem[],
  durationMs?: number,
): LyricLineItem[] {
  if (!lines || lines.length === 0) return [];

  // Default duration if unknown: assume 4.5s per line
  const validDuration =
    durationMs && durationMs > 10000 ? durationMs : Math.max(30000, lines.length * 4500);

  // Reasonable song intro & outro padding
  const introMs = Math.min(12000, Math.max(2500, Math.round(validDuration * 0.05)));
  const outroMs = Math.min(15000, Math.max(4000, Math.round(validDuration * 0.07)));
  const vocalDuration = Math.max(5000, validDuration - introMs - outroMs);

  // Weight each line by character length with minimum weight
  const weights = lines.map((line) => Math.max(12, (line.text || '').trim().length));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let cumulativeWeight = 0;
  return lines.map((line, idx) => {
    const timeMs =
      line.timeMs !== undefined
        ? line.timeMs
        : Math.round(introMs + (cumulativeWeight / totalWeight) * vocalDuration);

    cumulativeWeight += weights[idx];
    return {
      ...line,
      timeMs,
      isRtl: line.isRtl !== undefined ? line.isRtl : isArabicText(line.text),
    };
  });
}

/**
 * Unpacks and parses Musixmatch / lyrics API payloads.
 * Handles nested objects ({ lyrics: { subtitles, lyrics } }), synced LRC subtitles,
 * top-level subtitles / syncedLyrics, Musixmatch JSON formats, and plain text fallbacks.
 */
export function parseLyricsPayload(data: any): LyricLineItem[] {
  if (!data) return [];

  const lyricsObj =
    typeof data?.lyrics === 'object' && data.lyrics !== null ? data.lyrics : null;

  // 1. Look for subtitle / synced lyrics strings
  const candidateSubtitles: string[] = [
    typeof lyricsObj?.subtitles === 'string' ? lyricsObj.subtitles : '',
    typeof lyricsObj?.syncedLyrics === 'string' ? lyricsObj.syncedLyrics : '',
    typeof data?.subtitles === 'string' ? data.subtitles : '',
    typeof data?.syncedLyrics === 'string' ? data.syncedLyrics : '',
    typeof lyricsObj?.lyrics === 'string' && lyricsObj.lyrics.includes('[0')
      ? lyricsObj.lyrics
      : '',
    typeof data?.lyrics === 'string' && data.lyrics.includes('[0')
      ? data.lyrics
      : '',
  ].filter(Boolean);

  for (const subStr of candidateSubtitles) {
    // Check if it's a JSON array of subtitle items (e.g. Musixmatch v1 subtitle_body)
    if (subStr.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(subStr);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
          const lines: LyricLineItem[] = [];
          parsed.forEach((item: any, idx: number) => {
            const text = (item.text || item.words || item.body || '').trim();
            const timeSec = item.time?.total ?? item.time ?? item.seconds ?? item.startTime;
            if (text) {
              const timeMs =
                typeof timeSec === 'number'
                  ? Math.round(timeSec * 1000)
                  : typeof item.startTimeMs === 'number'
                  ? item.startTimeMs
                  : undefined;
              lines.push({
                id: `synced-${idx}`,
                timeMs,
                text,
                isRtl: isArabicText(text),
              });
            }
          });
          if (lines.length > 0) return lines;
        }
      } catch {
        // Not JSON, continue to LRC string parsing
      }
    }

    const parsedLrc = parseLrcString(subStr);
    if (parsedLrc.length > 0) {
      return parsedLrc;
    }
  }

  // 2. Fallback to plain text
  const plainText: string =
    (typeof lyricsObj?.lyrics === 'string' ? lyricsObj.lyrics : null) ??
    (typeof data?.lyrics === 'string' ? data.lyrics : null) ??
    (typeof data?.plainLyrics === 'string' ? data.plainLyrics : null) ??
    (typeof data?.text === 'string' ? data.text : null) ??
    (typeof data === 'string' ? data : '');

  if (plainText) {
    return plainText
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean)
      .map((text: string, idx: number) => ({
        id: `plain-${idx}`,
        text,
        isRtl: isArabicText(text),
      }));
  }

  return [];
}
