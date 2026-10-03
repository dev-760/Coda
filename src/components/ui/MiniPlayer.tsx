import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlaybackStore } from '../../store/playbackStore';
import { useQueueStore } from '../../store/queueStore';
import { audioService } from '../../audio/AudioService';
import Icon from './Icon';
import { colors, FONTS } from '../../theme/theme';

/**
 * Subscribes to playback position on its own so the tick-driven re-render stops
 * at this leaf instead of walking the whole player.
 */
function MiniProgress({ durationMs }: { durationMs: number }) {
  const positionMs = usePlaybackStore((state) => state.positionMs);
  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <View style={s.progressTrack} pointerEvents="none">
      <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

export default function MiniPlayer() {
  const router = useRouter();
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const durationMs = usePlaybackStore((state) => state.durationMs);
  // Only the progress bar reads these, and it lives in its own component. If
  // this subscribed to them, the whole player would re-render on every tick.
  const hasNext = useQueueStore((state) => state.upcomingCount() > 0);

  const handleTogglePlay = async () => {
    if (!currentTrack) return;

    if (isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  };

  const handleNext = async () => {
    await audioService.playNextInQueue();
  };

  const handleOpenNowPlaying = () => {
    router.push('/now-playing' as any);
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <View style={s.container}>
      <Pressable
        style={({ pressed }) => [s.touchableArea, pressed && { opacity: 0.85 }]}
        onPress={handleOpenNowPlaying}
        accessibilityRole="button"
        accessibilityLabel={`Now playing: ${currentTrack.title} by ${currentTrack.artist}`}
        accessibilityHint="Opens the full screen player"
      >
        {/* Thumbnail */}
        {currentTrack.coverUrl ? (
          <Image source={{ uri: currentTrack.coverUrl }} style={s.artwork} />
        ) : (
          <View style={[s.artwork, s.artPlaceholder]}>
            <Icon name="musical-notes" size={20} color={colors.onSurfaceVariant} />
          </View>
        )}

        {/* Info */}
        <View style={s.info}>
          <Text numberOfLines={1} style={s.title}>
            {currentTrack.title}
          </Text>
          <Text numberOfLines={1} style={s.artist}>
            {currentTrack.artist}
          </Text>
        </View>
      </Pressable>

      {/* Controls with accessible 44px+ hit areas and scale response */}
      <View style={s.controls}>
        <Pressable
          onPress={handleTogglePlay}
          style={({ pressed }) => [s.controlBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={24} color={colors.onSurface} />
        </Pressable>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [s.controlBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          disabled={!hasNext}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          accessibilityState={{ disabled: !hasNext }}
        >
          <Icon
            name="play-skip-forward"
            size={22}
            color={hasNext ? colors.onSurface : '#4A5463'}
          />
        </Pressable>
      </View>

      <MiniProgress durationMs={durationMs} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.surfaceContainerHighest,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
  },
  touchableArea: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHigh,
  },
  artPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  artist: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  controlBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

