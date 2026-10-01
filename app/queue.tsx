import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import { useQueueStore, getCachedTrack, QueueEntry } from '../src/store/queueStore';
import { usePlaybackStore } from '../src/store/playbackStore';
import { audioService } from '../src/audio/AudioService';
import { Track } from '../src/providers/types';

interface QueueRow {
  entry: QueueEntry;
  track: Track;
  index: number;
}

function QueueRowItem({
  row,
  isCurrent,
  onPlay,
  onRemove,
  onOptions,
}: {
  row: QueueRow;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onOptions: () => void;
}) {
  const { track } = row;
  return (
    <Pressable
      style={({ pressed }) => [s.trackRow, pressed && s.trackRowPressed]}
      onPress={onPlay}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}`}
    >
      {track.coverUrl ? (
        <Image source={{ uri: track.coverUrl }} style={s.trackArt} />
      ) : (
        <View style={[s.trackArt, s.trackArtPlaceholder]}>
          <Icon name="musical-notes" size={18} color="#8e8e93" />
        </View>
      )}
      <View style={s.trackMeta}>
        <Text
          numberOfLines={1}
          style={[s.trackTitle, isCurrent && s.trackTitleCurrent]}
        >
          {track.title}
        </Text>
        <Text numberOfLines={1} style={s.trackArtist}>
          {track.artist}
        </Text>
      </View>
      <Pressable
        style={s.rowAction}
        onPress={onOptions}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Options for ${track.title}`}
      >
        <Icon name="ellipsis-horizontal" size={18} color="#8e8e93" />
      </Pressable>
      {!isCurrent && (
        <Pressable
          style={s.rowAction}
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${track.title} from queue`}
        >
          <Icon name="close" size={20} color="#8e8e93" />
        </Pressable>
      )}
    </Pressable>
  );
}

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entries = useQueueStore((state) => state.entries);
  const currentIndex = useQueueStore((state) => state.currentIndex);
  const context = useQueueStore((state) => state.context);
  const shuffle = useQueueStore((state) => state.shuffle);
  const repeat = useQueueStore((state) => state.repeat);
  const { removeAt, clearQueue, toggleShuffle, setRepeat } = useQueueStore();
  const { currentTrack, isPlaying } = usePlaybackStore();

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  const toRows = (from: number, to: number): QueueRow[] =>
    entries
      .slice(from, to)
      .map((entry, i) => ({ entry, track: getCachedTrack(entry.trackId), index: from + i }))
      .filter((row): row is QueueRow => row.track !== undefined);

  const historyRows = toRows(0, currentIndex);
  const currentRow = toRows(currentIndex, currentIndex + 1)[0] ?? null;
  const upcomingRows = toRows(currentIndex + 1, entries.length);

  const userTier = upcomingRows.filter((row) => row.entry.source === 'user');
  const contextTier = upcomingRows.filter((row) => row.entry.source !== 'user');

  const playEntry = async (row: QueueRow) => {
    await audioService.playTrack(row.track);
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  };

  const handleRepeatToggle = () => {
    if (repeat === 'off') setRepeat('all');
    else if (repeat === 'all') setRepeat('one');
    else setRepeat('off');
  };

  const repeatLabel =
    repeat === 'off' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat this track';

  const isEmpty = entries.length === 0;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Queue</Text>
        {!isEmpty && (
          <Pressable
            onPress={clearQueue}
            hitSlop={8}
            style={s.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Clear upcoming queue"
          >
            <Text style={s.clearText}>Clear queue</Text>
          </Pressable>
        )}
      </View>

      {isEmpty ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>Your queue is empty</Text>
          <Text style={s.emptyBody}>
            Play an album or playlist and the tracks you add will show up here.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={s.emptyButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={s.emptyButtonText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {historyRows.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionHeader}>History</Text>
              {historyRows.map((row) => (
                <QueueRowItem
                  key={row.entry.entryId}
                  row={row}
                  isCurrent={false}
                  onPlay={() => playEntry(row)}
                  onRemove={() => removeAt(row.index)}
                  onOptions={() => setOptionsTrack(row.track)}
                />
              ))}
            </View>
          )}

          {currentRow && (
            <View style={s.section}>
              <Text style={s.sectionHeader}>
                Now playing{context ? ` from ${context.name}` : ''}
              </Text>
              <QueueRowItem
                row={currentRow}
                isCurrent
                onPlay={() => router.push('/now-playing' as any)}
                onRemove={() => removeAt(currentRow.index)}
                onOptions={() => setOptionsTrack(currentRow.track)}
              />
            </View>
          )}

          {userTier.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionHeader}>
                Next in queue ({userTier.length})
              </Text>
              {userTier.map((row) => (
                <QueueRowItem
                  key={row.entry.entryId}
                  row={row}
                  isCurrent={false}
                  onPlay={() => playEntry(row)}
                  onRemove={() => removeAt(row.index)}
                  onOptions={() => setOptionsTrack(row.track)}
                />
              ))}
            </View>
          )}

          {contextTier.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionHeader}>
                {context ? `Next from ${context.name}` : 'Next up'} ({contextTier.length})
              </Text>
              {contextTier.map((row) => (
                <QueueRowItem
                  key={row.entry.entryId}
                  row={row}
                  isCurrent={false}
                  onPlay={() => playEntry(row)}
                  onRemove={() => removeAt(row.index)}
                  onOptions={() => setOptionsTrack(row.track)}
                />
              ))}
            </View>
          )}

          {upcomingRows.length === 0 && (
            <View style={s.section}>
              <Text style={s.endOfQueue}>
                Nothing queued after this track. Add tracks from any menu, or turn on
                auto-queue in Settings to keep it going.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={s.transportRow}>
          <Pressable
            onPress={toggleShuffle}
            hitSlop={8}
            style={s.transportBtn}
            accessibilityRole="switch"
            accessibilityLabel="Shuffle"
            accessibilityState={{ checked: shuffle }}
          >
            <Icon name="shuffle" size={20} color={shuffle ? '#00e5bf' : '#ffffff'} />
          </Pressable>
          <Pressable
            onPress={() => audioService.playPrevious()}
            hitSlop={8}
            style={s.transportBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous track"
          >
            <Icon name="play-skip-back" size={24} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={handleTogglePlay}
            hitSlop={8}
            style={s.transportBtn}
            disabled={!currentTrack}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            accessibilityState={{ disabled: !currentTrack }}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={32} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => audioService.playNextInQueue()}
            hitSlop={8}
            style={s.transportBtn}
            disabled={upcomingRows.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Next track"
            accessibilityState={{ disabled: upcomingRows.length === 0 }}
          >
            <Icon
              name="play-skip-forward"
              size={24}
              color={upcomingRows.length === 0 ? '#5a5a5e' : '#ffffff'}
            />
          </Pressable>
          <Pressable
            onPress={handleRepeatToggle}
            hitSlop={8}
            style={s.transportBtn}
            accessibilityRole="button"
            accessibilityLabel={repeatLabel}
          >
            <Icon name="repeat" size={20} color={repeat !== 'off' ? '#00e5bf' : '#ffffff'} />
          </Pressable>
        </View>
      </View>

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
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 15,
    color: '#00e5bf',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  endOfQueue: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 20,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 8,
    gap: 12,
  },
  trackRowPressed: {
    opacity: 0.6,
  },
  trackArt: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#1c1c1e',
  },
  trackArtPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackMeta: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  trackTitleCurrent: {
    color: '#00e5bf',
  },
  trackArtist: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  rowAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyBody: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#2c2c2e',
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2c2c2e',
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transportBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
