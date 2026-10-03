import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import { usePlaybackStore } from '../src/store/playbackStore';
import { audioService } from '../src/audio/AudioService';
import { useQueueStore } from '../src/store/queueStore';
import { useLibraryStore } from '../src/store/libraryStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, FONTS } from '../src/theme/theme';

export default function NowPlayingScreen() {
  const router = useRouter();
  const { gutter, artworkSize } = useResponsive();
  const artSize = artworkSize(340);
  const { currentTrack, isPlaying, positionMs, durationMs, error, isLoading } = usePlaybackStore();
  const { addFavorite, removeFavorite, isFavorite } = useLibraryStore();
  const isDownloaded = useDownloadStore((state) =>
    currentTrack ? state.isTrackDownloaded(currentTrack.id) : false,
  );
  const downloadInfo = useDownloadStore((state) =>
    currentTrack ? state.getDownloadStatus(currentTrack.id) : null,
  );
  const { shuffle, toggleShuffle, repeat, setRepeat } = useQueueStore();
  const hasNext = useQueueStore((state) => state.upcomingCount() > 0);
  const hasPrevious = useQueueStore((state) => state.currentIndex > 0);

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [scrubWidth, setScrubWidth] = useState(0);

  const track = currentTrack;
  const liked = track ? isFavorite(track.id) : false;

  const formatMs = (ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

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

  const handlePrev = async () => {
    await audioService.playPrevious();
  };

  const handleToggleFavorite = async () => {
    if (!track) return;
    if (liked) {
      await removeFavorite(track.id);
    } else {
      await addFavorite(track);
    }
  };

  const handleRepeatToggle = () => {
    if (repeat === 'off') setRepeat('all');
    else if (repeat === 'all') setRepeat('one');
    else setRepeat('off');
  };

  const effectiveDuration = durationMs;
  const progressPercent =
    effectiveDuration > 0 ? Math.min(100, Math.max(0, (positionMs / effectiveDuration) * 100)) : 0;

  const handleSeek = (locationX: number) => {
    if (effectiveDuration > 0 && scrubWidth > 0) {
      const percentage = Math.max(0, Math.min(1, locationX / scrubWidth));
      void audioService.seekTo(percentage * effectiveDuration);
    }
  };

  if (!track) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>Nothing playing</Text>
          <Text style={s.emptyBody}>
            Pick a track from Home or your collection and it will show up here.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={s.emptyButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={s.emptyButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const audioQualityLabel = isDownloaded
    ? `${downloadInfo?.format ? downloadInfo.format.toUpperCase() : 'FLAC'} • OFFLINE`
    : 'LOSSLESS • HI-RES';

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Top Header with Chevron Down */}
      <View style={s.topHeader}>
        <View style={{ width: 44 }} />
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.chevronBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <Icon name="chevron-down" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={{ width: 44 }} />
      </View>

      {/* Main Content Area */}
      <View style={[s.content, { paddingHorizontal: gutter }]}>
        {/* Large Artwork */}
        <View style={[s.artworkWrap, { width: artSize, height: artSize }]}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={s.artwork} />
          ) : (
            <View style={[s.artwork, s.artPlaceholder]}>
              <Icon name="musical-notes" size={96} color={colors.onSurfaceVariant} />
            </View>
          )}
        </View>

        {/* Title, Subtitle, Quality Pill and Heart Row */}
        <View style={s.metaRow}>
          <View style={s.titleCol}>
            <Text numberOfLines={1} style={s.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={s.trackArtist}>{track.artist}</Text>
            <View style={s.techBadgeRow}>
              <View style={s.qualityPill}>
                <Text style={s.qualityPillText}>{audioQualityLabel}</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={handleToggleFavorite}
            style={({ pressed }) => [s.heartBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityState={{ selected: liked }}
          >
            <Icon name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? colors.accent : colors.onSurface} />
          </Pressable>
        </View>

        {/* Scrubber / Progress Bar */}
        <View style={s.scrubberContainer}>
          <Pressable
            style={s.scrubTouchArea}
            onLayout={(e) => setScrubWidth(e.nativeEvent.layout.width)}
            onPress={(e) => handleSeek(e.nativeEvent.locationX)}
            accessibilityRole="adjustable"
            accessibilityLabel="Playback position"
          >
            <View style={s.scrubTrack}>
              <View style={[s.scrubFill, { width: `${progressPercent}%` }]} />
            </View>
          </Pressable>
          <View style={s.timeRow}>
            <Text style={s.timeText}>{formatMs(positionMs)}</Text>
            <Text style={s.timeText}>{formatMs(effectiveDuration)}</Text>
          </View>
        </View>

        {error ? (
          <Text style={s.errorText} accessibilityRole="alert">{error}</Text>
        ) : null}

        {/* Main Controls Row */}
        <View style={s.controlsRow}>
          <Pressable
            onPress={toggleShuffle}
            style={({ pressed }) => [s.ctrlBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            accessibilityRole="switch"
            accessibilityLabel="Shuffle"
            accessibilityState={{ checked: shuffle }}
          >
            <Icon name="shuffle" size={22} color={shuffle ? colors.accent : colors.onSurfaceVariant} />
          </Pressable>

          <Pressable
            onPress={handlePrev}
            style={({ pressed }) => [s.ctrlBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            disabled={!hasPrevious}
            accessibilityRole="button"
            accessibilityLabel="Previous track"
            accessibilityState={{ disabled: !hasPrevious }}
          >
            <Icon
              name="play-skip-back"
              size={28}
              color={hasPrevious ? colors.onSurface : '#4A5463'}
            />
          </Pressable>

          <Pressable
            onPress={handleTogglePlay}
            style={({ pressed }) => [s.playPauseBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <View style={s.pauseBars}>
                <View style={s.pauseBar} />
                <View style={s.pauseBar} />
              </View>
            ) : (
              <Icon name="play" size={38} color={colors.onSurface} style={{ marginLeft: 4 }} />
            )}
          </Pressable>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [s.ctrlBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            disabled={!hasNext}
            accessibilityRole="button"
            accessibilityLabel="Next track"
            accessibilityState={{ disabled: !hasNext }}
          >
            <Icon
              name="play-skip-forward"
              size={28}
              color={hasNext ? colors.onSurface : '#4A5463'}
            />
          </Pressable>

          <Pressable
            onPress={handleRepeatToggle}
            style={({ pressed }) => [s.ctrlBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Repeat: ${repeat === 'off' ? 'off' : repeat === 'all' ? 'all tracks' : 'this track'}`}
          >
            <Icon name="repeat" size={22} color={repeat !== 'off' ? colors.accent : colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Bottom Actions Row (Lyrics, Queue, and Options) */}
        <View style={s.bottomRow}>
          <Pressable
            style={({ pressed }) => [s.bottomCircleBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/lyrics' as any)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Show lyrics"
          >
            <Icon name="document-text-outline" size={20} color={colors.onSurface} />
          </Pressable>

          <View style={s.bottomRightGroup}>
            <Pressable
              style={({ pressed }) => [s.bottomCircleBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/queue' as any)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Open queue"
            >
              <Icon name="reorder-three" size={22} color={colors.onSurface} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.bottomCircleBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setOptionsVisible(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Icon name="ellipsis-horizontal" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Options Menu Modal */}
      <TrackOptionsMenu
        visible={optionsVisible}
        track={track}
        onClose={() => setOptionsVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptyBody: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHighest,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  errorText: {
    fontSize: 13,
    color: '#ff9f9f',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  topHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  chevronBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingBottom: 20,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  artworkWrap: {
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 16,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  trackTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  trackArtist: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  techBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  qualityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  qualityPillText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: colors.outlineText,
    letterSpacing: 0.5,
  },
  heartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubberContainer: {
    marginTop: 12,
    gap: 6,
  },
  scrubTouchArea: {
    height: 32,
    justifyContent: 'center',
  },
  scrubTrack: {
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrubFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: colors.outlineText,
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtn: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBars: {
    flexDirection: 'row',
    gap: 8,
    height: 32,
    alignItems: 'center',
  },
  pauseBar: {
    width: 6,
    height: 30,
    backgroundColor: colors.onSurface,
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  bottomRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

