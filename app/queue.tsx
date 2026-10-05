import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import CoverThumb from '../src/components/ui/CoverThumb';
import { LevelMeter } from '../src/components/ui/LevelMeter';
import { Button, EmptyState, Banner } from '../src/components/ui/primitives';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import PlayerTabBar, { PlayerTab } from '../src/components/ui/PlayerTabBar';
import { useQueueStore, getCachedTrack, cacheTracks, QueueEntry } from '../src/store/queueStore';
import { usePlaybackStore } from '../src/store/playbackStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { audioService } from '../src/audio/AudioService';
import { Track } from '../src/providers/types';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, r, t } from '../src/theme/theme';

const formatMs = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function QueueScreen() {
  const router = useRouter();
  const { gutter, maxContentWidth } = useResponsive();
  const entries = useQueueStore((state) => state.entries);
  const currentIndex = useQueueStore((state) => state.currentIndex);
  const context = useQueueStore((state) => state.context);
  const removeAt = useQueueStore((state) => state.removeAt);
  const clearQueue = useQueueStore((state) => state.clearQueue);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const positionMs = usePlaybackStore((state) => state.positionMs);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isDownloaded = useDownloadStore((state) => state.isTrackDownloaded);

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

  useEffect(() => {
    const resolved = entries
      .map((entry) => getCachedTrack(entry.trackId))
      .filter((track): track is Track => Boolean(track));
    cacheTracks(resolved);
  }, [entries]);

  const currentPosition = currentTrack?.durationMs
    ? formatMs(positionMs)
    : '0:00';

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

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)');
    }
  };

  const renderTrackItem = (item: { entry: QueueEntry; index: number; track: Track }) => {
    const { track, index } = item;
    return (
      <View key={item.entry.entryId} style={s.rowItem}>
        <View style={s.dragHandleWrap}>
          <Icon name="drag-handle" size={16} color={colors.disabled} />
        </View>

        <Pressable
          onPress={() => playAbsoluteIndex(index)}
          style={({ pressed }) => [s.rowMain, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Play ${track.title} by ${track.artist}`}
        >
          <CoverThumb
            uri={track.coverUrl}
            pattern="rings"
            size={42}
            borderRadius={r.sm}
          />
          <View style={s.rowMeta}>
            <Text style={s.rowTitle} numberOfLines={1}>{track.title}</Text>
            <View style={s.rowSub}>
              <Text style={s.rowArtist} numberOfLines={1}>{track.artist}</Text>
              {isDownloaded(track.id) && (
                <View style={s.miniPill}>
                  <Text style={s.miniPillText}>OFFLINE</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={s.rowDuration}>{formatMs(track.durationMs ?? 0)}</Text>
        </Pressable>

        <Pressable
          onPress={() => setOptionsTrack(track)}
          hitSlop={8}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${track.title}`}
        >
          <Icon name="more" size={16} color={colors.textTertiary} />
        </Pressable>

        <Pressable
          onPress={() => handleRemove(index, track.title)}
          hitSlop={8}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${track.title} from queue`}
        >
          <Icon name="close" size={16} color={colors.textTertiary} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close queue"
        >
          <Icon name="chevron-down" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>QUEUE</Text>
        <Pressable
          onPress={() => currentTrack && setOptionsTrack(currentTrack)}
          hitSlop={10}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Queue options"
        >
          <Icon name="more" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingHorizontal: gutter,
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {notice && (
          <Banner
            title="Notice"
            body={notice}
            onDismiss={() => setNotice(null)}
          />
        )}

        {/* Current playing card */}
        <View style={s.section}>
          <Text style={s.sectionEyebrow}>NOW PLAYING</Text>
          <View style={s.currentCard}>
            <CoverThumb
              uri={currentTrack?.coverUrl}
              pattern="waveform"
              size={52}
              borderRadius={r.sm}
              showGlow={isPlaying}
            />
            <View style={s.currentMeta}>
              <Text style={s.currentTitle} numberOfLines={1}>
                {currentTrack?.title ?? 'Nothing playing'}
              </Text>
              <Text style={s.currentArtist} numberOfLines={1}>
                {currentTrack?.artist ?? 'Select a track to start'}
              </Text>
              <View style={s.currentTimingRow}>
                {isPlaying && <LevelMeter active={isPlaying} size={10} />}
                <Text style={s.currentTimeText}>
                  {currentPosition} / {formatMs(currentTrack?.durationMs ?? 0)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => (isPlaying ? audioService.pause() : audioService.resume())}
              hitSlop={8}
              style={({ pressed }) => [s.currentPlayBtn, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={colors.onAccent}
              />
            </Pressable>
          </View>
        </View>

        {/* User-added queue */}
        {userTier.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionEyebrow}>NEXT IN QUEUE</Text>
              <Text style={s.sectionCount}>
                {userTier.length} {userTier.length === 1 ? 'TRACK' : 'TRACKS'}
              </Text>
            </View>
            <View style={s.listCard}>
              {userTier.map(renderTrackItem)}
            </View>
          </View>
        )}

        {/* Context queue */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionEyebrow}>
              {context?.name ? `PLAYING FROM: ${context.name.toUpperCase()}` : 'UP NEXT'}
            </Text>
            {contextTier.length > 0 && (
              <Text style={s.sectionCount}>
                {contextTier.length} {contextTier.length === 1 ? 'TRACK' : 'TRACKS'}
              </Text>
            )}
          </View>

          {contextTier.length === 0 && userTier.length === 0 ? (
            <EmptyState
              code="EMPTY_02"
              title="Queue is empty"
              body="Add tracks from Explore or your Collection to build your playback queue."
              actionLabel="EXPLORE MUSIC"
              onAction={() => router.push('/(tabs)/search' as any)}
            />
          ) : (
            <View style={s.listCard}>
              {contextTier.map(renderTrackItem)}
            </View>
          )}
        </View>

        {/* Clear upcoming button */}
        {upcomingItems.length > 0 && (
          <View style={s.actionsWrap}>
            <Button
              variant="secondary"
              label="CLEAR UPCOMING QUEUE"
              icon="trash"
              onPress={handleClearAll}
              fullWidth
            />
          </View>
        )}
      </ScrollView>

      {/* Capsule tab bar */}
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
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.7,
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
  headerTitle: {
    ...t.headline,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 20,
  },

  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  totalsText: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  fidelityText: {
    ...t.monoMicro,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionEyebrow: {
    ...t.label,
    color: colors.textTertiary,
  },
  sectionCount: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },

  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: r.md,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  currentMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  currentTitle: {
    ...t.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  currentArtist: {
    ...t.caption,
    color: colors.textSecondary,
  },
  currentTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  currentTimeText: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  currentPlayBtn: {
    width: 42,
    height: 42,
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },

  listCard: {
    borderRadius: r.md,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dragHandleWrap: {
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  rowMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    ...t.body,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  rowSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowArtist: {
    ...t.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  miniPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: r.full,
    backgroundColor: colors.surface2,
  },
  miniPillText: {
    ...t.monoMicro,
    fontSize: 9,
    color: colors.textTertiary,
  },
  rowDuration: {
    ...t.monoMicro,
    color: colors.textTertiary,
    paddingHorizontal: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionsWrap: {
    marginTop: 8,
    marginBottom: 16,
  },
});