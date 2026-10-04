import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../../src/components/ui/Icon';
import { Pill, Toggle } from '../../src/components/ui/primitives';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import { CreatePlaylistModal } from '../../src/components/playlist/CreatePlaylistModal';
import { PlaylistActionsModal } from '../../src/components/playlist/PlaylistActionsModal';
import { useLibraryStore } from '../../src/store/libraryStore';
import { useDownloadStore } from '../../src/downloads/downloadStore';
import { usePlaybackStore } from '../../src/store/playbackStore';
import { useQueueStore, cacheTracks } from '../../src/store/queueStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { audioService } from '../../src/audio/AudioService';
import { Track } from '../../src/providers/types';
import { colors, FONTS, r, t } from '../../src/theme/theme';

/**
 * Collection holds one subview at a time, chosen by the pill row rather than a
 * menu that pushes a second screen. Playlists, Albums and Tracks stay as tabs
 * so switching is instant, and the download count sits alongside them.
 */
type SubView = 'playlists' | 'albums' | 'tracks';

const SUBVIEWS: { key: SubView; label: string }[] = [
  { key: 'playlists', label: 'Playlists' },
  { key: 'albums', label: 'Albums' },
  { key: 'tracks', label: 'Tracks' },
];

type SortMode = 'recent' | 'alpha' | 'count';

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Recently Added',
  alpha: 'Alphabetical',
  count: 'Most Tracks',
};

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function LibraryScreen() {
  const router = useRouter();
  const { playlists, favorites, createPlaylist } = useLibraryStore();
  const downloads = useDownloadStore((state) => state.downloads);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const offlineOnly = useSettingsStore((state) => state.offlineMode ?? false);
  const setOfflineMode = useSettingsStore((state) => state.setOfflineMode);

  const [view, setView] = useState<SubView>('playlists');
  const [sort, setSort] = useState<SortMode>('recent');
  const [albumFilter, setAlbumFilter] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  const completedCount = useMemo(
    () => downloads.filter((item) => item.status === 'completed').length,
    [downloads],
  );

  /**
   * Albums are derived from tracks the user actually saved, so the grid only
   * ever shows real, reachable albums rather than a hardcoded sample.
   */
  const savedAlbums = useMemo(() => {
    const byKey = new Map<string, {
      id: string;
      title: string;
      artist: string;
      coverUrl: string;
    }>();

    const consider = (track: Track) => {
      if (!track.album) return;
      const key = `${track.artist}|${track.album}`;
      if (byKey.has(key)) return;
      byKey.set(key, {
        id: key,
        title: track.album as string,
        artist: track.artist,
        coverUrl: track.coverUrl ?? '',
      });
    };

    for (const track of favorites) consider(track);
    for (const playlist of playlists) {
      for (const entry of playlist.tracks) consider(entry as unknown as Track);
    }
    return [...byKey.values()];
  }, [favorites, playlists]);

  const filteredAlbums = useMemo(() => {
    const term = albumFilter.trim().toLowerCase();
    if (!term) return savedAlbums;
    return savedAlbums.filter(
      (album) =>
        album.title.toLowerCase().includes(term) ||
        album.artist.toLowerCase().includes(term),
    );
  }, [savedAlbums, albumFilter]);

  /** Curations, ordered by the active sort mode. */
  const sortedLists = useMemo(() => {
    const lists = [...playlists];
    if (sort === 'alpha') return lists.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'count') return lists.sort((a, b) => b.tracks.length - a.tracks.length);
    return lists;
  }, [playlists, sort]);

  const playTrack = async (track: Track, context: Track[], index: number, name: string) => {
    if (context.length === 0) return;
    cacheTracks(context);
    useQueueStore.getState().playContext(context, index, { type: 'collection', name });
    await audioService.playTrack(track);
  };

  const playPlaylist = async (playlist: any) => {
    if (!playlist?.tracks?.length) return;
    cacheTracks(playlist.tracks);
    useQueueStore.getState().playContext(playlist.tracks, 0, {
      type: 'playlist',
      id: playlist.id,
      name: playlist.name,
    });
    await audioService.playTrack(playlist.tracks[0]);
  };

  const cycleSort = () => {
    setSort((prev) => (prev === 'recent' ? 'alpha' : prev === 'alpha' ? 'count' : 'recent'));
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Pinned subview pills, with downloads as the fourth */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
          {SUBVIEWS.map((item) => (
            <Pill
              key={item.key}
              label={item.label}
              selected={view === item.key}
              onPress={() => setView(item.key)}
            />
          ))}
          <Pill
            label="Downloads"
            icon={completedCount > 0 ? 'ellipse' : undefined}
            onPress={() => router.push('/downloads' as any)}
            accessibilityLabel={`Downloads, ${completedCount} on this device`}
          />
        </ScrollView>

        {/* Quick actions */}
        <View style={s.actionBar}>
          <Pressable
            onPress={cycleSort}
            style={({ pressed }) => [s.sortButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Sort: ${SORT_LABELS[sort]}. Tap to change.`}
          >
            <Icon name="swap-vertical" size={14} color={colors.onSurfaceVariant} />
            <Text style={s.sortText}>{SORT_LABELS[sort]}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/search' as any)}
            style={({ pressed }) => [s.circleButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Search your library"
          >
            <Icon name="search" size={16} color={colors.onSurfaceVariant} />
          </Pressable>

          <Pressable
            onPress={() => setCreateVisible(true)}
            style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="New playlist"
          >
            <Icon name="add" size={16} color={colors.onPrimary} />
            <Text style={s.primaryText}>New Playlist</Text>
          </Pressable>
        </View>

        {/* Offline mode */}
        <View style={s.offlineRow}>
          <View style={s.offlineIcon}>
            <Icon name="cloud-offline-outline" size={18} color={colors.onSurface} />
          </View>
          <View style={s.offlineMeta}>
            <Text style={s.offlineTitle}>Offline Mode</Text>
            <Text style={s.offlineBody}>Only play downloaded music</Text>
          </View>
          <Toggle
            value={offlineOnly}
            onChange={(next) => setOfflineMode(next)}
            accessibilityLabel="Offline mode"
          />
        </View>

        {/* Curations */}
        <View style={s.block}>
          <View style={s.blockHeader}>
            <Text style={s.blockTitle}>Playlists</Text>
            <Text style={s.blockCount}>
              {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
            </Text>
          </View>

          {sortedLists.length === 0 ? (
            <View style={s.emptyBlock}>
              <Text style={s.emptyText}>
                No curations yet. Create a playlist, or favorite a track to seed one.
              </Text>
              <Pressable
                onPress={() => setCreateVisible(true)}
                style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Create your first playlist"
              >
                <Text style={s.primaryText}>Create new</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.list}>
              {sortedLists.map((playlist) => (
                <Pressable
                  key={playlist.id}
                  onPress={() => void playPlaylist(playlist)}
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${playlist.name}, ${playlist.tracks.length} tracks`}
                >
                  {playlist.coverUrl ? (
                    <Image source={{ uri: playlist.coverUrl }} style={s.rowArt} />
                  ) : (
                    <View style={[s.rowArt, s.rowArtFallback]}>
                      <Icon name="heart" size={18} color={colors.onSurface} />
                    </View>
                  )}
                  <View style={s.rowMeta}>
                    <Text numberOfLines={1} style={s.rowTitle}>{playlist.name}</Text>
                    <Text style={s.rowSub}>
                      {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setSelectedPlaylist(playlist);
                      setActionsVisible(true);
                    }}
                    hitSlop={8}
                    style={s.rowMore}
                    accessibilityRole="button"
                    accessibilityLabel={`Options for ${playlist.name}`}
                  >
                    <Icon name="chevron-forward" size={16} color={colors.outlineText} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Favorite tracks */}
        <View style={s.block}>
          <View style={s.blockHeader}>
            <Text style={s.blockTitle}>Favorite Tracks</Text>
            {favorites.length > 0 && (
              <Pressable
                onPress={() => setView('tracks')}
                hitSlop={10}
                style={({ pressed }) => [s.blockAction, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel="View all favorite tracks"
              >
                <Text style={s.blockCount}>VIEW ALL</Text>
              </Pressable>
            )}
          </View>

          {favorites.length === 0 ? (
            <Text style={s.emptyText}>
              No favorite tracks yet. Tap the heart on any track to add one.
            </Text>
          ) : (
            <View style={s.list}>
              {favorites.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <View key={track.id} style={s.row}>
                    {isCurrent ? (
                      <View style={s.liveArt}>
                        <Icon
                          name={isPlaying ? 'stats-chart' : 'pause'}
                          size={16}
                          color={colors.onSurface}
                        />
                      </View>
                    ) : (
                      <Text style={s.rowIndex}>{String(index + 1).padStart(2, '0')}</Text>
                    )}
                    <Pressable
                      onPress={() => void playTrack(track, favorites, index, 'Favorites')}
                      onLongPress={() => setOptionsTrack(track)}
                      style={({ pressed }) => [s.rowMain, pressed && s.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${track.title} by ${track.artist}`}
                    >
                      <View style={s.rowMeta}>
                        <Text numberOfLines={1} style={s.rowTitle}>{track.title}</Text>
                        <View style={s.rowSubLine}>
                          <Text style={s.rowSub} numberOfLines={1}>{track.artist}</Text>
                          {downloads.some(
                            (item) => item.trackId === track.id && item.status === 'completed',
                          ) && (
                            <Icon name="arrow-down-circle" size={13} color={colors.outlineText} />
                          )}
                        </View>
                      </View>
                    </Pressable>
                    <Text style={s.rowDuration}>
                      {track.durationMs ? formatDuration(track.durationMs) : '--:--'}
                    </Text>
                    <Pressable
                      onPress={() => setOptionsTrack(track)}
                      hitSlop={8}
                      style={s.rowMore}
                      accessibilityRole="button"
                      accessibilityLabel={`More options for ${track.title}`}
                    >
                      <Icon name="ellipsis-vertical" size={16} color={colors.outlineText} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Albums, shown when their tab is selected */}
        {view === 'albums' && (
          <View style={s.block}>
            <View style={s.blockHeader}>
              <Text style={s.blockTitle}>Albums</Text>
              <Text style={s.blockCount}>{filteredAlbums.length}</Text>
            </View>

            <View style={s.filterBar}>
              <Icon name="search" size={16} color={colors.outlineText} />
              <TextInput
                style={s.filterInput}
                placeholder="Filter albums"
                placeholderTextColor={colors.outlineText}
                value={albumFilter}
                onChangeText={setAlbumFilter}
              />
              {!!albumFilter && (
                <Pressable
                  onPress={() => setAlbumFilter('')}
                  hitSlop={8}
                  accessibilityLabel="Clear filter"
                >
                  <Icon name="close" size={16} color={colors.outlineText} />
                </Pressable>
              )}
            </View>

            {filteredAlbums.length === 0 ? (
              <Text style={s.emptyText}>
                {savedAlbums.length === 0
                  ? 'No saved albums yet. Favorite a track and its album shows up here.'
                  : 'No albums match that filter.'}
              </Text>
            ) : (
              <View style={s.albumGrid}>
                {filteredAlbums.map((album) => (
                  <Pressable
                    key={album.id}
                    onPress={() =>
                      router.push({
                        pathname: '/album' as any,
                        params: {
                          title: album.title,
                          artist: album.artist,
                          coverUrl: album.coverUrl,
                        },
                      })
                    }
                    style={({ pressed }) => [pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open album ${album.title} by ${album.artist}`}
                  >
                    {album.coverUrl ? (
                      <Image source={{ uri: album.coverUrl }} style={s.albumCover} />
                    ) : (
                      <View style={[s.albumCover, s.rowArtFallback]}>
                        <Icon name="albums-outline" size={24} color={colors.outlineText} />
                      </View>
                    )}
                    <Text numberOfLines={1} style={s.albumTitle}>{album.title}</Text>
                    <Text numberOfLines={1} style={s.albumArtist}>{album.artist}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tracks view reuses the recent list above, so it only needs a marker. */}
        {view === 'tracks' && favorites.length === 0 && (
          <Text style={s.emptyText}>
            No tracks saved yet. Tap the heart on any track to add one.
          </Text>
        )}
      </ScrollView>

      <CreatePlaylistModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={async (name, desc) => {
          await createPlaylist(name, desc);
          setCreateVisible(false);
        }}
      />

      <PlaylistActionsModal
        visible={actionsVisible}
        onClose={() => setActionsVisible(false)}
        playlist={selectedPlaylist}
        onPlay={() => {
          if (selectedPlaylist?.tracks?.length) {
            cacheTracks(selectedPlaylist.tracks);
            useQueueStore.getState().playContext(selectedPlaylist.tracks, 0, {
              type: 'playlist',
              id: selectedPlaylist.id,
              name: selectedPlaylist.name,
            });
            void audioService.playTrack(selectedPlaylist.tracks[0]);
          }
        }}
        onDelete={() => {
          if (selectedPlaylist) {
            useLibraryStore.getState().deletePlaylist(selectedPlaylist.id);
            setActionsVisible(false);
          }
        }}
        onDuplicate={() => {}}
        onEdit={() => {}}
      />

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
    backgroundColor: colors.background,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
      paddingTop: 16,
    paddingBottom: 144,
    gap: 20,
  },
  rail: {
    gap: 8,
    paddingRight: 16,
  },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  sortText: {
    ...t.labelMd,
    color: colors.textSoft,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  primaryButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: r.pill,
    backgroundColor: colors.onSurface,
  },
  primaryText: {
    ...t.labelMd,
    color: colors.onPrimary,
  },

  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  offlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  offlineMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  offlineTitle: {
    ...t.titleMd,
    color: colors.onSurface,
  },
  offlineBody: {
    ...t.bodyMd,
    color: colors.outlineText,
  },

  block: {
    gap: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockHeaderText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTitle: {
    ...t.title,
    color: colors.onSurface,
  },
  blockLabel: {
    ...t.labelSm,
    color: colors.outlineText,
  },
  blockCount: {
    ...t.labelSm,
      color: colors.onSurfaceVariant,
  },
    blockAction: {
      minHeight: 44,
      justifyContent: 'center',
    },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onSurface,
  },

  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    padding: 8,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    justifyContent: 'center',
  },
  rowArt: {
    width: 48,
    height: 48,
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainer,
  },
  rowArtFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  rowIndex: {
    ...t.labelSm,
    width: 28,
    textAlign: 'center',
    color: colors.outlineText,
  },
  liveArt: {
    width: 48,
    height: 48,
    borderRadius: r.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  rowMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowSubLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
    color: colors.onSurface,
  },
  rowSub: {
    ...t.bodyMd,
    flexShrink: 1,
    color: colors.outlineText,
  },
  rowDuration: {
    ...t.mono,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  rowMore: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  filterInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
  },

  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  albumCover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  albumTitle: {
    ...t.body,
    color: colors.onSurface,
    marginTop: 6,
  },
  albumArtist: {
    ...t.bodySm,
    color: colors.outlineText,
  },

  emptyBlock: {
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  emptyText: {
    ...t.bodyMd,
    color: colors.outlineText,
    lineHeight: 18,
  },
});
