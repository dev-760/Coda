import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../../src/components/ui/Icon';
import CoverThumb from '../../src/components/ui/CoverThumb';
import { TrackRow } from '../../src/components/ui/TrackRow';
import {
  Button,
  SegmentedControl,
  Banner,
  EmptyState,
} from '../../src/components/ui/primitives';
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
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, r, t } from '../../src/theme/theme';

type SubView = 'playlists' | 'tracks' | 'albums' | 'downloads';

export default function LibraryScreen() {
  const router = useRouter();
  const { playlists, favorites, createPlaylist, updatePlaylist, deletePlaylist, duplicatePlaylist } = useLibraryStore();
  const downloads = useDownloadStore((state) => state.downloads);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const offlineOnly = useSettingsStore((state) => state.offlineMode ?? false);
  const { gutter, maxContentWidth, bottomBarClearance } = useResponsive();

  const [view, setView] = useState<SubView>('playlists');
  const [albumFilter, setAlbumFilter] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  const completedDownloads = useMemo(
    () => downloads.filter((item) => item.status === 'completed'),
    [downloads],
  );

  /** Saved albums derived from favorite tracks and playlists */
  const savedAlbums = useMemo(() => {
    const byKey = new Map<string, { id: string; title: string; artist: string; coverUrl: string }>();

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

  const playTrack = async (track: Track, context: Track[], index: number, name: string) => {
    if (context.length === 0) return;
    cacheTracks(context);
    useQueueStore.getState().playContext(context, index, { type: 'collection', name });
    await audioService.playTrack(track);
  };

  const playPlaylist = async (playlist: any, shuffle = false) => {
    if (!playlist?.tracks?.length) return;
    cacheTracks(playlist.tracks);
    useQueueStore.getState().playContext(playlist.tracks, 0, {
      type: 'playlist',
      id: playlist.id,
      name: playlist.name,
    });
    if (shuffle) {
      useQueueStore.getState().toggleShuffle();
    }
    await audioService.playTrack(playlist.tracks[0]);
  };

  const segments = [
    { key: 'playlists' as SubView, label: 'Playlists', count: playlists.length },
    { key: 'tracks' as SubView, label: 'Tracks', count: favorites.length },
    { key: 'albums' as SubView, label: 'Albums', count: savedAlbums.length },
    { key: 'downloads' as SubView, label: 'Downloads', count: completedDownloads.length },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingHorizontal: gutter,
            paddingBottom: bottomBarClearance,
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={s.headerRow}>
          <View style={s.headerTitles}>
            <Text style={s.screenTitle}>Collection</Text>
          </View>
        </View>

        <SegmentedControl
          segments={segments}
          selected={view}
          onSelect={(key) => setView(key)}
        />

        {offlineOnly && (
          <Banner
            type="offline"
            title="Offline Mode Active"
            body="Showing music saved on this device. Downloads remain playable."
          />
        )}

        {/* 1. PLAYLISTS VIEW */}
        {view === 'playlists' && (
          <View style={s.viewSection}>
            <View style={s.sectionActionRow}>
              <Text style={s.sectionCount}>
                {`${playlists.length} ${playlists.length === 1 ? 'PLAYLIST' : 'PLAYLISTS'}`}
              </Text>
              <Button
                label="New playlist"
                variant="secondary"
                icon="plus"
                onPress={() => setCreateVisible(true)}
              />
            </View>

            {playlists.length === 0 ? (
              <EmptyState
                icon="playlist"
                title="No playlists yet"
                body="Group tracks for a mood, a place or a label. Playlists sync to every device."
                actionLabel="New playlist"
                onAction={() => setCreateVisible(true)}
              />
            ) : (
              <View style={s.mediaList}>
                {playlists.map((playlist) => (
                  <Pressable
                    key={playlist.id}
                    onPress={() => void playPlaylist(playlist)}
                    style={({ pressed }) => [s.mediaRow, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Play playlist ${playlist.name}`}
                  >
                    <CoverThumb
                      uri={playlist.coverUrl}
                      size={56}
                      borderRadius={12}
                    />
                    <View style={s.mediaMeta}>
                      <Text numberOfLines={1} style={s.mediaTitle}>
                        {playlist.name}
                      </Text>
                      <Text numberOfLines={1} style={s.mediaSub}>
                        {`Playlist · ${playlist.tracks.length} ${
                          playlist.tracks.length === 1 ? 'track' : 'tracks'
                        }`}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setSelectedPlaylist(playlist);
                        setActionsVisible(true);
                      }}
                      hitSlop={10}
                      style={s.moreBtn}
                    >
                      <Icon name="chevron-right" size={18} color={colors.textTertiary} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 2. SAVED TRACKS VIEW */}
        {view === 'tracks' && (
          <View style={s.viewSection}>
            <Text style={s.sectionCount}>
              {`${favorites.length} TRACKS · RECENTLY ADDED`}
            </Text>

            {favorites.length === 0 ? (
              <EmptyState
                icon="plus"
                title="No saved tracks"
                body="Tap the pin on any track and it lands here, newest first."
                actionLabel="Explore music"
                onAction={() => router.push('/search' as any)}
              />
            ) : (
              <View style={s.tracksList}>
                {favorites.map((track, index) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      isActive={isCurrent}
                      isPlaying={isCurrent && isPlaying}
                      onPress={() => void playTrack(track, favorites, index, 'Saved Tracks')}
                      onLongPress={() => setOptionsTrack(track)}
                      onMore={() => setOptionsTrack(track)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* 3. SAVED ALBUMS VIEW */}
        {view === 'albums' && (
          <View style={s.viewSection}>
            <View style={s.searchFilterBox}>
              <Icon name="search" size={16} color={colors.textTertiary} />
              <TextInput
                style={s.filterInput}
                placeholder="Filter saved albums"
                placeholderTextColor={colors.textTertiary}
                value={albumFilter}
                onChangeText={setAlbumFilter}
              />
              {!!albumFilter && (
                <Pressable onPress={() => setAlbumFilter('')} hitSlop={8}>
                  <Icon name="close" size={16} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {filteredAlbums.length === 0 ? (
              <EmptyState
                icon="album"
                title="No saved albums"
                body="Save whole records to keep sequencing and liner notes together."
                actionLabel="Browse labels"
                onAction={() => router.push('/search' as any)}
              />
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
                    style={({ pressed }) => [s.albumGridCard, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open album ${album.title} by ${album.artist}`}
                  >
                    <CoverThumb
                      uri={album.coverUrl}
                      size={160}
                      borderRadius={12}
                    />
                    <Text numberOfLines={1} style={s.albumTitle}>
                      {album.title}
                    </Text>
                    <Text numberOfLines={1} style={s.albumArtist}>
                      {album.artist}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 4. DOWNLOADS VIEW */}
        {view === 'downloads' && (
          <View style={s.viewSection}>

            {completedDownloads.length === 0 ? (
              <EmptyState
                icon="download"
                title="Nothing downloaded yet"
                body="Download albums and playlists to listen without a connection, at full quality."
                actionLabel="Browse Explore"
                onAction={() => router.push('/search' as any)}
              />
            ) : (
              <View style={s.tracksList}>
                <View style={s.sectionActionRow}>
                  <Text style={s.sectionCount}>
                    {`ON THIS DEVICE · ${completedDownloads.length} TRACKS`}
                  </Text>
                  <Button
                    label="Manage"
                    variant="secondary"
                    size="sm"
                    icon="download"
                    onPress={() => router.push('/downloads' as any)}
                  />
                </View>
                {completedDownloads.map((item, index) => {
                  const track: Track = item.track;
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <TrackRow
                      key={item.trackId}
                      track={track}
                      index={index}
                      isActive={isCurrent}
                      isPlaying={isCurrent && isPlaying}
                      onPress={() => {
                        const allTracks = completedDownloads.map((d) => d.track);
                        void playTrack(track, allTracks, index, 'Downloads');
                      }}
                      onLongPress={() => setOptionsTrack(track)}
                      onMore={() => setOptionsTrack(track)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <CreatePlaylistModal
        visible={createVisible}
        initialPlaylist={editingPlaylist}
        onCreate={async (name, description, color, icon) => {
          if (editingPlaylist) {
            await updatePlaylist(editingPlaylist.id, { name, description, color, icon });
            setEditingPlaylist(null);
          } else {
            await createPlaylist(name, description, color, icon);
          }
          setCreateVisible(false);
        }}
        onClose={() => {
          setEditingPlaylist(null);
          setCreateVisible(false);
        }}
      />

      <PlaylistActionsModal
        visible={actionsVisible}
        playlist={selectedPlaylist}
        onClose={() => setActionsVisible(false)}
        onEdit={() => {
          setEditingPlaylist(selectedPlaylist);
          setCreateVisible(true);
        }}
        onPlay={() => {
          if (selectedPlaylist && selectedPlaylist.tracks.length > 0) {
            void playPlaylist(selectedPlaylist);
          }
        }}
        onShufflePlay={() => {
          if (selectedPlaylist && selectedPlaylist.tracks.length > 0) {
            void playPlaylist(selectedPlaylist, true);
          }
        }}
        onShare={async () => {
          if (selectedPlaylist) {
            try {
              await Share.share({
                message: `Listen to "${selectedPlaylist.name}" on Luma`,
              });
            } catch {}
          }
        }}
        onDuplicate={() => {
          if (selectedPlaylist) void duplicatePlaylist(selectedPlaylist.id);
        }}
        onDelete={() => {
          if (selectedPlaylist) void deletePlaylist(selectedPlaylist.id);
        }}
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 20,
  },
  pressed: {
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  headerTitles: {
    gap: 4,
  },
  eyebrow: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  screenTitle: {
    ...t.display,
    color: colors.onSurface,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewSection: {
    gap: 16,
  },
  sectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCount: {
    ...t.label,
    color: colors.textTertiary,
  },

  mediaList: {
    gap: 8,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: r.lg,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  mediaMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  mediaTitle: {
    ...t.bodyStrong,
    color: colors.onSurface,
  },
  mediaSub: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  moreBtn: {
    padding: 8,
  },

  tracksList: {
    gap: 4,
  },

  searchFilterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  filterInput: {
    flex: 1,
    ...t.body,
    color: colors.onSurface,
  },

  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  albumGridCard: {
    width: '47%',
    gap: 6,
  },
  albumTitle: {
    ...t.bodyStrong,
    color: colors.onSurface,
    marginTop: 4,
  },
  albumArtist: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
});
