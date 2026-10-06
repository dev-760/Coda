import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadStorage } from '../../src/downloads/downloadStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The real File/Directory classes need a native module, so these tests drive
// the index through storage with the file layer stubbed.
const mockFiles = new Map<string, { size: number }>();
const mockMissing = new Set<string>();

jest.mock('expo-file-system', () => {
  class FakeFile {
    uri: string;
    exists: boolean;
    size?: number;
    constructor(target: unknown, name?: string) {
      this.uri = typeof target === 'string' ? target : `${String(target)}/${name ?? ''}`;
      this.exists = !mockMissing.has(this.uri);
      this.size = mockFiles.get(this.uri)?.size ?? 0;
    }
    delete() {
      mockFiles.delete(this.uri);
            mockMissing.delete(this.uri);
    }
    move() {}
  }
  class FakeDirectory {
    exists = true;
    constructor(..._args: unknown[]) {}
    create() {}
  }
  return {
    File: FakeFile,
    Directory: FakeDirectory,
    Paths: {
      document: 'file:///documents',
      cache: 'file:///cache',
      get availableDiskSpace() {
        return 5_000_000_000;
      },
    },
  };
});

type Metadata = Parameters<typeof downloadStorage.saveDownloadMetadata>[0];

const makeMeta = (overrides: Partial<Metadata> = {}): Metadata => ({
  trackId: '1',
  track: { id: '1', title: 'One', artist: 'A' },
  status: 'completed',
  progress: 100,
  downloadedBytes: 1000,
  totalBytes: 1000,
  filePath: 'file:///documents/downloads/1.flac',
  format: 'flac',
  quality: 'LOSSLESS',
  createdAt: 1,
  retryCount: 0,
  ...overrides,
});

describe('downloadStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockFiles.clear();
    mockMissing.clear();
  });

  it('round trips a download index entry', async () => {
    await downloadStorage.saveDownloadMetadata(makeMeta());
    const stored = await downloadStorage.getDownloadByTrackId('1');
    expect(stored?.track.title).toBe('One');
    expect(stored?.status).toBe('completed');
  });

  it('replaces rather than duplicates on re-save', async () => {
    await downloadStorage.saveDownloadMetadata(makeMeta({ status: 'pending', progress: 0 }));
    await downloadStorage.saveDownloadMetadata(makeMeta({ status: 'completed', progress: 100 }));
    const all = await downloadStorage.getAllDownloads();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('completed');
  });

  it('computes progress from bytes', async () => {
    await downloadStorage.saveDownloadMetadata(
      makeMeta({ status: 'pending', progress: 0, totalBytes: 0, filePath: null }),
    );
    await downloadStorage.updateProgress('1', 250, 1000);
    const stored = await downloadStorage.getDownloadByTrackId('1');
    expect(stored?.progress).toBe(25);
    expect(stored?.status).toBe('downloading');
  });

  it('reports an unknown total as zero progress rather than NaN', async () => {
    await downloadStorage.saveDownloadMetadata(
      makeMeta({ status: 'pending', progress: 0, totalBytes: 0, filePath: null }),
    );
    await downloadStorage.updateProgress('1', 500, 0);
    const stored = await downloadStorage.getDownloadByTrackId('1');
    expect(stored?.progress).toBe(0);
  });

  it('marks completed only when the status says so', async () => {
    await downloadStorage.saveDownloadMetadata(
      makeMeta({ status: 'downloading', progress: 40, filePath: null }),
    );
    await downloadStorage.updateStatus('1', 'completed', { filePath: 'file:///x.flac' });
    const stored = await downloadStorage.getDownloadByTrackId('1');
    expect(stored?.status).toBe('completed');
    expect(stored?.completedAt).toBeGreaterThan(0);
  });

  it('records a failure message and timestamp', async () => {
    await downloadStorage.saveDownloadMetadata(makeMeta({ status: 'pending' }));
    await downloadStorage.updateStatus('1', 'failed', { errorMessage: 'No space left' });
    const stored = await downloadStorage.getDownloadByTrackId('1');
    expect(stored?.errorMessage).toBe('No space left');
    expect(stored?.failedAt).toBeGreaterThan(0);
  });

  it('treats a completed entry with a file as downloaded', async () => {
    await downloadStorage.saveDownloadMetadata(makeMeta());
    expect(await downloadStorage.isTrackDownloaded('1')).toBe(true);
  });

  it('does not treat a failed entry as downloaded', async () => {
    await downloadStorage.saveDownloadMetadata(makeMeta({ status: 'failed', filePath: null }));
    expect(await downloadStorage.isTrackDownloaded('1')).toBe(false);
  });

  describe('index repair', () => {
    it('drops a completed entry whose file is gone', async () => {
      mockMissing.add('file:///documents/downloads/1.flac');
      await downloadStorage.saveDownloadMetadata(makeMeta());
      const removed = await downloadStorage.repairIndex();
      expect(removed).toEqual(['1']);
      expect(await downloadStorage.getAllDownloads()).toHaveLength(0);
    });

    it('drops a completed entry whose size no longer matches', async () => {
      mockFiles.set('file:///documents/downloads/1.flac', { size: 999 });
      await downloadStorage.saveDownloadMetadata(
        makeMeta({ totalBytes: 1000, downloadedBytes: 1000 }),
      );
      const removed = await downloadStorage.repairIndex();
      expect(removed).toEqual(['1']);
    });

    it('keeps a completed entry whose size matches', async () => {
      mockFiles.set('file:///documents/downloads/1.flac', { size: 1000 });
      await downloadStorage.saveDownloadMetadata(makeMeta());
      expect(await downloadStorage.repairIndex()).toEqual([]);
      expect(await downloadStorage.getAllDownloads()).toHaveLength(1);
    });

    it('resets an interrupted download to pending so it retries', async () => {
      await downloadStorage.saveDownloadMetadata(
        makeMeta({ status: 'downloading', progress: 60, filePath: null }),
      );
      await downloadStorage.repairIndex();
      const stored = await downloadStorage.getDownloadByTrackId('1');
      expect(stored?.status).toBe('pending');
    });
  });

  describe('deletion', () => {
    it('removes one entry', async () => {
      await downloadStorage.saveDownloadMetadata(makeMeta());
      await downloadStorage.saveDownloadMetadata(
        makeMeta({ trackId: '2', filePath: 'file:///documents/downloads/2.flac' }),
      );
      await downloadStorage.deleteDownload('1');
      const all = await downloadStorage.getAllDownloads();
      expect(all).toHaveLength(1);
      expect(all[0].trackId).toBe('2');
    });

    it('clears everything', async () => {
      await downloadStorage.saveDownloadMetadata(makeMeta());
      await downloadStorage.saveDownloadMetadata(makeMeta({ trackId: '2' }));
      await downloadStorage.clearAllDownloads();
      expect(await downloadStorage.getAllDownloads()).toEqual([]);
    });
  });

  it('survives a corrupt index instead of crashing', async () => {
    await AsyncStorage.setItem('coda:download_metadata', '{not json');
    expect(await downloadStorage.getAllDownloads()).toEqual([]);
  });
});
