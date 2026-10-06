import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import { AppLogo } from '../src/components/ui/AppLogo';
import { Toggle, Button } from '../src/components/ui/primitives';
import { useSettingsStore, DownloadQuality } from '../src/store/settingsStore';
import { useListeningStore } from '../src/store/listeningStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { autoQueueService } from '../src/services/autoQueueService';
import { audioService } from '../src/audio/AudioService';
import { useResponsive } from '../src/hooks/useResponsive';
import { formatBytes } from '../src/utils/formatting';
import { colors, r, t } from '../src/theme/theme';
import { APP_VERSION } from '../src/version';

/** Streaming quality options, keyed by what the API expects. */
const STREAM_QUALITIES = [
  { value: 'LOSSLESS' as const, label: 'Lossless', detail: 'FLAC 24/192' },
  { value: 'HIGH' as const, label: 'High', detail: 'AAC 320' },
  { value: 'LOW' as const, label: 'Normal', detail: 'AAC 160' },
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
  const autoQueueEnabled = useListeningStore((state) => state.autoQueueEnabled);
  const setAutoQueueEnabled = useListeningStore((state) => state.setAutoQueueEnabled);
  const downloads = useDownloadStore((state) => state.downloads);
  const deleteAllDownloads = useDownloadStore((state) => state.deleteAllDownloads);

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

  const setSleep = (value: number | 'end') => {
    if (settings.audio.sleepTimerEnabled && settings.audio.sleepTimerDuration === value) {
      settings.setSleepTimerEnabled(false);
    } else {
      settings.setSleepTimerEnabled(true);
      settings.setSleepTimerDuration(value);
    }
  };

  const setSpeed = async (value: number) => {
    try {
      await audioService.setPlaybackSpeed(value);
    } catch (error) {
      console.warn('Could not apply playback speed', error);
    }
  };

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)/library');
    }
  };

  const handleClearCachePrompt = () => {
    Alert.alert(
      'Clear Cache',
      'This will delete all downloaded offline audio and artwork cache. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            void deleteAllDownloads();
          },
        },
      ],
    );
  };

  const handleResetHistoryPrompt = () => {
    // Two-step confirmation matching Coda showcase
    Alert.alert(
      'Clear Listening Data',
      'Step 1 of 2: This will reset recommendations, play counts, and recently played tracks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Reset',
              'Step 2 of 2: Are you sure? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset History',
                  style: 'destructive',
                  onPress: () => {
                    useListeningStore.getState().clearListeningData();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top Header */}
      <View style={s.header}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="chevron-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>SETTINGS</Text>
        <View style={s.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Playback & Audio */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>PLAYBACK &amp; AUDIO</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Streaming Quality</Text>
          <Text style={s.cardHint}>Select fidelity for online streaming audio.</Text>
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

        <View style={s.card}>
          <View style={s.rowBlock}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Auto-Queue</Text>
              <Text style={s.rowHint}>Keep playing similar tracks when queue finishes</Text>
            </View>
            <Toggle
              value={autoQueueEnabled}
              onChange={(next) => {
                setAutoQueueEnabled(next);
                autoQueueService.syncWithSetting();
              }}
              accessibilityLabel="Auto queue"
            />
          </View>
        </View>

        <View style={s.card}>
          <View style={s.rowBlockCol}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Sleep Timer</Text>
              <Text style={s.rowHint}>Fade out playback automatically</Text>
            </View>
            <View style={s.chipRow}>
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
                      s.chip,
                      selected && s.chipActive,
                      pressed && !selected && s.pressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Sleep timer ${option.label}`}
                  >
                    <Text style={[s.chipText, selected && s.chipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.rowBlockCol}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Playback Speed</Text>
              <Text style={s.rowHint}>Pitch corrected to original key</Text>
            </View>
            <View style={s.chipRow}>
              {SPEED_OPTIONS.map((speed) => {
                const selected = settings.audio.playbackSpeed === speed;
                return (
                  <Pressable
                    key={speed}
                    onPress={() => setSpeed(speed)}
                    hitSlop={4}
                    style={({ pressed }) => [
                      s.chip,
                      selected && s.chipActive,
                      pressed && !selected && s.pressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Playback speed ${speed} times`}
                  >
                    <Text style={[s.chipText, selected && s.chipTextActive]}>
                      {speed}×
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section 2: Downloads & Offline */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>DOWNLOADS &amp; OFFLINE</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Download Quality</Text>
          <Text style={s.cardHint}>Studio master audio requires additional storage space.</Text>
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
                    <Text style={[s.radioName, selected && s.radioNameActive]}>{meta.name}</Text>
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
              <Text style={s.rowHint}>Conserve cellular data plan while saving tracks</Text>
            </View>
            <Toggle
              value={settings.downloadWifiOnly}
              onChange={settings.setDownloadWifiOnly}
              accessibilityLabel="Download over Wi-Fi only"
            />
          </View>
        </View>

        {/* Section 3: Storage */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>STORAGE</Text>
        </View>

        <View style={s.card}>
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
              <Text style={s.statLabel}>STATUS</Text>
              <Text style={s.statValue}>
                {failedCount > 0 ? `${failedCount} Failed` : 'Optimal'}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.rowBlock}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Downloads &amp; Temp Cache</Text>
              <Text style={s.rowHint}>
                {failedCount > 0 ? `${failedCount} downloads failed · ` : ''}
                Remove offline audio files to free storage
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                variant="secondary"
                label="MANAGE"
                size="sm"
                icon="download"
                onPress={() => router.push('/downloads' as any)}
              />
              <Button
                variant="destructive"
                label="CLEAR"
                icon="trash"
                size="sm"
                onPress={handleClearCachePrompt}
              />
            </View>
          </View>
        </View>

        {/* Section 4: Privacy & Listening Data */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>PRIVACY &amp; DATA</Text>
        </View>

        <View style={s.card}>
          <View style={s.rowBlock}>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Listening History</Text>
              <Text style={s.rowHint}>Reset recommendations and play counter stats</Text>
            </View>
            <Button
              variant="secondary"
              label="RESET"
              icon="retry"
              size="sm"
              onPress={handleResetHistoryPrompt}
            />
          </View>
        </View>

        {/* Footer Brand Showcase */}
        <View style={s.footer}>
          <AppLogo size={36} showText={true} />
          <Text style={s.footerSub}>LUMA</Text>
          <Text style={s.footerVersion}>VERSION {APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
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
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...t.headline,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    gap: 14,
  },

  sectionHeader: {
    marginTop: 12,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...t.label,
    color: colors.textTertiary,
  },

  card: {
    padding: 16,
    gap: 12,
    borderRadius: r.md,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardLabel: {
    ...t.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardHint: {
    ...t.caption,
    color: colors.textTertiary,
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
    minHeight: 46,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: r.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentLabel: {
    ...t.label,
    color: colors.textPrimary,
  },
  segmentLabelActive: {
    color: colors.onAccent,
  },
  segmentDetail: {
    ...t.monoMicro,
    fontSize: 10,
    color: colors.textTertiary,
  },
  segmentDetailActive: {
    color: colors.onAccent,
    opacity: 0.85,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },

  rowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowBlockCol: {
    gap: 10,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    ...t.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowHint: {
    ...t.caption,
    color: colors.textTertiary,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: r.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    ...t.monoMicro,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.onAccent,
    fontWeight: '700',
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
    borderRadius: r.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  radioRowActive: {
    borderColor: colors.accent,
  },
  radioText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  radioName: {
    ...t.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  radioNameActive: {
    color: colors.accent,
  },
  radioDetail: {
    ...t.caption,
    color: colors.textTertiary,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },

  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    gap: 2,
    padding: 10,
    borderRadius: r.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  statLabel: {
    ...t.label,
    fontSize: 10,
    color: colors.textTertiary,
  },
  statValue: {
    ...t.monoMicro,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },

  footer: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 32,
  },
  footerSub: {
    ...t.label,
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  footerVersion: {
    ...t.monoMicro,
    fontSize: 11,
    color: colors.disabled,
  },
});
