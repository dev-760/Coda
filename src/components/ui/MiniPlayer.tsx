import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlaybackStore } from '../../store/playbackStore';
import { useQueueStore } from '../../store/queueStore';
import { audioService } from '../../audio/AudioService';
import Icon from './Icon';
import CoverThumb from './CoverThumb';
import { LevelMeter } from './LevelMeter';
import { colors, r, t } from '../../theme/theme';

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
    <View style={s.dockWrapper}>
      <View style={s.container}>
        <Pressable
          style={({ pressed }) => [s.touchableArea, pressed && { opacity: 0.85 }]}
          onPress={handleOpenNowPlaying}
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${currentTrack.title} by ${currentTrack.artist}. Double tap to open player.`}
        >
          {/* 40px Thumbnail with glow when playing */}
          <CoverThumb
            uri={currentTrack.coverUrl}
            size={40}
            borderRadius={8}
            glow={isPlaying}
          />

          {/* Titles */}
          <View style={s.info}>
            <Text numberOfLines={1} style={s.title}>
              {currentTrack.title}
            </Text>
            <Text numberOfLines={1} style={s.artist}>
              {currentTrack.artist}
            </Text>
          </View>
        </Pressable>

        {/* Level meter when playing */}
        {isPlaying && (
          <View style={s.meterWrapper}>
            <LevelMeter isPlaying={isPlaying} height={14} barWidth={3} gap={2} />
          </View>
        )}

        {/* Controls */}
        <View style={s.controls}>
          <Pressable
            onPress={handleTogglePlay}
            style={({ pressed }) => [s.controlBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={22} color={colors.accent} />
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
              name="skip-next"
              size={20}
              color={hasNext ? colors.onSurface : colors.disabled}
            />
          </Pressable>
        </View>

        <MiniProgress durationMs={durationMs} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dockWrapper: {
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  container: {
    height: 64,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: r.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  touchableArea: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...t.bodyStrong,
    color: colors.onSurface,
  },
  artist: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  meterWrapper: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.full,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.divider,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
  },
});
