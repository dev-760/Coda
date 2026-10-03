import React, { useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import HeaderBar from '../src/components/ui/HeaderBar';
import { useSettingsStore, DownloadQuality } from '../src/store/settingsStore';
import { useListeningStore } from '../src/store/listeningStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { autoQueueService } from '../src/services/autoQueueService';
import { formatBytes } from '../src/utils/formatting';
import { colors, FONTS } from '../src/theme/theme';

const DOWNLOAD_QUALITY_OPTIONS: DownloadQuality[] = ['LOSSLESS', 'HIGH', 'LOW'];

const DOWNLOAD_QUALITY_LABELS: Record<DownloadQuality, string> = {
  LOSSLESS: 'Lossless (FLAC). Best quality, largest files.',
  HIGH: 'High (AAC). Good quality, smaller files.',
  LOW: 'Data saver. Lowest quality, smallest files.',
};

const Switch = ({ value, onValueChange }: { value: boolean, onValueChange: (v: boolean) => void }) => (
  <Pressable
    onPress={() => onValueChange(!value)}
    style={[s.toggle, value && s.toggleOn]}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
    hitSlop={8}
  >
    <View style={[s.toggleKnob, value && s.toggleKnobOn]} />
  </Pressable>
);

type SettingItemProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  type: 'toggle' | 'navigate' | 'info';
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
};

const SettingItem = ({
  title,
  subtitle,
  icon,
  type,
  value,
  onValueChange,
  onPress,
  danger,
}: SettingItemProps) => {
  return (
    <Pressable 
      style={s.settingItem}
      onPress={onPress}
      disabled={type === 'toggle'}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        {icon && (
          <View style={s.iconContainer}>
            <Icon name={icon} size={20} color={danger ? '#ff453a' : colors.onSurface} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.settingTitle, danger && { color: '#ff453a' }]}>{title}</Text>
          {subtitle && (
            <Text style={[s.settingSubtitle, danger && { color: '#ff453a' }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      
      {type === 'toggle' ? (
        <Switch value={value ?? false} onValueChange={onValueChange ?? (() => {})} />
      ) : type !== 'info' ? (
        <Icon name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
      ) : null}
    </Pressable>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const {
    audio,
    setSleepTimerEnabled,
    downloadQuality,
    setDownloadQuality,
    downloadWifiOnly,
    setDownloadWifiOnly,
  } = useSettingsStore();
  const autoQueueEnabled = useListeningStore((state) => state.autoQueueEnabled);
  const setAutoQueueEnabled = useListeningStore((state) => state.setAutoQueueEnabled);
  const clearListeningData = useListeningStore((state) => state.clearListeningData);
  const downloads = useDownloadStore((state) => state.downloads);
  const clearAllDownloads = useDownloadStore((state) => state.deleteAllDownloads);

  const [downloadQualityMenuOpen, setDownloadQualityMenuOpen] = useState(false);

  const storageUsed = useMemo(() => {
    const bytes = downloads
      .filter((item) => item.status === 'completed')
      .reduce((total, item) => total + (item.totalBytes || 0), 0);
    return bytes > 0 ? formatBytes(bytes) : 'No downloads yet';
  }, [downloads]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <HeaderBar showBack title="Settings" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* PLAYBACK */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>PLAYBACK</Text>
          <View style={s.section}>
            <SettingItem
              title="Audio"
              subtitle="Quality, playback speed, sleep timer, auto-queue"
              icon="musical-notes"
              type="navigate"
              onPress={() => router.push('/audio-settings' as any)}
            />
            <SettingItem
              title="Sleep timer"
              subtitle={
                audio.sleepTimerEnabled
                  ? audio.sleepTimerDuration === 'end'
                    ? 'End of current track'
                    : `${audio.sleepTimerDuration} minutes`
                  : 'Off'
              }
              icon="time-outline"
              type="toggle"
              value={audio.sleepTimerEnabled}
              onValueChange={setSleepTimerEnabled}
            />
            <SettingItem
              title="Downloads"
              subtitle="Manage music saved on this device"
              icon="cloud-download-outline"
              type="navigate"
              onPress={() => router.push('/downloads' as any)}
            />
            <SettingItem
              title="Auto-queue"
              subtitle="Keep playing suggestions when the queue runs low"
              icon="repeat"
              type="toggle"
              value={autoQueueEnabled}
              onValueChange={(value) => {
                setAutoQueueEnabled(value);
                autoQueueService.syncWithSetting();
              }}
            />
          </View>
        </View>

        {/* OFFLINE & DOWNLOADS */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>DOWNLOADS</Text>
          <View style={s.section}>
            <SettingItem
              title="Download quality"
              subtitle={DOWNLOAD_QUALITY_LABELS[downloadQuality]}
              icon="cloud-download-outline"
              type="navigate"
              onPress={() => setDownloadQualityMenuOpen(true)}
            />
            <SettingItem
              title="Download over Wi-Fi only"
              subtitle={
                downloadWifiOnly
                  ? 'Downloads wait for Wi-Fi'
                  : 'Downloads can use mobile data'
              }
              icon="wifi-outline"
              type="toggle"
              value={downloadWifiOnly}
              onValueChange={setDownloadWifiOnly}
            />
            <SettingItem
              title="Storage used"
              subtitle={storageUsed}
              icon="disc-outline"
              type="info"
            />
            <Pressable
              style={({ pressed }) => [s.dangerButton, pressed && { opacity: 0.6 }]}
              onPress={() => {
                Alert.alert(
                  'Clear all downloads',
                  'This removes every downloaded track from this device. Your playlists are not affected.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete all', style: 'destructive', onPress: () => void clearAllDownloads() },
                  ],
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="Delete all downloads"
            >
              <Text style={s.dangerText}>Delete all downloads</Text>
            </Pressable>
          </View>
        </View>

        {/* LISTENING DATA */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>YOUR DATA</Text>
          <View style={s.section}>
            <SettingItem
              title="Clear listening data"
              subtitle="Removes play counts, skips, and history used for suggestions"
              icon="trash-outline"
              type="info"
              onPress={() => {
                Alert.alert(
                  'Clear listening data',
                  'Suggestions start over from nothing until you play or favorite something.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: clearListeningData },
                  ],
                );
              }}
            />
          </View>
        </View>

        {/* DEVELOPER */}
        <View style={s.sectionWrap}>
          <Text style={s.sectionHeader}>DEVELOPER</Text>
          <View style={s.section}>
            <SettingItem
              title="Developer options"
              subtitle="Diagnostics and logs"
              icon="code-slash-outline"
              type="navigate"
              onPress={() => router.push('/dev-options' as any)}
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={downloadQualityMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDownloadQualityMenuOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setDownloadQualityMenuOpen(false)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <Text style={s.modalTitle}>Download quality</Text>
            {DOWNLOAD_QUALITY_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={({ pressed }) => [s.modalOption, pressed && { opacity: 0.6 }]}
                onPress={() => {
                  setDownloadQuality(option);
                  setDownloadQualityMenuOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={DOWNLOAD_QUALITY_LABELS[option]}
                accessibilityState={{ selected: downloadQuality === option }}
              >
                <Text
                  style={[
                    s.modalOptionText,
                    downloadQuality === option && s.modalOptionTextSelected,
                  ]}
                >
                  {DOWNLOAD_QUALITY_LABELS[option]}
                </Text>
                {downloadQuality === option && (
                  <Icon name="checkmark" size={18} color={colors.accent} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 24,
  },
  accountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  accountPlan: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 2,
    fontWeight: '600',
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3a3a3c',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.accent,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.onSurface,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  signOut: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff453a',
  },
  dangerButton: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff453a',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 8,
    gap: 12,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 20,
  },
  modalOptionTextSelected: {
    color: colors.accent,
  },
});
