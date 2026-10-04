/**
 * Offline Mode must actually gate network playback.
 *
 * The toggle was persisted by the settings store but nothing read it, so
 * switching it on appeared to promise "downloaded & ready without data" while
 * every undownloaded track still streamed over the network. These tests pin the
 * gate in AudioService.resolveStream so it cannot silently regress.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Keep the native audio surface out of the unit test; only stream resolution matters here.
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: jest.fn(() => ({})),
}));

import { useSettingsStore } from '../../src/store/settingsStore';
import { useDownloadStore } from '../../src/downloads/downloadStore';
import { audioService } from '../../src/audio/AudioService';
import { Track } from '../../src/providers/types';

const makeTrack = (id: string): Track => ({
  id,
  title: `Track ${id}`,
  artist: 'Artist',
});

/** Replaces the download lookup so a track can be reported as cached or not. */
const stubOfflineLookup = (localPath: string | null) => {
  useDownloadStore.setState({
    getOfflineTrackUrl: jest.fn(async () => localPath),
  } as unknown as Partial<ReturnType<typeof useDownloadStore.getState>>);
};

/** Calls the private resolver; the gate it applies is the behaviour under test. */
const resolveStream = (track: Track) =>
  (audioService as unknown as { resolveStream: (t: Track) => Promise<unknown> })
    .resolveStream(track);

describe('Offline Mode', () => {
  const getStreamInfo = jest.fn(async () => ({
    url: 'https://cdn/track',
    format: 'aac' as const,
  }));

  beforeEach(() => {
    getStreamInfo.mockClear();
    jest
      .spyOn(require('../../src/providers/registry'), 'getActiveProvider')
      .mockReturnValue({ getStreamInfo } as never);

    useSettingsStore.setState({ offlineMode: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('streams an undownloaded track when Offline Mode is off', async () => {
    stubOfflineLookup(null);

    const result = await resolveStream(makeTrack('a'));

    expect(getStreamInfo).toHaveBeenCalledWith('a');
    expect(result).toEqual({ url: 'https://cdn/track', format: 'aac' });
  });

  it('refuses an undownloaded track when Offline Mode is on', async () => {
    stubOfflineLookup(null);
    useSettingsStore.setState({ offlineMode: true });

    await expect(resolveStream(makeTrack('b'))).rejects.toThrow(/not downloaded/i);
    expect(getStreamInfo).not.toHaveBeenCalled();
  });

  it('still plays a downloaded track when Offline Mode is on', async () => {
    stubOfflineLookup('file:///downloads/b.m4a');
    useSettingsStore.setState({ offlineMode: true });

    const result = await resolveStream(makeTrack('b'));

    expect(result).toEqual({ url: 'file:///downloads/b.m4a', format: 'unknown' });
    expect(getStreamInfo).not.toHaveBeenCalled();
  });

  it('prefers the downloaded copy over the network even when online', async () => {
    stubOfflineLookup('file:///downloads/c.m4a');
    useSettingsStore.setState({ offlineMode: false });

    const result = await resolveStream(makeTrack('c'));

    expect(result).toEqual({ url: 'file:///downloads/c.m4a', format: 'unknown' });
    expect(getStreamInfo).not.toHaveBeenCalled();
  });
});
