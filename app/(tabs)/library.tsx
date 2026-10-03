import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import HeaderBar from '../../src/components/ui/HeaderBar';
import { useResponsive } from '../../src/hooks/useResponsive';
import Icon from '../../src/components/ui/Icon';
import CoverThumb from '../../src/components/ui/CoverThumb';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import { useLibraryStore } from '../../src/store/libraryStore';
import { useQueueStore } from '../../src/store/queueStore';
import { audioService } from '../../src/audio/AudioService';
import { Track } from '../../src/providers/types';
import { CreatePlaylistModal } from '../../src/components/playlist/CreatePlaylistModal';
import { PlaylistActionsModal } from '../../src/components/playlist/PlaylistActionsModal';
import { colors, FONTS } from '../../src/theme/theme';

type SubView = 'root' | 'mixes' | 'playlists' | 'albums' | 'tracks';

export default function LibraryScreen() {
  const router = useRouter();
  const { bottomBarClearance } = useResponsive();
  const [currentView, setCurrentView] = useState<SubView>('root');
  const [albumFilter, setAlbumFilter] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  const { playlists, favorites, createPlaylist } = useLibraryStore();

  // Albums are derived from tracks the user actually saved, so the grid only
    // ever shows real, reachable albums rather than a hardcoded sample.
    const savedAlbums = useMemo(() => {
      const byKey = new Map<string, {
        id: string;
        title: string;
        artist: string;
        coverUrl: string;
        year: string;
        explicit: boolean;
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
          year: '',
          explicit: false,
        });
      };

      for (const track of favorites) consider(track);
      for (const playlist of playlists) {
        for (const entry of playlist.tracks) {
          consider(entry as unknown as Track);
        }
      }
      return [...byKey.values()];
    }, [favorites, playlists]);

    const filteredAlbums = savedAlbums.filter((a) =>
      a.title.toLowerCase().includes(albumFilter.toLowerCase()) ||
      a.artist.toLowerCase().includes(albumFilter.toLowerCase()),
    );

  // 1. Root Collection Menu (Screenshot 4)
  const renderRootView = () => (
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>Collection</Text>

      <View style={s.menuList}>
        <Pressable style={s.menuRow} onPress={() => setCurrentView('mixes')}>
          <View style={s.menuLeft}>
            <Icon name="radio-outline" size={24} color={colors.onSurface} />
            <Text style={s.menuLabel}>Mixes & Radio</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </Pressable>

        <Pressable style={s.menuRow} onPress={() => setCurrentView('playlists')}>
          <View style={s.menuLeft}>
            <Icon name="musical-notes-outline" size={24} color={colors.onSurface} />
            <Text style={s.menuLabel}>Playlists</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </Pressable>

        <Pressable style={s.menuRow} onPress={() => setCurrentView('albums')}>
          <View style={s.menuLeft}>
            <Icon name="disc-outline" size={24} color={colors.onSurface} />
            <Text style={s.menuLabel}>Albums</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
        </Pressable>

        <Pressable style={s.menuRow} onPress={() => setCurrentView('tracks')}>
          <View style={s.menuLeft}>
            <Icon name="musical-note-outline" size={24} color={colors.onSurface} />
            <Text style={s.menuLabel}>Tracks</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              </ScrollView>
            );

  // 2. Mixes and radio
  const renderMixesView = () => (
    <View style={s.emptyContainer}>
      <View style={s.emptyCenter}>
        <Icon name="radio-outline" size={80} color={colors.onSurfaceVariant} />
        <Text style={s.emptyText}>
          No mixes or radio stations yet. Favorite a track and its radio station shows up here.
        </Text>
        <Pressable
          style={s.darkPillBtn}
          onPress={() => router.push('/(tabs)/search' as any)}
          accessibilityRole="button"
          accessibilityLabel="Go to Explore"
        >
          <Text style={s.darkPillText}>Find music</Text>
        </Pressable>
      </View>
    </View>
  );

  // 3. Playlists (Screenshot 7)
  const renderPlaylistsView = () => {
    if (playlists.length === 0) {
      return (
        <View style={s.emptyContainer}>
          <View style={s.emptyCenter}>
            <Text style={s.emptyTitle}>Playlists</Text>
            <Text style={s.emptyText}>
              You haven&rsquo;t added any playlists yet. Tap the heart icon on any playlist to add it to your collection.
            </Text>
            <View style={s.buttonsRow}>
              <Pressable style={s.whitePillBtn} onPress={() => setCreateModalVisible(true)}>
                <Text style={s.whitePillText}>Create new</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}>
        <View style={s.headerRow}>
          <Pressable style={s.whitePillBtn} onPress={() => setCreateModalVisible(true)}>
            <Icon name="add" size={18} color={colors.background} />
            <Text style={s.whitePillText}>Create new playlist</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10, marginTop: 12 }}>
          {playlists.map((pl) => (
            <Pressable
              key={pl.id}
              style={s.playlistRow}
              onPress={() => {
                if (pl.tracks.length > 0) {
                                useQueueStore.getState().playContext(pl.tracks, 0, {
                                  type: 'playlist',
                                  id: pl.id,
                                  name: pl.name,
                                });
                                void audioService.playTrack(pl.tracks[0]);
                              } else {
                                Alert.alert('Empty Playlist', 'Add tracks to this playlist first.');
                              }
                            }}
            >
              <View style={s.playlistArt}>
                <Icon name="musical-notes" size={24} color={colors.onSurfaceVariant} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.playlistTitle}>{pl.name}</Text>
                <Text style={s.playlistCount}>{pl.tracks.length} tracks</Text>
              </View>
              <Pressable
                onPress={() => {
                  setSelectedPlaylist(pl);
                  setActionsModalVisible(true);
                }}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Icon name="ellipsis-horizontal" size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  };

  // 4. Albums (Screenshot 6)
  const renderAlbumsView = () => (
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }, s.fillContent]} showsVerticalScrollIndicator={false}>
      {/* Search / Filter bar */}
      <View style={s.filterBar}>
        <Icon name="search" size={18} color={colors.onSurfaceVariant} />
        <TextInput
          style={s.filterInput}
          placeholder="Filter albums"
          placeholderTextColor={colors.onSurfaceVariant}
          value={albumFilter}
          onChangeText={setAlbumFilter}
        />
        {!!albumFilter && (
          <Pressable onPress={() => setAlbumFilter('')} hitSlop={8}>
            <Icon name="close" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        )}
      </View>

      {/* Albums Grid */}
            {filteredAlbums.length === 0 ? (
                          <View style={s.emptyCenterFill}>
                <Icon name="albums-outline" size={64} color={colors.onSurfaceVariant} />
                <Text style={s.emptyText}>
                  {savedAlbums.length === 0
                    ? 'No saved albums yet. Favorite a track and the album it belongs to shows up here.'
                    : 'No albums match that filter.'}
                </Text>
              </View>
            ) : (
              <View style={s.albumGrid}>
                {filteredAlbums.map((album) => (
                  <Pressable
                    key={album.id}
                    style={s.albumCard}
                    onPress={() => {
                      router.push({
                        pathname: '/album' as any,
                        params: {
                          title: album.title,
                          artist: album.artist,
                          coverUrl: album.coverUrl,
                        },
                      });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open album ${album.title} by ${album.artist}`}
                  >
                    {album.coverUrl ? (
                      <Image source={{ uri: album.coverUrl }} style={s.albumCover} />
                    ) : (
                      <View style={[s.albumCover, s.albumCoverFallback]}>
                        <Icon name="albums-outline" size={28} color={colors.onSurfaceVariant} />
                      </View>
                    )}
                    <View style={s.albumMeta}>
                      <View style={s.albumTitleRow}>
                        <Text numberOfLines={1} style={s.albumTitle}>{album.title}</Text>
                      </View>
                      <Text numberOfLines={1} style={s.albumArtist}>{album.artist}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        );

  // 5. Tracks View
  const renderTracksView = () => (
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }, s.fillContent]} showsVerticalScrollIndicator={false}>
      {favorites.length === 0 ? (
          <View style={s.emptyCenterFill}>
          <Icon name="heart-outline" size={64} color={colors.onSurfaceVariant} />
          <Text style={s.emptyText}>No favorite tracks yet. Tap heart on any track to add it here.</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {favorites.map((track, index) => (
            <Pressable
              key={track.id}
              style={s.trackRow}
                        onPress={() => {
                          useQueueStore.getState().playContext(favorites, index, {
                            type: 'collection',
                            name: 'Favorites',
                          });
                          void audioService.playTrack(track);
                        }}
                      >
              <CoverThumb uri={track.coverUrl} size={48} borderRadius={4} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.trackTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={s.trackArtist}>{track.artist}</Text>
              </View>
              <Pressable onPress={() => setOptionsTrack(track)} hitSlop={8} style={{ padding: 6 }}>
                <Icon name="ellipsis-horizontal" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'albums': return 'Albums';
      case 'playlists': return 'Playlists';
      case 'mixes': return '';
      case 'tracks': return 'Tracks';
            default: return undefined;
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <HeaderBar
              showBack={currentView !== 'root'}
              onBack={() => setCurrentView('root')}
              title={getHeaderTitle()}
            />

      {currentView === 'root' && renderRootView()}
      {currentView === 'mixes' && renderMixesView()}
      {currentView === 'playlists' && renderPlaylistsView()}
      {currentView === 'albums' && renderAlbumsView()}
      {currentView === 'tracks' && renderTracksView()}

      {/* Modals */}
      <CreatePlaylistModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={async (name, desc) => {
          await createPlaylist(name, desc);
          setCreateModalVisible(false);
        }}
      />

      <PlaylistActionsModal
        visible={actionsModalVisible}
        onClose={() => setActionsModalVisible(false)}
        playlist={selectedPlaylist}
        onPlay={() => {
          if (selectedPlaylist?.tracks?.length > 0) {
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
            setActionsModalVisible(false);
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
  content: {
      paddingHorizontal: 16,
      gap: 16,
    },
  pageTitle: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  menuList: {
    gap: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainer,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuLabel: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyCenter: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 320,
  },
    /** Lets a scroll view's empty state fill it so the message sits centered. */
    fillContent: {
      flexGrow: 1,
    },
    /** Centered empty state for views that scroll. */
    emptyCenterFill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      maxWidth: 320,
      alignSelf: 'center',
      width: '100%',
    },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptyText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  whitePillBtn: {
    backgroundColor: colors.onSurface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whitePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  darkPillBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  darkPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  filterInput: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 15,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  albumCard: {
    flex: 1,
    gap: 6,
  },
  albumCover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainer,
  },
  albumMeta: {
    gap: 2,
  },
  albumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  albumTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    flexShrink: 1,
  },
  albumCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  explicitBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  explicitText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurface,
  },
  albumArtist: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  albumYear: {
    fontSize: 11,
    color: '#636366',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 8,
  },
  playlistArt: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistTitle: {
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  playlistCount: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  trackArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainer,
  },
  trackTitle: {
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  trackArtist: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
});
