import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import { Toggle } from '../src/components/ui/primitives';
import { useSettingsStore, DownloadQuality } from '../src/store/settingsStore';
import { useListeningStore } from '../src/store/listeningStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { downloadStorage } from '../src/downloads/downloadStorage';
import { autoQueueService } from '../src/services/autoQueueService';
import { audioService } from '../src/audio/AudioService';
import { useResponsive } from '../src/hooks/useResponsive';
import { formatBytes } from '../src/utils/formatting';
import { colors, r, t } from '../src/theme/theme';
import { APP_VERSION } from '../src/version';

/** Streaming quality options, keyed by what the API expects. */
const STREAM_QUALITIES = [
  { value: 'LOSSLESS' as const, label: 'Lossless', detail: 'FLAC 24-bit / 192 kHz' },
  { value: 'HIGH' as const, label: 'High', detail: 'AAC 320 kbps' },
  { value: 'LOW' as const, label: 'Normal', detail: 'AAC 160 kbps' },
] as const;

const DOWNLOAD_QUALITY_OPTIONS: DownloadQuality[] = ['LOSSLESS', 'HIGH', 'LOW'];

const DOWNLOAD_QUALITY_LABELS: Record<DownloadQuality, { name: string; detail: string }> = {
  LOSSLESS: { name: 'Lossless', detail: 'FLAC 24-bit studio master' },
  HIGH: { name: 'High', detail: 'AAC 320 kbps compressed' },
  LOW: { name: 'Normal', detail: 'AAC 160 kbps compact' },
};

const SLEEP_OPTIONS: { value: number | 'end'; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 'end', label: 'End of track' },
];

/** Playback speeds, matching the steps the audio backend supports. */
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { bottomBarClearance } = useResponsive();
  const settings = useSettingsStore();
  const downloads = useDownloadStore((state) => state.downloads);
  const deleteAllDownloads = useDownloadStore((state) => state.deleteAllDownloads);

  const [freeStorageBytes, setFreeStorageBytes] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void downloadStorage.getFreeStorageBytes().then((bytes) => {
      if (active && bytes > 0) {
        setFreeStorageBytes(bytes);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const totalBytes = useMemo(
    () => downloads.reduce((sum, item) => sum + (item.downloadedBytes || 0), 0),
    [downloads],
  );
  const completedCount = useMemo(
    () => downloads.filter((item) => item.status === 'completed').length,
    [downloads],
  );
  const failedCount = useMemo(
    () => downloads.filter((item) => item.status === 'failed').length,
    [downloads],
  );

  const usedGb = totalBytes / 1_000_000_000;
  const freeGb = freeStorageBytes !== null ? freeStorageBytes / 1_000_000_000 : null;
  const totalCapacityGb = freeStorageBytes !== null ? (totalBytes + freeStorageBytes) / 1_000_000_000 : null;
  const usedPercent = totalCapacityGb && totalCapacityGb > 0
    ? Math.min(1, usedGb / totalCapacityGb)
    : 0;

  const setSleep = (value: number | 'end') => {
    settings.setSleepTimerEnabled(true);
    settings.setSleepTimerDuration(value);
  };

  const setSpeed = async (value: number) => {
    try {
      await audioService.setPlaybackSpeed(value);
    } catch (error) {
      console.warn('Could not apply playback speed', error);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top Header with Back button for safe navigation */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={s.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]} showsVerticalScrollIndicator={false}>
        {/* Playback and audio */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>PLAYBACK &amp; AUDIO</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Streaming Quality</Text>
          <Text style={s.cardHint}>Select fidelity for streaming audio.</Text>
          <View style={s.segmentRow}>
            {STREAM_QUALITIES.map((option) => {
              const selected = settings.audio.hifiAudioQuality === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => settings.setHifiAudioQuality(option.value)}
                  style={({ pressed }) => [
                    s.segment,
                    selected && s.segmentActive,
                    pressed && !selected && s.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${option.label}, ${option.detail}`}
                >
                  <Text style={[s.segmentLabel, selected && s.segmentLabelActive]}>
                    {option.label}
                  </Text>
                  <Text style={[s.segmentDetail, selected && s.segmentDetailActive]}>
                    {option.detail}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.rowBlock}>
          <View style={s.rowText}>
            <Text style={s.rowLabel}>Auto-Queue</Text>
            <Text style={s.rowHint}>Keep playing similar tracks when queue ends</Text>
          </View>
          <Toggle
            value={useListeningStore.getState().autoQueueEnabled}
            onChange={(next) => {
              useListeningStore.setState({ autoQueueEnabled: next });
              autoQueueService.syncWithSetting();
            }}
            accessibilityLabel="Auto queue"
          />
        </View>

        <View style={s.divider} />

        <View style={s.rowBlock}>
          <View style={s.rowText}>
            <Text style={s.rowLabel}>Sleep Timer</Text>
            <Text style={s.rowHint}>Fade out playback automatically</Text>
          </View>
          <View style={s.sleepRow}>
            {SLEEP_OPTIONS.map((option) => {
              const selected =
                settings.audio.sleepTimerEnabled &&
                settings.audio.sleepTimerDuration === option.value;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => setSleep(option.value)}
                  hitSlop={4}
                  style={({ pressed }) => [
                    s.sleepPill,
                    selected && s.sleepPillActive,
                    pressed && !selected && s.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Sleep timer ${option.label}`}
                >
                  <Text style={[s.sleepText, selected && s.sleepTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.rowBlock}>
          <View style={s.rowText}>
            <Text style={s.rowLabel}>Playback Speed</Text>
            <Text style={s.rowHint}>Pitch is corrected to the original key</Text>
          </View>
          <View style={s.sleepRow}>
            {SPEED_OPTIONS.map((speed) => {
              const selected = settings.audio.playbackSpeed === speed;
              return (
                <Pressable
                  key={speed}
                  onPress={() => setSpeed(speed)}
                  hitSlop={4}
                  style={({ pressed }) => [
                    s.sleepPill,
                    selected && s.sleepPillActive,
                    pressed && !selected && s.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Playback speed ${speed} times`}
                >
                  <Text style={[s.sleepText, selected && s.sleepTextActive]}>
                    {speed}×
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.divider} />

        {/* Downloads and offline */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>DOWNLOADS &amp; OFFLINE</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Download Quality</Text>
          <Text style={s.cardHint}>Higher fidelity requires more storage space.</Text>
          <View style={s.radioGroup}>
            {DOWNLOAD_QUALITY_OPTIONS.map((quality) => {
              const selected = settings.downloadQuality === quality;
              const meta = DOWNLOAD_QUALITY_LABELS[quality];
              return (
                <Pressable
                  key={quality}
                  onPress={() => settings.setDownloadQuality(quality)}
                  style={({ pressed }) => [
                    s.radioRow,
                    selected && s.radioRowActive,
                    pressed && !selected && s.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${meta.name}. ${meta.detail}`}
                >
                  <View style={s.radioText}>
                    <Text style={s.radioName}>{meta.name}</Text>
                    <Text style={s.radioDetail}>{meta.detail}</Text>
                  </View>
                  <View style={[s.radioDot, selected && s.radioDotActive]}>
                    {selected && <View style={s.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.card}>
          <View style={s.rowBlock}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Download over Wi-Fi only</Text>
              <Text style={s.rowHint}>Conserve cellular data while downloading</Text>
            </View>
            <Toggle
              value={settings.downloadWifiOnly}
              onChange={settings.setDownloadWifiOnly}
              accessibilityLabel="Download over Wi-Fi only"
            />
          </View>
        </View>

        {/* Storage */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>STORAGE</Text>
        </View>

        <View style={s.card}>
          <View style={s.rowBlock}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Storage Used</Text>
              <Text style={s.rowHint}>
                {formatBytes(totalBytes)} music stored
                {failedCount > 0 ? ` • ${failedCount} failed` : ''}
              </Text>
            </View>
            <Text style={s.storageValue}>
              {usedGb < 0.1 ? `${(totalBytes / 1_000_000).toFixed(0)} MB` : `${usedGb.toFixed(1)} GB`}
              {totalCapacityGb !== null && (
                <Text style={s.storageUnit}> / {totalCapacityGb.toFixed(0)} GB</Text>
              )}
            </Text>
          </View>

          {totalCapacityGb !== null && (
            <View style={s.meterTrack}>
              <View style={[s.meterFill, { width: `${Math.max(1, usedPercent * 100)}%` }]} />
            </View>
          )}

          <View style={s.statRow}>
            <View style={s.statCell}>
              <Text style={s.statLabel}>AUDIO</Text>
              <Text style={s.statValue}>{formatBytes(totalBytes)}</Text>
            </View>
            <View style={s.statCell}>
              <Text style={s.statLabel}>TRACKS</Text>
              <Text style={s.statValue}>{completedCount}</Text>
            </View>
            <View style={s.statCell}>
              <Text style={s.statLabel}>FREE SPACE</Text>
              <Text style={s.statValue}>
                {freeGb !== null ? `${freeGb.toFixed(1)} GB` : 'Available'}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.rowBlock}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Downloads &amp; Temp Cache</Text>
              <Text style={s.rowHint}>Downloaded audio files and artwork cache</Text>
            </View>
            <Pressable
              onPress={deleteAllDownloads}
              hitSlop={8}
              style={({ pressed }) => [s.cacheButton, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Clear downloaded files"
            >
              <Text style={s.cacheText}>Clear{'\n'}Cache</Text>
              <Text style={s.cacheSize}>{formatBytes(totalBytes)}</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerName}>LUMA</Text>
          <Text style={s.footerVersion}>Version {APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...t.title,
    color: colors.onSurface,
  },
  headerPlaceholder: {
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },

  sectionHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    ...t.labelSm,
    color: colors.outlineText,
    letterSpacing: 0.8,
  },

  card: {
    padding: 14,
    gap: 10,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  cardLabel: {
    ...t.titleMd,
    color: colors.onSurface,
  },
  cardHint: {
    ...t.bodySm,
    color: colors.outlineText,
    marginTop: -4,
  },

  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  segmentActive: {
    backgroundColor: colors.onSurface,
  },
  segmentLabel: {
    ...t.labelMd,
    color: colors.onSurface,
  },
  segmentLabelActive: {
    color: colors.onPrimary,
  },
  segmentDetail: {
    ...t.micro,
    color: colors.outlineText,
  },
  segmentDetailActive: {
    color: colors.onPrimary,
    opacity: 0.7,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },

  rowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    ...t.titleMd,
    color: colors.onSurface,
  },
  rowHint: {
    ...t.bodySm,
    color: colors.outlineText,
    lineHeight: 16,
  },
  sleepRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sleepPill: {
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerLow,
  },
  sleepPillActive: {
    backgroundColor: colors.onSurface,
  },
  sleepText: {
    ...t.micro,
    color: colors.onSurfaceVariant,
  },
  sleepTextActive: {
    color: colors.onPrimary,
  },

  radioGroup: {
    gap: 8,
    marginTop: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    padding: 12,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  radioRowActive: {
    backgroundColor: colors.surfaceContainerLow,
  },
  radioText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  radioName: {
    ...t.titleMd,
    color: colors.onSurface,
  },
  radioDetail: {
    ...t.bodySm,
    color: colors.outlineText,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotActive: {
    borderColor: colors.onSurface,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.onSurface,
  },

  storageValue: {
    ...t.title,
    color: colors.onSurface,
  },
  storageUnit: {
    ...t.bodySm,
    color: colors.outlineText,
  },
  meterTrack: {
    height: 6,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  meterFill: {
    height: 6,
    borderRadius: r.pill,
    backgroundColor: colors.onSurface,
  },

  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    gap: 2,
    padding: 10,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  statLabel: {
    ...t.micro,
    color: colors.outlineText,
  },
  statValue: {
    ...t.labelMd,
    color: colors.onSurface,
  },

  cacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  cacheText: {
    ...t.micro,
    color: colors.onSurface,
    lineHeight: 12,
  },
  cacheSize: {
    ...t.micro,
    color: colors.outlineText,
  },

  footer: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 24,
  },
  footerName: {
    ...t.labelSm,
    color: colors.outlineText,
  },
  footerVersion: {
    ...t.micro,
    color: colors.outlineText,
  },
});
