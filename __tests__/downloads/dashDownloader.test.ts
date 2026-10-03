import { isDashManifestUrl, parseDashManifest } from '../../src/downloads/dashDownloader';

describe('dashDownloader', () => {
  describe('isDashManifestUrl', () => {
    it('detects .mpd URLs correctly', () => {
      expect(isDashManifestUrl('https://example.com/stream/manifest.mpd')).toBe(true);
      expect(isDashManifestUrl('file:///data/user/0/manifest_12345.mpd')).toBe(true);
      expect(isDashManifestUrl('https://example.com/manifest.mpd?token=abc&amp;exp=123')).toBe(true);
    });

    it('detects dash+xml mime indicators', () => {
      expect(isDashManifestUrl('https://example.com/stream?type=dash+xml')).toBe(true);
    });

    it('returns false for direct audio files or invalid inputs', () => {
      expect(isDashManifestUrl('https://example.com/track.flac')).toBe(false);
      expect(isDashManifestUrl('https://example.com/track.mp3')).toBe(false);
      expect(isDashManifestUrl('https://example.com/stream.m4a')).toBe(false);
      expect(isDashManifestUrl('')).toBe(false);
      expect(isDashManifestUrl(null as unknown as string)).toBe(false);
    });
  });

  describe('parseDashManifest', () => {
    const sampleMpd = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" minBufferTime="PT1.5S" type="static" mediaPresentationDuration="PT3M45S">
  <Period>
    <AdaptationSet mimeType="audio/mp4" codecs="flac" subsegmentAlignment="true">
      <SegmentTemplate
        initialization="https://audio-cdn.example.com/tracks/123/0.mp4?token=abc&amp;key=xyz"
        media="https://audio-cdn.example.com/tracks/123/$Number$.mp4?token=abc&amp;key=xyz"
        startNumber="1"
        timescale="44100"
      >
        <SegmentTimeline>
          <S t="0" d="88200" r="4" />
          <S d="44100" />
        </SegmentTimeline>
      </SegmentTemplate>
    </AdaptationSet>
  </Period>
</MPD>`;

    it('parses initialization URL, media template, codecs, and calculates total segments', () => {
      const plan = parseDashManifest(sampleMpd);
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.initUrl).toBe('https://audio-cdn.example.com/tracks/123/0.mp4?token=abc&key=xyz');
      expect(plan.mediaTemplate).toBe('https://audio-cdn.example.com/tracks/123/$Number$.mp4?token=abc&key=xyz');
      expect(plan.startNumber).toBe(1);
      expect(plan.mimeType).toBe('audio/mp4');
      expect(plan.codecs).toBe('flac');
      // Timeline: <S r="4" /> (1 + 4 = 5 segments) + <S /> (1 segment) = 6 segments total
      expect(plan.totalSegments).toBe(6);
    });

    it('returns null if initialization or media template is missing', () => {
      expect(parseDashManifest('<MPD><Period></Period></MPD>')).toBeNull();
      expect(parseDashManifest('<MPD initialization="init.mp4"></MPD>')).toBeNull();
    });
  });
});
