export interface LyricLineItem {
  id: string;
  timeMs?: number;
  text: string;
}

/**
 * Unpacks and parses Musixmatch / lyrics API payloads.
 * Handles nested objects ({ lyrics: { subtitles, lyrics } }), synced LRC subtitles,
 * and plain text fallbacks without throwing on null or malformed data.
 */
export function parseLyricsPayload(data: any): LyricLineItem[] {
  if (!data) return [];

  const lyricsObj = typeof data?.lyrics === 'object' && data.lyrics !== null ? data.lyrics : null;
  const subtitlesStr: string = typeof lyricsObj?.subtitles === 'string' ? lyricsObj.subtitles : '';

  if (subtitlesStr) {
    const lrcRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
    const lines: LyricLineItem[] = [];
    const rawLines = subtitlesStr.split('\n');
    let idx = 0;
    for (const raw of rawLines) {
      const match = raw.match(lrcRegex);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const msStr = match[3].padEnd(3, '0').slice(0, 3);
        const ms = parseInt(msStr, 10);
        const timeMs = min * 60 * 1000 + sec * 1000 + ms;
        const text = match[4].trim();
        if (text) {
          lines.push({ id: `synced-${idx++}`, timeMs, text });
        }
      }
    }
    if (lines.length > 0) return lines;
  }

  // Fallback to plain text
  const plainText: string =
    (typeof lyricsObj?.lyrics === 'string' ? lyricsObj.lyrics : null) ??
    (typeof data?.lyrics === 'string' ? data.lyrics : null) ??
    (typeof data?.text === 'string' ? data.text : null) ??
    (typeof data === 'string' ? data : '');

  if (plainText) {
    return plainText
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean)
      .map((text: string, idx: number) => ({ id: `plain-${idx}`, text }));
  }

  return [];
}
