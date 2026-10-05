import {
  parseLyricsPayload,
  parseLrcString,
  isArabicText,
  detectDirection,
  synthesizeTimestamps,
} from '../../src/services/lyricsParser';

describe('lyricsParser', () => {
  describe('parseLyricsPayload', () => {
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
          subtitles:
            '[00:04.50]First line of song\n[00:08.12]Second line of song\n[01:15.80]Bridge section',
        },
      };

      const parsed = parseLyricsPayload(payload);
      expect(parsed.length).toBe(3);

      // [00:04.50] => 4 * 1000 + 500 = 4500ms
      expect(parsed[0].text).toBe('First line of song');
      expect(parsed[0].timeMs).toBe(4500);
      expect(parsed[0].isRtl).toBe(false);

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

  describe('Arabic RTL & English LTR Detection', () => {
    it('accurately identifies Arabic text as RTL', () => {
      expect(isArabicText('ليالي بتعدي علينا')).toBe(true);
      expect(detectDirection('ليالي بتعدي علينا')).toBe('rtl');
      expect(isArabicText('انا عيني تشوفك')).toBe(true);
      expect(detectDirection('انا عيني تشوفك')).toBe('rtl');
      expect(isArabicText('«ليالي!»')).toBe(true);
    });

    it('accurately identifies English and Latin text as LTR', () => {
      expect(isArabicText('First line of song')).toBe(false);
      expect(detectDirection('First line of song')).toBe('ltr');
      expect(isArabicText('Starboy by The Weeknd')).toBe(false);
      expect(detectDirection('Starboy by The Weeknd')).toBe('ltr');
      expect(isArabicText('Comme si je n existais pas')).toBe(false);
      expect(detectDirection('Comme si je n existais pas')).toBe('ltr');
    });
  });

  describe('parseLrcString', () => {
    it('parses Arabic synchronized LRC lyrics with timestamps and sets isRtl', () => {
      const arabicLrc =
        '[00:13.66]ليالي بتعدي علينا\n[00:19.13]ولسه أنا وإنت برضه لوحدينا\n[00:26.24]إنسى وسيبك زعلالي';

      const parsed = parseLrcString(arabicLrc);
      expect(parsed.length).toBe(3);

      expect(parsed[0].text).toBe('ليالي بتعدي علينا');
      expect(parsed[0].timeMs).toBe(13660);
      expect(parsed[0].isRtl).toBe(true);

      expect(parsed[1].text).toBe('ولسه أنا وإنت برضه لوحدينا');
      expect(parsed[1].timeMs).toBe(19130);
      expect(parsed[1].isRtl).toBe(true);

      expect(parsed[2].text).toBe('إنسى وسيبك زعلالي');
      expect(parsed[2].timeMs).toBe(26240);
      expect(parsed[2].isRtl).toBe(true);
    });

    it('handles multiple timestamps and colon millisecond separator', () => {
      const lrc = '[00:08:12]Colon ms format\n[00:10.00][00:20.00]Chorus line';
      const parsed = parseLrcString(lrc);
      expect(parsed.length).toBe(3);
      expect(parsed[0].timeMs).toBe(8120);
      expect(parsed[1].timeMs).toBe(10000);
      expect(parsed[2].timeMs).toBe(20000);
    });

    it('respects offset tags in LRC', () => {
      const lrc = '[offset:+500]\n[00:04.00]Delayed line';
      const parsed = parseLrcString(lrc);
      expect(parsed.length).toBe(1);
      expect(parsed[0].timeMs).toBe(4500);
    });
  });

  describe('synthesizeTimestamps', () => {
    it('synthesizes synchronized timestamps when given plain text and track duration', () => {
      const plain = [
        { id: 'p-0', text: 'First line of the verse' },
        { id: 'p-1', text: 'Second line with more words in this part of song' },
        { id: 'p-2', text: 'Short outro' },
      ];

      const synth = synthesizeTimestamps(plain, 60000);
      expect(synth.length).toBe(3);
      expect(synth[0].timeMs).toBeGreaterThan(0);
      expect(synth[1].timeMs).toBeGreaterThan(synth[0].timeMs!);
      expect(synth[2].timeMs).toBeGreaterThan(synth[1].timeMs!);
      expect(synth[2].timeMs).toBeLessThan(60000);
    });
  });
});
