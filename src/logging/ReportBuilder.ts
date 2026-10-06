import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLogStore } from '../store/logStore';
import { useSettingsStore } from '../store/settingsStore';
import { APP_VERSION } from '../version';

export const REPORT_SCHEMA_VERSION = '4.4.0';

// Full URLs can carry signed stream tokens, so they are stripped from both the
// message and the structured data before a report leaves the device.
const URL_PATTERN = /https?:\/\/[^\s"']+/g;

function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(URL_PATTERN, '[URL REDACTED]');
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v)]),
    );
  }
  return value;
}

export interface CodaReport {
  schemaVersion: string;
  timestamp: string;
  appVersion: string;
  platform: {
    os: string;
    version: string | number;
  };
  settings: {
    verboseLogging: boolean;
  };
  logs: any[];
}

export class ReportBuilder {
  static async buildReport(): Promise<CodaReport> {
    const settings = useSettingsStore.getState();
    const logs = useLogStore.getState().entries;

    const sanitizedLogs = logs.map(log => ({
      ...log,
      message: redact(log.message),
      data: redact(log.data),
    }));

    return {
      schemaVersion: REPORT_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      platform: {
        os: Platform.OS,
        version: Platform.Version,
      },
      settings: {
        verboseLogging: settings.verboseLogging,
      },
      logs: sanitizedLogs,
    };
  }

  static async exportReport(): Promise<boolean> {
    try {
      const report = await this.buildReport();
      const json = JSON.stringify(report, null, 2);
      
      const filename = `coda_diagnostic_${Date.now()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Coda Diagnostics',
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to export report:', e);
      return false;
    }
  }
}
