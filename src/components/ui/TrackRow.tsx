import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import Icon from './Icon';
import CoverThumb from './CoverThumb';
import { LevelMeter } from './LevelMeter';
import { colors, r, t } from '../../theme/theme';
import { Track } from '../../providers/types';
import { useDownloadStore } from '../../downloads/downloadStore';

/**
 * The catalog track row faithfully built from the Luma Design System showcase:
 * - 64px row height
 * - Level meter on playing track
 * - 48px cover artwork with glow when playing
 * - Monoline indicator icons (download, more)
 * - Tabular mono-micro duration
 */
export function TrackRow({
  track,
  index,
  isActive = false,
  isPlaying = false,
  onPress,
  onLongPress,
  onMore,
  meta,
  showHandle = false,
  showArt = true,
  disabled = false,
  style,
}: {
  track: Track;
  index?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onMore?: () => void;
  meta?: string;
  showHandle?: boolean;
  showArt?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDownloaded = useDownloadStore((state) =>
    state.downloads.some((item) => item.trackId === track.id && item.status === 'completed'),
  );

  const durationStr = meta ?? (track.durationMs ? formatTrackDuration(track.durationMs) : '');

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.row,
        isActive && s.rowActive,
        disabled && s.rowDisabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${isActive ? 'Now playing, ' : ''}${track.title} by ${track.artist}`}
    >
      {showHandle && (
        <View style={s.handleSlot}>
          <Icon name="drag-handle" size={18} color={colors.textTertiary} />
        </View>
      )}

      {index !== undefined && (
        <View style={s.indexSlot}>
          {isActive ? (
            <LevelMeter isPlaying={isPlaying} height={14} barWidth={3} gap={2} />
          ) : (
            <Text style={s.indexText}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          )}
        </View>
      )}

      {showArt && (
        <CoverThumb
          uri={track.coverUrl}
          size={44}
          borderRadius={8}
          glow={isActive}
        />
      )}

      <View style={s.metaSlot}>
        <Text
          numberOfLines={1}
          style={[
            isActive ? t.bodyStrong : t.body,
            { color: disabled ? colors.disabled : colors.onSurface },
          ]}
        >
          {track.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            t.caption,
            { color: disabled ? colors.disabled : colors.onSurfaceVariant },
          ]}
        >
          {disabled ? `${track.artist} · Unavailable offline` : track.artist}
        </Text>
      </View>

      {isDownloaded && !disabled && (
        <View style={s.indicatorSlot}>
          <Icon name="download-done" size={16} color={colors.accent} />
        </View>
      )}

      {!!durationStr && (
        <Text style={[s.durationText, disabled && { color: colors.disabled }]}>
          {durationStr}
        </Text>
      )}

      {!!onMore && !disabled && (
        <Pressable
          onPress={onMore}
          hitSlop={8}
          style={({ pressed }) => [s.moreBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${track.title}`}
        >
          <Icon name="more" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

function formatTrackDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: r.md,
  },
  rowActive: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
  handleSlot: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  metaSlot: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  indicatorSlot: {
    paddingHorizontal: 4,
  },
  durationText: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  moreBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});