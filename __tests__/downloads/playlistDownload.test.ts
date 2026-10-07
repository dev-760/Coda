import { planPlaylistDownload } from '../../src/downloads/playlistDownload';
import { Track } from '../../src/providers/types';

const track = (id: string): Track => ({ id, title: `Track ${id}`, artist: 'Artist' });

describe('planPlaylistDownload', () => {
  it('queues every track when nothing is downloaded', () => {
    const tracks = [track('a'), track('b'), track('c')];
    const plan = planPlaylistDownload(tracks, () => false);
    expect(plan.toDownload).toEqual(tracks);
    expect(plan.alreadyDownloaded).toBe(0);
  });

  it('skips tracks that are already offline', () => {
    const tracks = [track('a'), track('b'), track('c')];
    const plan = planPlaylistDownload(tracks, (id) => id === 'a' || id === 'c');
    expect(plan.toDownload.map((t) => t.id)).toEqual(['b']);
    expect(plan.alreadyDownloaded).toBe(2);
  });

  it('returns an empty queue when the whole playlist is offline', () => {
    const tracks = [track('a'), track('b')];
    const plan = planPlaylistDownload(tracks, () => true);
    expect(plan.toDownload).toEqual([]);
    expect(plan.alreadyDownloaded).toBe(2);
  });

  it('handles an empty playlist', () => {
    const plan = planPlaylistDownload([], () => false);
    expect(plan.toDownload).toEqual([]);
    expect(plan.alreadyDownloaded).toBe(0);
  });
});
