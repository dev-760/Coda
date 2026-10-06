import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import CoverThumb from '../src/components/ui/CoverThumb';
import { PlayButton } from '../src/components/ui/primitives';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import PlayerTabBar, { PlayerTab } from '../src/components/ui/PlayerTabBar';
import { usePlaybackStore } from '../src/store/playbackStore';
import { audioService } from '../src/audio/AudioService';
import { useQueueStore } from '../src/store/queueStore';
import { useLibraryStore } from '../src/store/libraryStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { useBackHandler } from '../src/hooks/useBackHandler';
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
  const { artworkSize, isShortScreen, isLandscape, width, maxContentWidth } = useResponsive();
  const isTabletOrLandscape = isLandscape || width >= 768;
  const artSize = artworkSize(isShortScreen ? 220 : 330);

  const { currentTrack, isPlaying, positionMs, durationMs, error, isLoading } = usePlaybackStore();
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore();
  const isDownloaded = useDownloadStore((state) =>
    currentTrack ? state.isTrackDownloaded(currentTrack.id) : false,
  );
  const { shuffle, toggleShuffle, repeat, setRepeat, context } = useQueueStore();
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
    router.replace(`/${tab}` as any);
  };

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (router.canDismiss?.()) {
      router.dismiss();
    } else {
      router.navigate('/(tabs)');
    }
  };

  useBackHandler(() => {
    handleDismiss();
    return true;
  });

  const playingFromLabel = (() => {
    if (context?.type === 'search') {
      return 'PLAYING FROM SEARCH';
    }
    if (context?.name) {
      return `PLAYING FROM ${context.name.toUpperCase()}`;
    }
    if (track?.album) {
      return `PLAYING FROM ${track.album.toUpperCase()}`;
    }
    return 'PLAYING FROM QUEUE';
  })();

  const renderTitleRow = () => (
    <View style={s.titleRow}>
      <View style={s.titleMeta}>
        <Text style={s.trackTitle} numberOfLines={1}>{track?.title ?? 'Nothing playing'}</Text>
        <Text style={s.trackArtist} numberOfLines={1}>
          {track ? [track.artist, track.album].filter(Boolean).join(' · ') : 'Pick a track to begin'}
        </Text>
      </View>
      {!!track && (
        <Pressable
          onPress={handleToggleFavorite}
          hitSlop={8}
          style={({ pressed }) => [
            s.likeButton,
            liked && s.likeButtonActive,
            pressed && s.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove from saved' : 'Save track'}
          accessibilityState={{ selected: liked }}
        >
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? colors.accent : colors.textPrimary}
          />
        </Pressable>
      )}
    </View>
  );

  const renderScrubber = () => (
    <Pressable
      style={[s.scrubArea, isShortScreen && s.scrubAreaShort]}
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
        <Text style={s.time}>{durationMs > 0 ? formatMs(positionMs) : '0:00'}</Text>
        <Text style={s.time}>{durationMs > 0 ? `-${formatMs(remainingMs)}` : '0:00'}</Text>
      </View>
    </Pressable>
  );

  const renderTransport = () => (
    <View style={[s.transport, isShortScreen && s.transportShort]}>
      <Pressable
        onPress={toggleShuffle}
        hitSlop={12}
        style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Shuffle"
        accessibilityState={{ selected: shuffle }}
      >
        <Icon
          name="shuffle"
          size={20}
          color={shuffle ? colors.accent : colors.disabled}
        />
        {shuffle && <View style={s.activeDot} />}
      </Pressable>

      <Pressable
        onPress={handlePrevious}
        hitSlop={12}
        style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Previous track"
      >
        <Icon name="skip-previous" size={26} color={colors.textPrimary} />
      </Pressable>

      <PlayButton
        size={isShortScreen ? 64 : 72}
        isPlaying={isPlaying}
        showGlow={isPlaying}
        onPress={handleTogglePlay}
        disabled={!track}
      />

      <Pressable
        onPress={handleNext}
        hitSlop={12}
        disabled={!hasNext}
        style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Next track"
        accessibilityState={{ disabled: !hasNext }}
      >
        <Icon
          name="skip-next"
          size={26}
          color={hasNext ? colors.textPrimary : colors.disabled}
        />
      </Pressable>

      <Pressable
        onPress={handleRepeat}
        hitSlop={12}
        style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Repeat"
        accessibilityState={{ selected: repeat !== 'off' }}
      >
        <Icon
          name="repeat"
          size={20}
          color={repeat !== 'off' ? colors.accent : colors.disabled}
        />
        {repeat !== 'off' && (
          <View style={s.activeDot}>
            {repeat === 'one' && <Text style={s.repeatOneText}>1</Text>}
          </View>
        )}
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header: dismiss, 2-line context eyebrow + title, options */}
      <View style={s.header}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <Icon name="chevron-down" size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={s.headerCenter}>
          <Text style={s.headerEyebrow} numberOfLines={1}>{playingFromLabel}</Text>
          <Text style={s.headerSubtitle} numberOfLines={1}>{track?.album ?? 'Library'}</Text>
        </View>

        <Pressable
          onPress={() => setOptionsVisible(true)}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Track options"
        >
          <Icon name="more" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          isShortScreen && s.contentShort,
          isTabletOrLandscape && s.contentLandscape,
          { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isTabletOrLandscape ? (
          <View style={s.landscapeRow}>
            <View style={s.landscapeLeft}>
              <View style={[s.artContainer, { width: artSize + 16, height: artSize + 16 }]}>
                <CoverThumb
                  uri={track?.coverUrl ?? track?.artwork}
                  pattern="wave"
                  size={artSize}
                  borderRadius={r.md}
                  showGlow={isPlaying}
                />
                {isDownloaded && (
                  <View style={s.downloadedBadge}>
                    <Icon name="download-done" size={12} color={colors.accent} />
                    <Text style={s.downloadedText}>OFFLINE</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={s.landscapeRight}>
              {renderTitleRow()}
              {renderScrubber()}
              {renderTransport()}
            </View>
          </View>
        ) : (
          <>
            {/* Artwork showcase */}
            <View style={[s.artContainer, { width: artSize + 16, height: artSize + 16 }]}>
              <CoverThumb
                uri={track?.coverUrl ?? track?.artwork}
                pattern="wave"
                size={artSize}
                borderRadius={r.md}
                showGlow={isPlaying}
              />

              {isDownloaded && (
                <View style={s.downloadedBadge}>
                  <Icon name="download-done" size={12} color={colors.accent} />
                  <Text style={s.downloadedText}>OFFLINE</Text>
                </View>
              )}
            </View>

            {renderTitleRow()}
            {renderScrubber()}
            {renderTransport()}
          </>
        )}

        {!!error && <Text style={s.errorText}>{error}</Text>}
        {isLoading && <Text style={s.statusText}>Buffering audio stream…</Text>}
      </ScrollView>

      {/* Capsule tab bar */}
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
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 20,
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 2,
  },
  headerEyebrow: {
    ...t.label,
    color: colors.textTertiary,
  },
  headerSubtitle: {
    ...t.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  readoutRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  readoutText: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },

  contentShort: {
    gap: 12,
    paddingBottom: 8,
  },
  contentLandscape: {
    paddingVertical: 12,
    justifyContent: 'center',
  },
  landscapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 36,
    paddingHorizontal: 16,
  },
  landscapeLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeRight: {
    flex: 1,
    maxWidth: 440,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.md,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  downloadedBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: r.full,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  downloadedText: {
    ...t.monoMicro,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  titleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 4,
  },
  titleMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  trackTitle: {
    ...t.title,
    color: colors.textPrimary,
  },
  trackArtist: {
    ...t.headline,
    color: colors.textSecondary,
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(184, 184, 192, 0.16)',
    borderColor: colors.accent,
  },

  scrubArea: {
    width: '100%',
    gap: 8,
    paddingVertical: 6,
  },
  scrubAreaShort: {
    paddingVertical: 2,
    gap: 4,
  },
  scrubTrack: {
    height: 4,
    borderRadius: r.full,
    backgroundColor: '#27272A',
    position: 'relative',
  },
  scrubFill: {
    height: 4,
    borderRadius: r.full,
    backgroundColor: colors.accent,
  },
  scrubKnob: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: '#141416',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },

  transport: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  transportShort: {
    paddingVertical: 2,
  },
  transportButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneText: {
    fontFamily: FONTS.mono,
    fontSize: 7,
    lineHeight: 8,
    color: colors.onAccent,
    fontWeight: '700',
  },

  errorText: {
    ...t.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statusText: {
    ...t.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});