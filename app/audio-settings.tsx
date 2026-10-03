import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import { colors, FONTS } from '../src/theme/theme';
import { COLORS } from '../src/theme/theme';
import { useSettingsStore } from '../src/store/settingsStore';
import { useListeningStore } from '../src/store/listeningStore';
import { audioService } from '../src/audio/AudioService';
import { autoQueueService } from '../src/services/autoQueueService';
import { AudioQuality } from '../src/config/hifiApi';

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const SLEEP_TIMER_OPTIONS: { value: number | 'end'; label: string }[] = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 'end', label: 'End of current track' },
];

const AUDIO_QUALITIES: { value: AudioQuality; label: string; description: string }[] = [
  { value: 'LOSSLESS', label: 'Lossless', description: 'FLAC, best quality, uses more data' },
  { value: 'HIGH', label: 'High', description: 'AAC, good quality, less data' },
  { value: 'LOW', label: 'Data saver', description: 'Lowest quality, smallest downloads' },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {description ? <Text style={s.sectionDescription}>{description}</Text> : null}
      {children}
    </View>
  );
}

function OptionRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.optionRow, selected && s.optionRowSelected, pressed && s.pressed]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <View style={s.optionText}>
        <Text style={[s.optionLabel, selected && s.optionLabelSelected]}>{label}</Text>
        {description ? <Text style={s.optionDescription}>{description}</Text> : null}
      </View>
      {selected && <Icon name="checkmark" size={20} color={COLORS.accent} />}
    </Pressable>
  );
}

export default function AudioSettingsScreen() {
  const router = useRouter();
  const {
      audio,
      setSleepTimerEnabled,
      setSleepTimerDuration,
      setHifiAudioQuality,
    } = useSettingsStore();
  const autoQueueEnabled = useListeningStore((state) => state.autoQueueEnabled);
  const setAutoQueueEnabled = useListeningStore((state) => state.setAutoQueueEnabled);

  const handleSpeed = (speed: number) => {
    void audioService.setPlaybackSpeed(speed);
  };

  const handleAutoQueue = (enabled: boolean) => {
    setAutoQueueEnabled(enabled);
    autoQueueService.syncWithSetting();
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.headerBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="chevron-back" size={24} color={COLORS.onSurface} />
        </Pressable>
        <Text style={s.headerTitle}>Audio</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Section
          title="Quality"
          description="Applies to streaming. Downloads use the quality set in Settings."
        >
          {AUDIO_QUALITIES.map((quality) => (
            <OptionRow
              key={quality.value}
              label={quality.label}
              description={quality.description}
              selected={audio.hifiAudioQuality === quality.value}
              onPress={() => setHifiAudioQuality(quality.value)}
            />
          ))}
        </Section>

        <Section title="Playback speed" description="Pitch is corrected to the original key.">
          <View style={s.chipRow}>
            {PLAYBACK_SPEEDS.map((speed) => (
              <Pressable
                key={speed}
                onPress={() => handleSpeed(speed)}
                style={({ pressed }) => [
                  s.chip,
                  audio.playbackSpeed === speed && s.chipSelected,
                  pressed && s.pressed,
                ]}
                accessibilityRole="radio"
                accessibilityLabel={`${speed} times`}
                accessibilityState={{ selected: audio.playbackSpeed === speed }}
              >
                <Text
                  style={[
                    s.chipText,
                    audio.playbackSpeed === speed && s.chipTextSelected,
                  ]}
                >
                  {speed.toFixed(2).replace(/0$/, '')}x
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section
          title="Sleep timer"
          description="Playback stops when the timer runs out. Cancelled if you pause first."
        >
          <OptionRow
            label="Off"
            selected={!audio.sleepTimerEnabled}
            onPress={() => setSleepTimerEnabled(false)}
          />
          {SLEEP_TIMER_OPTIONS.map((option) => (
            <OptionRow
              key={String(option.value)}
              label={option.label}
              selected={audio.sleepTimerEnabled && audio.sleepTimerDuration === option.value}
              onPress={() => {
                setSleepTimerDuration(option.value);
                setSleepTimerEnabled(true);
              }}
            />
          ))}
        </Section>

        <Section
          title="Auto-queue"
          description="Adds suggestions when fewer than 3 tracks are left, so playback does not stop early."
        >
          <Pressable
            style={({ pressed }) => [s.toggleRow, pressed && s.pressed]}
            onPress={() => handleAutoQueue(!autoQueueEnabled)}
            accessibilityRole="switch"
            accessibilityLabel="Auto-queue"
            accessibilityState={{ checked: autoQueueEnabled }}
          >
            <Text style={s.optionLabel}>{autoQueueEnabled ? 'On' : 'Off'}</Text>
            <View style={[s.switchTrack, autoQueueEnabled && s.switchTrackOn]}>
              <View style={[s.switchThumb, autoQueueEnabled && s.switchThumbOn]} />
            </View>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(0, 229, 191, 0.08)',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    color: COLORS.onSurface,
  },
  optionLabelSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: 64,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 229, 191, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.onSurface,
  },
  chipTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  switchTrack: {
    width: 48,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3a3a3c',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: COLORS.accent,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.onSurface,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  pressed: {
    opacity: 0.6,
  },
});
