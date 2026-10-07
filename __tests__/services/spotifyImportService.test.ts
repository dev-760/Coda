import { parseSpotifyUrl } from '../../src/services/spotifyImportService';

describe('spotifyImportService', () => {
  describe('parseSpotifyUrl', () => {
    it('parses standard Spotify playlist URLs', () => {
      const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
      const parsed = parseSpotifyUrl(url);
      expect(parsed).toEqual({
        type: 'playlist',
        id: '37i9dQZF1DXcBWIGoYBM5M',
      });
    });

    it('parses Spotify playlist URLs with tracking query params', () => {
      const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=ab12cd34ef';
      const parsed = parseSpotifyUrl(url);
      expect(parsed).toEqual({
        type: 'playlist',
        id: '37i9dQZF1DXcBWIGoYBM5M',
      });
    });

    it('parses Spotify album URLs', () => {
      const url = 'https://open.spotify.com/album/4LH4d3cOWNNXdsqFd4O2CU';
      const parsed = parseSpotifyUrl(url);
      expect(parsed).toEqual({
        type: 'album',
        id: '4LH4d3cOWNNXdsqFd4O2CU',
      });
    });

    it('parses Spotify track URLs', () => {
      const url = 'https://open.spotify.com/track/1DwscornXpj8fmOmYVlqZt';
      const parsed = parseSpotifyUrl(url);
      expect(parsed).toEqual({
        type: 'track',
        id: '1DwscornXpj8fmOmYVlqZt',
      });
    });

    it('returns null for non-Spotify URLs', () => {
      expect(parseSpotifyUrl('https://example.com/playlist/123')).toBeNull();
      expect(parseSpotifyUrl('not a url')).toBeNull();
    });
  });
});
