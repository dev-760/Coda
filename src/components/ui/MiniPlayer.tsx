import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlaybackStore } from '../../store/playbackStore';
import { useQueueStore } from '../../store/queueStore';
import { audioService } from '../../audio/AudioService';
import Icon from './Icon';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentTrack, isPlaying, positionMs, durationMs } = usePlaybackStore();
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

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <View style={s.container}>
      <Pressable
        style={s.touchableArea}
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
            <Icon name="musical-notes" size={20} color="#8e8e93" />
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

      {/* Controls */}
      <View style={s.controls}>
        <Pressable
          onPress={handleTogglePlay}
          style={s.controlBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={24} color="#ffffff" />
        </Pressable>
        <Pressable
          onPress={handleNext}
          style={s.controlBtn}
          hitSlop={8}
          disabled={!hasNext}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          accessibilityState={{ disabled: !hasNext }}
        >
          <Icon
            name="play-skip-forward"
            size={22}
            color={hasNext ? '#ffffff' : '#5a5a5e'}
          />
        </Pressable>
      </View>

      <View style={s.progressTrack} pointerEvents="none">
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#1c1c1e',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2c2c2e',
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
    backgroundColor: '#2c2c2e',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#ffffff',
  },
  touchableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  artwork: {
    width: 42,
    height: 42,
    borderRadius: 4,
    backgroundColor: '#262626',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  artist: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 4,
  },
  controlBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
