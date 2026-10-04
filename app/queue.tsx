import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import CoverThumb from '../src/components/ui/CoverThumb';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import PlayerTabBar, { PlayerTab } from '../src/components/ui/PlayerTabBar';
import { useQueueStore, getCachedTrack, cacheTracks, QueueEntry } from '../src/store/queueStore';
import { usePlaybackStore } from '../src/store/playbackStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { audioService } from '../src/audio/AudioService';
import { Track } from '../src/providers/types';
import { colors, FONTS, r, t } from '../src/theme/theme';

const formatMs = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) return '--:--';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/** Total runtime of a list, e.g. "1H 48M". */
function totalRuntime(tracks: Track[]): string {
  const ms = tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0);
  if (ms <= 0) return '';
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}M`;
  const rest = minutes % 60;
  return rest === 0 ? `${hours}H` : `${hours}H ${rest}M`;
}

export default function QueueScreen() {
  const router = useRouter();
  const entries = useQueueStore((state) => state.entries);
  const currentIndex = useQueueStore((state) => state.currentIndex);
  const context = useQueueStore((state) => state.context);
  const removeAt = useQueueStore((state) => state.removeAt);
  const clearQueue = useQueueStore((state) => state.clearQueue);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const positionMs = usePlaybackStore((state) => state.positionMs);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isDownloaded = useDownloadStore((state) => state.isTrackDownloaded);
  const hifiQuality = useSettingsStore((state) => state.audio.hifiAudioQuality);

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** All upcoming entries with their absolute queue index. */
  const upcomingItems = useMemo(() => {
    return entries
      .slice(currentIndex + 1)
      .map((entry: QueueEntry, offset: number) => ({
        entry,
        index: currentIndex + 1 + offset,
        track: getCachedTrack(entry.trackId),
      }))
      .filter((item): item is { entry: QueueEntry; index: number; track: Track } => Boolean(item.track));
  }, [entries, currentIndex]);

  /** Tier 1: User-added tracks ("Play Next", "Add to Queue"). */
  const userTier = useMemo(
    () => upcomingItems.filter((item) => item.entry.source === 'user'),
    [upcomingItems],
  );

  /** Tier 2: Context tracks (from album, playlist, or search). */
  const contextTier = useMemo(
    () => upcomingItems.filter((item) => item.entry.source !== 'user'),
    [upcomingItems],
  );

  const allTracks = useMemo(() => {
    const resolved = entries
      .map((entry) => getCachedTrack(entry.trackId))
      .filter((track): track is Track => Boolean(track));
    cacheTracks(resolved);
    return resolved;
  }, [entries]);

  const currentPosition = currentTrack?.durationMs
    ? formatMs(positionMs)
    : '--:--';

  const goToPlayerTab = (tab: PlayerTab) => {
    router.push(`/${tab}` as any);
  };

  const playAbsoluteIndex = (targetIndex: number) => {
    const entry = entries[targetIndex];
    if (!entry) return;
    const track = getCachedTrack(entry.trackId);
    if (track) {
      useQueueStore.setState({ currentIndex: targetIndex });
      void audioService.playTrack(track);
    }
  };

  const handleRemove = (absoluteIndex: number, trackTitle: string) => {
    removeAt(absoluteIndex);
    setNotice(`Removed "${trackTitle}"`);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Queue',
      'Remove all upcoming tracks from the queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearQueue();
            setNotice('Queue cleared');
            setTimeout(() => setNotice(null), 2500);
          },
        },
      ],
    );
  };

  const renderTrackItem = (item: { entry: QueueEntry; index: number; track: Track }) => {
    const { track, index } = item;
    return (
      <View key={item.entry.entryId} style={s.upNextRow}>
        <Icon name="reorder-two" size={18} color={colors.outlineText} />
        <Pressable
          onPress={() => playAbsoluteIndex(index)}
          style={({ pressed }) => [s.upNextMain, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Play ${track.title} by ${track.artist}`}
        >
          <CoverThumb
            uri={track.coverUrl}
            size={44}
            borderRadius={r.sm}
            style={s.upNextArt}
          />
          <View style={s.upNextMeta}>
            <Text style={s.upNextTitle} numberOfLines={1}>{track.title}</Text>
            <View style={s.upNextSubRow}>
              <Text style={s.upNextArtist} numberOfLines={1}>{track.artist}</Text>
              {isDownloaded(track.id) && (
                <View style={s.cachedBadge}>
                  <Text style={s.cachedText}>DOWNLOADED</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={s.upNextDuration}>{formatMs(track.durationMs ?? 0)}</Text>
        </Pressable>
        <Pressable
          onPress={() => setOptionsTrack(track)}
          hitSlop={8}
          style={({ pressed }) => [s.rowMore, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${track.title}`}
        >
          <Icon name="ellipsis-vertical" size={16} color={colors.outlineText} />
        </Pressable>
        <Pressable
          onPress={() => handleRemove(index, track.title)}
          hitSlop={8}
          style={({ pressed }) => [s.rowMore, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${track.title} from queue`}
        >
          <Icon name="close" size={16} color={colors.outlineText} />
        </Pressable>
      </View>
    );
  };

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close queue"
        >
          <Icon name="chevron-down" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={s.headerTitle}>QUEUE</Text>
        <Pressable
          onPress={() => currentTrack && setOptionsTrack(currentTrack)}
          hitSlop={10}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Queue options"
        >
          <Icon name="ellipsis-horizontal" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Session totals */}
        <Text style={s.totals}>
          {allTracks.length} {allTracks.length === 1 ? 'TRACK' : 'TRACKS'}
          {totalRuntime(allTracks) ? ` • ${totalRuntime(allTracks)}` : ''}
        </Text>

        {notice && (
          <View style={s.noticeBanner} accessibilityRole="alert">
            <Icon name="information-circle-outline" size={16} color={colors.onSurface} />
            <Text style={s.noticeText}>{notice}</Text>
          </View>
        )}

        {/* Current track */}
        <View style={s.currentBlock}>
          <View style={s.blockHeader}>
            <Text style={s.blockTitle}>NOW PLAYING</Text>
          </View>

          <View style={s.currentCard}>
            <CoverThumb
              uri={currentTrack?.coverUrl}
              size={64}
              borderRadius={r.sm}
              style={s.currentArt}
            />
            <View style={s.currentMeta}>
              <Text style={s.currentTitle} numberOfLines={1}>
                {currentTrack?.title ?? 'Nothing playing'}
              </Text>
              <Text style={s.currentArtist} numberOfLines={1}>
                {currentTrack?.artist ?? '—'}
              </Text>
              <View style={s.currentBadgeRow}>
                <View style={s.formatBadge}>
                  <Text style={s.formatText}>{(hifiQuality ?? 'LOSSLESS').toUpperCase()}</Text>
                </View>
                <Text style={s.currentTime}>
                  {currentPosition} / {formatMs(currentTrack?.durationMs ?? 0)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => (isPlaying ? audioService.pause() : audioService.resume())}
              hitSlop={8}
              style={({ pressed }) => [s.currentPlay, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={colors.onPrimary}
              />
            </Pressable>
          </View>
        </View>

        {/* Tier 1: User-added queue */}
        {userTier.length > 0 && (
          <View style={s.currentBlock}>
            <View style={s.blockHeader}>
              <Text style={s.blockTitle}>NEXT IN QUEUE</Text>
              <Text style={s.blockCount}>
                {userTier.length} {userTier.length === 1 ? 'track' : 'tracks'}
              </Text>
            </View>
            <View style={s.upNextList}>
              {userTier.map(renderTrackItem)}
            </View>
          </View>
        )}

        {/* Tier 2: Context queue */}
        <View style={s.currentBlock}>
          <View style={s.blockHeader}>
            <Text style={s.blockTitle}>
              {context?.name ? `PLAYING FROM: ${context.name.toUpperCase()}` : 'UP NEXT'}
            </Text>
            {contextTier.length > 0 && (
              <Text style={s.blockCount}>
                {contextTier.length} {contextTier.length === 1 ? 'track' : 'tracks'}
              </Text>
            )}
          </View>

          {contextTier.length === 0 && userTier.length === 0 ? (
            <Text style={s.emptyText}>
              Nothing queued. Play an album, playlist, or add tracks to queue.
            </Text>
          ) : (
            <View style={s.upNextList}>
              {contextTier.map(renderTrackItem)}
            </View>
          )}
        </View>

        {/* Continuity actions */}
        {upcomingItems.length > 0 && (
          <View style={s.actionsCard}>
            <Text style={s.actionsTitle}>Clear upcoming</Text>
            <Text style={s.actionsBody}>Remove all queued tracks behind the current track</Text>
            <View style={s.actionsRow}>
              <Pressable
                onPress={handleClearAll}
                style={({ pressed }) => [s.actionButton, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Clear upcoming queue"
              >
                <Icon name="trash-outline" size={14} color={colors.onSurface} />
                <Text style={s.actionText}>CLEAR QUEUE</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <PlayerTabBar active="queue" onSelect={goToPlayerTab} />

      <TrackOptionsMenu
        visible={!!optionsTrack}
        track={optionsTrack}
        onClose={() => setOptionsTrack(null)}
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
    paddingHorizontal: 16,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...t.title,
    color: colors.onSurface,
  },

  totals: {
    ...t.labelSm,
    color: colors.outlineText,
  },

  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  noticeText: {
    ...t.bodySm,
    color: colors.onSurface,
  },

  currentBlock: {
    gap: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitle: {
    ...t.labelSm,
    color: colors.outlineText,
    letterSpacing: 0.8,
  },
  blockCount: {
    ...t.micro,
    color: colors.outlineText,
  },

  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  currentArt: {
    backgroundColor: colors.surfaceContainer,
  },
  currentMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  currentTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.onSurface,
  },
  currentArtist: {
    ...t.bodyMd,
    color: colors.outlineText,
  },
  currentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  formatBadge: {
    paddingHorizontal: 8,
    height: 18,
    justifyContent: 'center',
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainerHighest,
  },
  formatText: {
    ...t.micro,
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  currentTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: colors.outlineText,
    fontVariant: ['tabular-nums'],
  },
  currentPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onSurface,
  },

  upNextList: {
    gap: 8,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
    paddingRight: 6,
    paddingVertical: 8,
  },
  upNextMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    paddingVertical: 4,
  },
  upNextArt: {
    backgroundColor: colors.surfaceContainer,
  },
  upNextMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  upNextTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  upNextSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upNextArtist: {
    ...t.bodySm,
    flexShrink: 1,
    color: colors.outlineText,
  },
  cachedBadge: {
    paddingHorizontal: 6,
    height: 16,
    justifyContent: 'center',
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainerHighest,
  },
  cachedText: {
    fontSize: 9,
    letterSpacing: 0.4,
    color: colors.onSurfaceVariant,
  },
  upNextDuration: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: colors.outlineText,
    fontVariant: ['tabular-nums'],
  },
  rowMore: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionsCard: {
    padding: 16,
    gap: 4,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  actionsTitle: {
    ...t.titleMd,
    color: colors.onSurface,
  },
  actionsBody: {
    ...t.bodyMd,
    color: colors.outlineText,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerLow,
  },
  actionText: {
    ...t.labelMd,
    color: colors.onSurface,
  },

  emptyText: {
    ...t.bodyMd,
    color: colors.outlineText,
    paddingVertical: 24,
    textAlign: 'center',
  },
});