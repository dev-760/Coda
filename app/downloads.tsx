import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
    StyleSheet,
    Alert,
  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import CoverThumb from '../src/components/ui/CoverThumb';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { audioService } from '../src/audio/AudioService';
import { useQueueStore } from '../src/store/queueStore';
import { formatBytes } from '../src/utils/formatting';
import { DownloadMetadata } from '../src/downloads/downloadTypes';
import { colors, FONTS } from '../src/theme/theme';

type Filter = 'all' | 'completed' | 'downloading';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Ready' },
  { value: 'downloading', label: 'Downloading' },
];

function cleanErrorMessage(msg?: string): string {
  if (!msg) return 'Download failed';
  const lower = msg.toLowerCase();
  if (lower.includes('expected url scheme') || lower.includes('manifest cannot be downloaded')) {
    return 'Stream requires assembly';
  }
  if (lower.includes('enospc') || lower.includes('space')) {
    return 'Storage full';
  }
  if (lower.includes('abort') || lower.includes('cancel')) {
    return 'Cancelled';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('connection')) {
    return 'Connection dropped';
  }
  return msg.length > 32 ? `${msg.slice(0, 32)}…` : msg;
}

export default function DownloadsScreen() {
  const router = useRouter();
  const downloads = useDownloadStore((state) => state.downloads);
  const deleteDownload = useDownloadStore((state) => state.deleteDownload);
  const deleteAllDownloads = useDownloadStore((state) => state.deleteAllDownloads);
  const retryDownload = useDownloadStore((state) => state.retryDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);

  const [filter, setFilter] = useState<Filter>('all');
  const [sortDescending, setSortDescending] = useState(true);

  const filtered = useMemo(() => {
    const matching = filter === 'all'
      ? downloads
      : downloads.filter((d) =>
          filter === 'downloading'
            ? d.status === 'downloading' || d.status === 'pending' || d.status === 'paused'
            : d.status === filter,
        );

    return [...matching].sort((a, b) =>
      sortDescending ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    );
  }, [downloads, filter, sortDescending]);

  const totalBytes = useMemo(
    () => downloads
      .filter((d) => d.status === 'completed')
      .reduce((sum, d) => sum + (d.downloadedBytes || 0), 0),
    [downloads],
  );

  const playAll = async () => {
    const ready = downloads.filter((d) => d.status === 'completed' && d.filePath);
      if (ready.length === 0) return;
      const tracks = ready.map((d) => d.track);
      useQueueStore.getState().playContext(tracks, 0, {
        type: 'collection',
        name: 'Downloads',
      });
      await audioService.playTrack(tracks[0]);
    };

  const confirmDelete = (item: DownloadMetadata) => {
    Alert.alert(
      `Delete ${item.track.title}?`,
      'This removes the downloaded file from this device. You can download it again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteDownload(item.trackId) },
      ],
    );
  };

  const renderItem = ({ item }: { item: DownloadMetadata }) => {
    const track = item.track;
    const inProgress = item.status === 'downloading' || item.status === 'pending' || item.status === 'paused';

    return (
      <View style={s.row}>
        <Pressable
          style={s.rowMain}
          onPress={() => {
                      if (item.status === 'completed') {
                        const ready = downloads
                          .filter((d) => d.status === 'completed' && d.filePath)
                          .map((d) => d.track);
                        const index = Math.max(
                          0,
                          ready.findIndex((t) => t.id === track.id),
                        );
                        useQueueStore.getState().playContext(ready, index, {
                          type: 'collection',
                          name: 'Downloads',
                        });
                        void audioService.playTrack(track);
                      }
                    }}
          disabled={item.status !== 'completed'}
          accessibilityRole="button"
          accessibilityLabel={`${track.title} by ${track.artist}`}
        >
          <CoverThumb uri={track.coverUrl} size={48} borderRadius={6} />

          <View style={s.meta}>
            <Text numberOfLines={1} style={s.title}>{track.title}</Text>
            <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>

            {inProgress ? (
              <View style={s.progressBlock}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${item.progress}%` }]} />
                </View>
                <Text style={s.statusText}>
                  {item.status === 'paused'
                    ? 'Paused'
                    : item.status === 'pending'
                      ? 'Waiting to start'
                      : `Downloading · ${item.progress}%`}
                </Text>
              </View>
            ) : item.status === 'completed' ? (
              <View style={s.completedRow}>
                <View style={s.completedDot} />
                <Text style={s.completedText}>
                  {formatBytes(item.downloadedBytes)} · {item.quality}
                </Text>
              </View>
            ) : (
              <View style={s.errorBadge}>
                <Icon name="alert-circle" size={13} color={colors.error} />
                <Text numberOfLines={1} style={s.errorText}>
                  {cleanErrorMessage(item.errorMessage)}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {inProgress ? (
          <Pressable
            style={({ pressed }) => [s.action, pressed && s.actionPressed]}
            onPress={() => void cancelDownload(item.trackId)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Cancel download of ${track.title}`}
          >
            <Icon name="close" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        ) : item.status === 'failed' ? (
          <Pressable
            style={({ pressed }) => [s.action, pressed && s.actionPressed]}
            onPress={() => void retryDownload(item.trackId)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Retry download of ${track.title}`}
          >
            <Icon name="refresh" size={20} color={colors.primary} />
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [s.action, pressed && s.actionPressed]}
          onPress={() => confirmDelete(item)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${track.title}`}
        >
          <Icon name="trash-outline" size={20} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.navigate('/(tabs)/library'))}
          style={s.headerBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={s.headerTitle}>Downloads</Text>
        <Pressable
          onPress={() => setSortDescending((value) => !value)}
          style={s.headerAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={sortDescending ? 'Sort oldest first' : 'Sort newest first'}
        >
          <Text style={s.headerActionText}>
            {sortDescending ? 'Newest' : 'Oldest'}
          </Text>
        </Pressable>
      </View>

      {downloads.length > 0 && (
        <View style={s.summaryBar}>
          <Text style={s.summaryText}>
            {downloads.filter((d) => d.status === 'completed').length} ready · {formatBytes(totalBytes)} used
          </Text>
          <Pressable
            onPress={playAll}
            hitSlop={8}
            style={s.summaryAction}
            accessibilityRole="button"
            accessibilityLabel="Play all downloads"
          >
            <Text style={s.summaryActionText}>Play all</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Delete all downloads',
                'Every downloaded track is removed from this device. Playlists are not affected.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete all', style: 'destructive', onPress: () => void deleteAllDownloads() },
                ],
              )
            }
            hitSlop={8}
            style={s.summaryAction}
            accessibilityRole="button"
            accessibilityLabel="Delete all downloads"
          >
            <Text style={s.summaryActionText}>Delete all</Text>
          </Pressable>
        </View>
      )}

      <View style={s.filterRow}>
        {FILTERS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setFilter(option.value)}
            style={({ pressed }) => [
              s.filterChip,
              filter === option.value && s.filterChipSelected,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: filter === option.value }}
          >
            <Text style={[s.filterText, filter === option.value && s.filterTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.trackId}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>
              {downloads.length === 0 ? 'No downloads yet' : 'Nothing in this filter'}
            </Text>
            <Text style={s.emptyBody}>
              {downloads.length === 0
                ? 'Open an album and tap Download to keep music on this device for airplane mode.'
                : 'Try a different filter to see your other downloads.'}
            </Text>
            {downloads.length === 0 && (
              <Pressable
                onPress={() => router.push('/(tabs)' as any)}
                style={s.emptyButton}
                accessibilityRole="button"
                accessibilityLabel="Go to Home"
              >
                <Text style={s.emptyButtonText}>Go to Home</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerAction: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerActionText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  summaryAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  summaryActionText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
  },
  filterChipSelected: {
    backgroundColor: 'rgba(0, 229, 191, 0.14)',
  },
  filterText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  filterTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    gap: 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainer,
  },
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSurface,
  },
  artist: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  completedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHighest,
    alignSelf: 'flex-start',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.error,
  },
  progressBlock: {
    marginTop: 6,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.accent,
  },
  action: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  actionPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }],
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
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
    paddingVertical: 12,
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
});