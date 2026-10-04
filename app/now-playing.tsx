import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import PlayerTabBar, { PlayerTab } from '../src/components/ui/PlayerTabBar';
import { usePlaybackStore } from '../src/store/playbackStore';
import { audioService } from '../src/audio/AudioService';
import { useQueueStore } from '../src/store/queueStore';
import { useLibraryStore } from '../src/store/libraryStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { useSettingsStore } from '../src/store/settingsStore';
import { colors, FONTS, r, t } from '../src/theme/theme';

/** Elapsed time, or the countdown when counting back from the end. */
function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function NowPlayingScreen() {
  const router = useRouter();
  const { artworkSize } = useResponsive();
  const artSize = artworkSize(340);

  const { currentTrack, isPlaying, positionMs, durationMs, error, isLoading } = usePlaybackStore();
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore();
  const isDownloaded = useDownloadStore((state) =>
    currentTrack ? state.isTrackDownloaded(currentTrack.id) : false,
  );
  const hifiQuality = useSettingsStore((state) => state.audio.hifiAudioQuality);
  const { shuffle, toggleShuffle, repeat, setRepeat } = useQueueStore();
  const hasNext = useQueueStore((state) => state.upcomingCount() > 0);

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const track = currentTrack;
  const liked = track ? isFavorite(track.id) : false;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const remainingMs = durationMs > 0 ? durationMs - positionMs : 0;

  const handleTogglePlay = async () => {
    if (!currentTrack) return;
    if (isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  };

  const handleToggleFavorite = async () => {
    if (!track) return;
    if (liked) {
      await removeFavorite(track.id);
    } else {
      await addFavorite(track);
    }
  };

  const handleNext = async () => {
    await audioService.playNextInQueue();
  };

  const handlePrevious = async () => {
    await audioService.playPrevious();
  };

  const handleRepeat = () => {
    setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off');
  };

  const goToPlayerTab = (tab: PlayerTab) => {
    if (tab === 'now-playing') return;
    router.push(`/${tab}` as any);
  };

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)');
    }
  };

  /** Short fidelity badge, e.g. FLAC 24/192 or AAC 320. */
  const qualityBadge = (() => {
    const q = hifiQuality ?? '';
    if (/24/i.test(q)) return 'FLAC 24/192';
    if (/lossless/i.test(q)) return 'FLAC 24/96';
    if (/320/i.test(q)) return 'AAC 320';
    return 'AAC 160';
  })();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header: dismiss, centred title, options */}
      <View style={s.header}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <Icon name="chevron-down" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={s.headerTitle}>NOW PLAYING</Text>
        <Pressable
          onPress={() => setOptionsVisible(true)}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Track options"
        >
          <Icon name="ellipsis-horizontal" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Artwork showcase: a framed, inset panel rather than a bare image */}
        <View style={[s.artFrame, { width: artSize + 24, height: artSize + 24 }]}>
          {track?.coverUrl || track?.artwork ? (
            <Image
              source={{ uri: (track.coverUrl ?? track.artwork) as string }}
              style={s.artwork}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.artwork, s.artworkFallback]}>
              <Icon name="musical-notes" size={44} color={colors.outlineText} />
            </View>
          )}

          {isDownloaded && (
            <View style={s.offlineBadge}>
              <Icon name="arrow-down-circle" size={12} color={colors.onSurface} />
            </View>
          )}
        </View>

        {/* Title block with like button */}
        <View style={s.titleRow}>
          <View style={s.titleMeta}>
            <Text style={s.trackTitle} numberOfLines={2}>{track?.title ?? 'Nothing playing'}</Text>
            <Text style={s.trackArtist} numberOfLines={1}>
              {track ? [track.artist, track.album].filter(Boolean).join(' • ') : 'Pick a track to begin'}
            </Text>
          </View>
          {!!track && (
            <Pressable
              onPress={handleToggleFavorite}
              hitSlop={8}
              style={({ pressed }) => [s.likeButton, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityState={{ selected: liked }}
            >
              <Icon
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={colors.onSurface}
              />
            </Pressable>
          )}
        </View>

        {/* Scrubber with elapsed on the left and remaining on the right */}
        <Pressable
          style={s.scrubArea}
          hitSlop={12}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={(e) => {
            if (trackWidth > 0 && durationMs > 0) {
              const ratio = Math.min(Math.max(0, e.nativeEvent.locationX / trackWidth), 1);
              const targetMs = Math.round(ratio * durationMs);
              void audioService.seekTo(targetMs);
            }
          }}
          accessibilityRole="adjustable"
          accessibilityLabel="Playback progress"
          accessibilityValue={{
            min: 0,
            max: durationMs,
            now: positionMs,
            text: `${formatMs(positionMs)} of ${formatMs(durationMs)}`,
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Seek forward 15 seconds' },
            { name: 'decrement', label: 'Seek backward 15 seconds' },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') {
              void audioService.seekTo(Math.min(durationMs, positionMs + 15000));
            } else if (event.nativeEvent.actionName === 'decrement') {
              void audioService.seekTo(Math.max(0, positionMs - 15000));
            }
          }}
        >
          <View style={s.scrubTrack}>
            <View style={[s.scrubFill, { width: `${progress * 100}%` }]} />
            <View style={[s.scrubKnob, { left: `${progress * 100}%` }]} />
          </View>
          <View style={s.timeRow}>
            <Text style={s.time}>{durationMs > 0 ? formatMs(positionMs) : '--:--'}</Text>
            <Text style={s.time}>{durationMs > 0 ? `-${formatMs(remainingMs)}` : '--:--'}</Text>
          </View>
        </Pressable>

        {/* Transport */}
        <View style={s.transport}>
          <Pressable
            onPress={toggleShuffle}
            hitSlop={8}
            style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Shuffle"
            accessibilityState={{ selected: shuffle }}
          >
            <Icon name="shuffle" size={20} color={shuffle ? colors.onSurface : colors.outlineText} />
          </Pressable>

          <Pressable
            onPress={handlePrevious}
            hitSlop={8}
            style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous track"
          >
            <Icon name="play-skip-back" size={28} color={colors.onSurface} />
          </Pressable>

          <Pressable
            onPress={handleTogglePlay}
            style={({ pressed }) => [s.playButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            disabled={!track}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={30} color={colors.onPrimary} />
          </Pressable>

          <Pressable
            onPress={handleNext}
            hitSlop={8}
            disabled={!hasNext}
            style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Next track"
            accessibilityState={{ disabled: !hasNext }}
          >
            <Icon
              name="play-skip-forward"
              size={28}
              color={hasNext ? colors.onSurface : colors.surfaceContainerHighest}
            />
          </Pressable>

          <Pressable
            onPress={handleRepeat}
            hitSlop={8}
            style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Repeat"
            accessibilityState={{ selected: repeat !== 'off' }}
          >
            <Icon
              name={repeat === 'one' ? 'repeat' : 'repeat-outline'}
              size={20}
              color={repeat !== 'off' ? colors.onSurface : colors.outlineText}
            />
          </Pressable>
        </View>

        {!!track && (
          <View style={s.qualityStrip}>
            <View style={s.qualityDot} />
            <Text style={s.qualityText}>{qualityBadge} • Lossless Audio</Text>
            {isDownloaded && <Text style={s.downloadedBadgeText}>• Downloaded</Text>}
          </View>
        )}

        {!!error && <Text style={s.errorText}>{error}</Text>}
        {isLoading && <Text style={s.statusText}>Loading…</Text>}
      </ScrollView>

      <PlayerTabBar active="now-playing" onSelect={goToPlayerTab} />

      <TrackOptionsMenu
        visible={optionsVisible}
        track={track}
        onClose={() => setOptionsVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceDeep,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...t.titleMd,
    color: colors.onSurface,
  },

  artFrame: {
    alignSelf: 'center',
    padding: 10,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 24,
    height: 24,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 14, 17, 0.9)',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  titleMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  trackTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: colors.onSurface,
  },
  trackArtist: {
    ...t.body,
    color: colors.outlineText,
  },
  likeButton: {
    width: 48,
    height: 48,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },

  scrubArea: {
    gap: 8,
  },
  scrubTrack: {
    height: 3,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  scrubFill: {
    height: 3,
    borderRadius: r.pill,
    backgroundColor: colors.onSurface,
  },
  scrubKnob: {
    position: 'absolute',
    top: -4.5,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: colors.onSurface,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.outlineText,
    fontVariant: ['tabular-nums'],
  },

  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transportButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onSurface,
  },

  qualityStrip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  qualityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onSurface,
  },
  qualityText: {
    ...t.micro,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  downloadedBadgeText: {
    ...t.micro,
    color: colors.onSurface,
    fontWeight: '600',
  },

  errorText: {
    ...t.bodyMd,
    color: colors.error,
  },
  statusText: {
    ...t.bodyMd,
    color: colors.outlineText,
  },
});