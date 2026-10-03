import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const removeAt = useQueueStore((state) => state.removeAt);
  const clearQueue = useQueueStore((state) => state.clearQueue);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const positionMs = usePlaybackStore((state) => state.positionMs);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isDownloaded = useDownloadStore((state) => state.isTrackDownloaded);
  const hifiQuality = useSettingsStore((state) => state.audio.hifiAudioQuality);

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  /** Upcoming entries resolved to tracks; unresolved ids are dropped. */
  const upcoming = useMemo(
    () =>
      entries
        .slice(currentIndex + 1)
        .map((entry: QueueEntry) => getCachedTrack(entry.trackId))
        .filter((track): track is Track => Boolean(track)),
    [entries, currentIndex],
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

  const playUpcoming = (index: number) => {
    // Jump the playhead onto the tapped entry, then let playback take over.
    let target = currentIndex + 1 + index;
    while (target < entries.length) {
      const track = getCachedTrack(entries[target].trackId);
      if (track) {
        useQueueStore.setState({ currentIndex: target });
        void audioService.playTrack(track);
        return;
      }
      target += 1;
    }
  };

  const handleRemove = (index: number) => {
    removeAt(currentIndex + 1 + index);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.push('/now-playing' as any)}
          hitSlop={10}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to now playing"
        >
          <Icon name="chevron-down" size={22} color={colors.onSurface} />
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

        {/* Current frequency */}
        <View style={s.currentBlock}>
          <View style={s.blockHeader}>
            <Text style={s.blockTitle}>CURRENT FREQUENCY</Text>
            {isPlaying && (
              <View style={s.onAir}>
                <Text style={s.onAirText}>ON AIR</Text>
              </View>
            )}
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

        {/* Up next */}
        <View style={s.currentBlock}>
          <View style={s.blockHeader}>
            <Text style={s.blockTitle}>
              UP NEXT{' '}
              <Text style={s.blockCount}>
                • {upcoming.length} {upcoming.length === 1 ? 'Sequential' : 'Sequential'}
              </Text>
            </Text>
            <Text style={s.selectLabel}>SELECT</Text>
          </View>

          {upcoming.length === 0 ? (
            <Text style={s.emptyText}>
              Nothing queued. Add tracks from your collection or search.
            </Text>
          ) : (
            <View style={s.upNextList}>
              {upcoming.map((track, index) => (
                <View key={`${track.id}-${index}`} style={s.upNextRow}>
                  <Icon name="reorder-two" size={18} color={colors.outlineText} />
                  <Pressable
                    onPress={() => playUpcoming(index)}
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
                            <Text style={s.cachedText}>CACHED</Text>
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
                    onPress={() => handleRemove(index)}
                    hitSlop={8}
                    style={({ pressed }) => [s.rowMore, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${track.title} from queue`}
                  >
                    <Icon name="close" size={16} color={colors.outlineText} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Continuity actions */}
        <View style={s.actionsCard}>
          <Text style={s.actionsTitle}>Save queue</Text>
          <Text style={s.actionsBody}>Keep this queue for your next session</Text>
          <View style={s.actionsRow}>
            <Pressable
              onPress={clearQueue}
              style={({ pressed }) => [s.actionButton, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Clear the queue"
            >
              <Icon name="trash-outline" size={14} color={colors.onSurface} />
              <Text style={s.actionText}>CLEAR ALL</Text>
            </Pressable>
          </View>
        </View>
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
    gap: 28,
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

  totals: {
    ...t.labelMd,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
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
    ...t.labelMd,
    color: colors.onSurfaceVariant,
  },
  blockCount: {
    ...t.labelMd,
    color: colors.outlineText,
  },
  selectLabel: {
    ...t.labelMd,
    color: colors.onSurface,
  },

  onAir: {
    paddingHorizontal: 10,
    height: 24,
    justifyContent: 'center',
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainerHigh,
  },
  onAirText: {
    ...t.micro,
    color: colors.onSurface,
  },

  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    ...t.mono,
    fontSize: 10,
    color: colors.outlineText,
  },
  currentPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHighest,
  },

  upNextList: {
    gap: 8,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
    paddingRight: 4,
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
    ...t.bodyMd,
    flexShrink: 1,
    color: colors.outlineText,
  },
  cachedBadge: {
    paddingHorizontal: 8,
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
    ...t.mono,
    color: colors.outlineVariant,
  },
  rowMore: {
    width: 32,
    height: 32,
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