import { parseLyricsPayload } from '../../src/services/lyricsParser';

describe('lyricsParser', () => {
  it('handles null, undefined, or empty payload without throwing', () => {
    expect(parseLyricsPayload(null)).toEqual([]);
    expect(parseLyricsPayload(undefined)).toEqual([]);
    expect(parseLyricsPayload({})).toEqual([]);
    expect(parseLyricsPayload({ lyrics: null })).toEqual([]);
  });

  it('correctly unpacks Musixmatch nested payload with synced LRC subtitles', () => {
    const payload = {
      version: '2.10',
      lyrics: {
        trackId: '123456',
        lyricsProvider: 'musixmatch',
        lyrics: 'Line one\nLine two',
        subtitles: '[00:04.50]First line of song\n[00:08.12]Second line of song\n[01:15.80]Bridge section',
      },
    };

    const parsed = parseLyricsPayload(payload);
    expect(parsed.length).toBe(3);

    // [00:04.50] => 4 * 1000 + 500 = 4500ms
    expect(parsed[0].text).toBe('First line of song');
    expect(parsed[0].timeMs).toBe(4500);

    // [00:08.12] => 8 * 1000 + 120 = 8120ms
    expect(parsed[1].text).toBe('Second line of song');
    expect(parsed[1].timeMs).toBe(8120);

    // [01:15.80] => 60000 + 15000 + 800 = 75800ms
    expect(parsed[2].text).toBe('Bridge section');
    expect(parsed[2].timeMs).toBe(75800);
  });

  it('falls back to plain lyrics when synced subtitles are missing', () => {
    const payload = {
      version: '2.10',
      lyrics: {
        trackId: '123456',
        lyrics: 'First line\n\nSecond line\nThird line',
      },
    };

    const parsed = parseLyricsPayload(payload);
    expect(parsed.length).toBe(3);
    expect(parsed[0].text).toBe('First line');
    expect(parsed[1].text).toBe('Second line');
    expect(parsed[2].text).toBe('Third line');
  });

  it('handles simple string format fallback', () => {
    const parsed = parseLyricsPayload('Plain line 1\nPlain line 2');
    expect(parsed.length).toBe(2);
    expect(parsed[0].text).toBe('Plain line 1');
    expect(parsed[1].text).toBe('Plain line 2');
  });
});
