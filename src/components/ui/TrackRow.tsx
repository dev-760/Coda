import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import Icon from './Icon';
import { colors, FONTS, r, t } from '../../theme/theme';
import { Track } from '../../providers/types';
import { useDownloadStore } from '../../downloads/downloadStore';

/**
 * The catalog row used across Collection, Home, Queue and Search.
 *
 * Tracks carry an `isActive` flag rather than each screen re-deriving playback
 * state, so a row can be rendered without pulling the playback store into
 * screens that only need the list.
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
  style,
}: {
  track: Track;
  /** Optional leading index, shown in Queue. */
  index?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onMore?: () => void;
  /** Overrides the default "Artist • Album" line. */
  meta?: string;
  style?: StyleProp<ViewStyle>;
}) {
  // Subscribed per row so a download finishing does not re-render the list.
  const isDownloaded = useDownloadStore((state) => state.downloads.some(
    (item) => item.trackId === track.id && item.status === 'completed',
  ));

  const subtitle = meta ?? [track.artist, track.album].filter(Boolean).join(' • ');

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [s.row, isActive && s.rowActive, pressed && s.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}`}
      accessibilityHint={isDownloaded ? 'Available offline' : undefined}
    >
      {index !== undefined ? (
        <View style={s.indexSlot}>
          {isActive ? (
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={13}
              color={colors.onSurface}
            />
          ) : (
            <Text style={s.index}>{index + 1}</Text>
          )}
        </View>
      ) : null}

      {track.coverUrl ? (
        <Image source={{ uri: track.coverUrl }} style={s.artwork} />
      ) : (
        <View style={[s.artwork, s.artworkFallback]}>
          <Icon name="musical-note" size={16} color={colors.outlineText} />
        </View>
      )}

      <View style={s.meta}>
        <View style={s.titleRow}>
          <Text numberOfLines={1} style={[s.title, isActive && s.titleActive]}>
            {track.title}
          </Text>
          {isDownloaded && (
            <Icon
              name="arrow-down-circle"
              size={13}
              color={colors.outlineText}
              style={s.downloadedMark}
            />
          )}
        </View>
        <Text numberOfLines={1} style={s.subtitle}>
          {subtitle}
        </Text>
      </View>

      {!!onMore && (
        <Pressable
          onPress={onMore}
          hitSlop={8}
          style={({ pressed }) => [s.more, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${track.title}`}
        >
          <Icon name="ellipsis-horizontal" size={16} color={colors.outlineText} />
        </Pressable>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: r.md,
  },
  rowActive: {
    backgroundColor: colors.surfaceContainerLow,
  },
  pressed: {
    opacity: 0.7,
  },
  indexSlot: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    ...t.labelSm,
    color: colors.outlineText,
    fontVariant: ['tabular-nums'],
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainer,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    // Catalog content, so Inter rather than the Geist chrome face.
    fontFamily: FONTS.contentSemiBold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onSurface,
    flexShrink: 1,
  },
  titleActive: {
    color: colors.onSurface,
  },
  downloadedMark: {
    flexShrink: 0,
  },
  subtitle: {
    ...t.bodyMd,
    color: colors.outlineText,
  },
  more: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});