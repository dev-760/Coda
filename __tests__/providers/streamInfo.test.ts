/**
 * Regression cover for the failure in the device logs:
 *
 *   TypeError: The first argument must be one of type string, Buffer,
 *   ArrayBuffer, Array, or Array-like Object. Received type undefined
 *   Error: Failed to parse audio manifest
 *
 * `/track/` wraps its payload as `{ version, data }`. Reading `manifest` off
 * the envelope yields undefined, which `Buffer.from` rejects with a TypeError
 * that hid the real problem.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSettingsStore = { audio: { hifiAudioQuality: 'LOSSLESS' } };
jest.mock('../../src/store/settingsStore', () => ({
  useSettingsStore: { getState: () => mockSettingsStore },
}));

const mockGetTrack = jest.fn();
jest.mock('../../src/services/hifiApiClient', () => ({
  hifiApiClient: { getTrack: (...args: unknown[]) => mockGetTrack(...args) },
}));

const mockWriteAsStringAsync = jest.fn(async () => undefined);
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
}));

// Imported after the mocks above are registered.
import { hifiApiProvider } from '../../src/providers/HifiApiProvider';

/** A DASH manifest, base64, as the API returns it. */
const DASH_MANIFEST_B64 = Buffer.from(
  '<?xml version="1.0" encoding="UTF-8"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011"/>',
).toString('base64');

describe('HifiApiProvider.getStreamInfo', () => {
  beforeEach(() => {
    mockGetTrack.mockReset();
    mockWriteAsStringAsync.mockClear();
  });

  it('reads the manifest out of the { version, data } envelope', async () => {
    mockGetTrack.mockResolvedValue({
      version: '2.10',
      data: {
        trackId: 1550546,
        audioQuality: 'LOSSLESS',
        manifestMimeType: 'application/dash+xml',
        manifest: DASH_MANIFEST_B64,
      },
    });

    const stream = await hifiApiProvider.getStreamInfo('1550546');

    // The bug handed `undefined` to Buffer.from; reaching a .mpd file URI means
    // the base64 decode and the DASH branch both ran.
    expect(stream.url).toMatch(/\.mpd$/);
    expect(stream.format).toBe('dash');
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('.mpd'),
      expect.stringContaining('<MPD'),
      expect.anything(),
    );
  });

  it('passes the caller-chosen quality through to the API', async () => {
    mockGetTrack.mockResolvedValue({
      data: {
        audioQuality: 'HIGH',
        manifestMimeType: 'audio/mp4',
        manifest: Buffer.from('https://example.test/a.m4a').toString('base64'),
      },
    });

    await hifiApiProvider.getStreamInfo('1550546');

    expect(mockGetTrack).toHaveBeenCalledWith(1550546, 'LOSSLESS', false);
  });

  it('falls back to the flat shape if the envelope is ever dropped', async () => {
    mockGetTrack.mockResolvedValue({
      manifestMimeType: 'audio/mp4',
      manifest: Buffer.from('https://example.test/audio.m4a').toString('base64'),
      audioQuality: 'HIGH',
    });

    const stream = await hifiApiProvider.getStreamInfo('1550546');

    expect(stream.url).toBe('https://example.test/audio.m4a');
    expect(stream.format).toBe('aac');
  });

  it('reports a missing manifest instead of a Buffer TypeError', async () => {
    mockGetTrack.mockResolvedValue({
      version: '2.10',
      data: { trackId: 1550546, audioQuality: 'HI_RES_LOSSLESS' },
    });

    // The wrapped message must not leak the opaque Buffer type error.
    await expect(hifiApiProvider.getStreamInfo('1550546')).rejects.toThrow(
      /not available in the selected quality/i,
    );
  });

  it('wraps an unexpected API failure in a generic, safe message', async () => {
    mockGetTrack.mockRejectedValue(new Error("Request failed (422): Unsupported quality 'ultra'"));

    // The raw upstream detail is logged, not shown to the listener.
    await expect(hifiApiProvider.getStreamInfo('1550546')).rejects.toThrow(
      /Failed to get stream info/i,
    );
  });

  it('rejects a non-numeric track id before calling the API', async () => {
    await expect(hifiApiProvider.getStreamInfo('not-an-id')).rejects.toThrow('Invalid track ID');
    expect(mockGetTrack).not.toHaveBeenCalled();
  });
});
