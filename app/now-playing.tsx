import React, { useState } from 'react';
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
import { PlayButton, QualityBadge } from '../src/components/ui/primitives';
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
  const artSize = artworkSize(330);

  const { currentTrack, isPlaying, positionMs, durationMs, error, isLoading } = usePlaybackStore();
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore();
  const isDownloaded = useDownloadStore((state) =>
    currentTrack ? state.isTrackDownloaded(currentTrack.id) : false,
  );
  const hifiQuality = useSettingsStore((state) => state.audio.hifiAudioQuality);
  const { shuffle, toggleShuffle, repeat, setRepeat, entries, currentIndex, context } = useQueueStore();
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

  const trackIndexStr = (currentIndex >= 0 ? currentIndex + 1 : 1).toString().padStart(2, '0');
  const totalTracksStr = Math.max(entries.length, 1).toString().padStart(2, '0');
  const bitrate = /24/i.test(hifiQuality ?? '') ? 2304 : /lossless/i.test(hifiQuality ?? '') ? 1411 : /320/i.test(hifiQuality ?? '') ? 320 : 160;
  const playingFromLabel = context?.name
    ? `PLAYING FROM ${context.name.toUpperCase()}`
    : (track?.album ? `PLAYING FROM ${track.album.toUpperCase()}` : 'PLAYING FROM QUEUE');

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
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Technical Readout & Format badge row */}
        <View style={s.readoutRow}>
          <Text style={s.readoutText}>
            TRACK {trackIndexStr}/{totalTracksStr} · {bitrate} KBPS
          </Text>
          <QualityBadge format={qualityBadge} />
        </View>

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

        {/* Title & Artist row with Like/Pin button */}
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
                name={liked ? 'check' : 'plus'}
                size={20}
                color={liked ? colors.onAccent : colors.textPrimary}
              />
            </Pressable>
          )}
        </View>

        {/* Scrubber */}
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
            <Text style={s.time}>{durationMs > 0 ? formatMs(positionMs) : '0:00'}</Text>
            <Text style={s.time}>{durationMs > 0 ? `-${formatMs(remainingMs)}` : '0:00'}</Text>
          </View>
        </Pressable>

        {/* Transport Controls */}
        <View style={s.transport}>
          <Pressable
            onPress={toggleShuffle}
            hitSlop={10}
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
            hitSlop={10}
            style={({ pressed }) => [s.transportButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous track"
          >
            <Icon name="skip-previous" size={26} color={colors.textPrimary} />
          </Pressable>

          <PlayButton
            size={72}
            isPlaying={isPlaying}
            showGlow={isPlaying}
            onPress={handleTogglePlay}
            disabled={!track}
          />

          <Pressable
            onPress={handleNext}
            hitSlop={10}
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
            hitSlop={10}
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

        {/* Output Device Pill */}
        <View style={s.devicePill}>
          <Icon name="output" size={14} color={colors.textTertiary} />
          <Text style={s.deviceText}>USB DAC · DIRECT</Text>
          <View style={s.deviceDivider} />
          <View style={s.statusDot} />
          <Text style={s.bitPerfectText}>BIT-PERFECT</Text>
        </View>

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

  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.md,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
    position: 'relative',
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
    backgroundColor: 'rgba(20, 20, 22, 0.85)',
    borderWidth: 1,
    borderColor: colors.divider,
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  likeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  scrubArea: {
    width: '100%',
    gap: 8,
    paddingVertical: 6,
  },
  scrubTrack: {
    height: 3,
    borderRadius: r.full,
    backgroundColor: colors.surface2,
    position: 'relative',
  },
  scrubFill: {
    height: 3,
    borderRadius: r.full,
    backgroundColor: colors.accent,
  },
  scrubKnob: {
    position: 'absolute',
    top: -3.5,
    width: 10,
    height: 10,
    marginLeft: -5,
    borderRadius: 5,
    backgroundColor: colors.accent,
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

  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: r.full,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  deviceText: {
    ...t.monoMicro,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  deviceDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.divider,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
  },
  bitPerfectText: {
    ...t.monoMicro,
    color: colors.textSecondary,
    letterSpacing: 0.5,
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