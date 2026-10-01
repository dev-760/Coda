import { ReportBuilder, REPORT_SCHEMA_VERSION } from '../../src/logging/ReportBuilder';
import { useLogStore } from '../../src/store/logStore';
import { useSettingsStore } from '../../src/store/settingsStore';

jest.mock('../../src/store/logStore', () => ({
  useLogStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../../src/store/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

describe('ReportBuilder', () => {
  it('should generate sanitized report', async () => {
    (useLogStore.getState as jest.Mock).mockReturnValue({
      entries: [
        { timestamp: 123, level: 'info', tag: 'test', message: 'Normal log' },
        { timestamp: 124, level: 'error', tag: 'test', message: 'Failed to fetch https://secret-token.url/data?key=123' }
      ]
    });
    
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      verboseLogging: false
    });

    const report = await ReportBuilder.buildReport();
    
    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report.settings.verboseLogging).toBe(false);
    
    // Check sanitization
    expect(report.logs[0].message).toBe('Normal log');
    expect(report.logs[1].message).toBe('Failed to fetch [URL REDACTED]');
  });
});
