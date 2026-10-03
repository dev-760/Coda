import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import HeaderBar from '../../src/components/ui/HeaderBar';
import Icon from '../../src/components/ui/Icon';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import MadeForYou from '../../src/components/discover/MadeForYou';
import { useLibraryStore } from '../../src/store/libraryStore';
import { useDownloadStore } from '../../src/downloads/downloadStore';
import { audioService } from '../../src/audio/AudioService';
import { useQueueStore, cacheTracks } from '../../src/store/queueStore';
import { Track } from '../../src/providers/types';
import { subscribeToConnectivity } from '../../src/services/connectivity';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, FONTS } from '../../src/theme/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { favorites, playlists, recentlyPlayed } = useLibraryStore();
  const downloads = useDownloadStore((state) => state.downloads);
  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
    const [offline, setOffline] = useState(false);

    useEffect(
      () => subscribeToConnectivity((isConnected) => setOffline(!isConnected)),
      [],
    );


  const { bottomBarClearance, gutter } = useResponsive();

  const playTrackWithQueue = async (track: Track, contextName: string) => {
    cacheTracks([track]);
    useQueueStore.getState().playContext([track], 0, { type: 'collection', name: contextName });
    await audioService.playTrack(track);
  };

  const playAllDownloads = async () => {
    const tracks = completedDownloads.map((d) => d.track);
    if (tracks.length === 0) return;
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, 0, { type: 'collection', name: 'Downloads' });
    await audioService.playTrack(tracks[0]);
  };

  const hasAnything = favorites.length > 0 || playlists.length > 0
    || recentlyPlayed.length > 0 || completedDownloads.length > 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <HeaderBar showBack={false} title="Home" />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
        showsVerticalScrollIndicator={false}
      >
        {offline && (
          <View style={s.offlineBanner} accessibilityRole="alert">
            <Icon name="cloud-offline-outline" size={20} color="#ffb340" />
            <Text style={s.offlineText}>
              You are offline. Only downloaded music will play.
            </Text>
            <Pressable
              onPress={() => router.push('/downloads' as any)}
              hitSlop={10}
              style={s.offlineAction}
              accessibilityRole="button"
              accessibilityLabel="Show downloaded music"
            >
              <Text style={s.offlineActionText}>Show downloads</Text>
            </Pressable>
          </View>
        )}

        {!hasAnything ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Icon name="musical-notes-outline" size={32} color={colors.onSurfaceVariant} />
            </View>
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptyBody}>
              {offline
                ? 'You are offline. Download music first, then it will show up here.'
                : 'Search for music and press play, or favorite a track, and this page fills in.'}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/search' as any)}
              style={s.emptyButton}
              accessibilityRole="button"
              accessibilityLabel="Go to Explore"
            >
              <Text style={s.emptyButtonText}>Go to Explore</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* 1. Quick-Access 2-Column Grid for Recently Played (High Density, Fast Access) */}
            {recentlyPlayed.length > 0 && (
              <View style={s.section}>
                <View style={[s.sectionHeaderRow, { paddingHorizontal: gutter }]}>
                  <Text style={s.sectionHeader}>Recently played</Text>
                </View>
                <View style={[s.quickGrid, { paddingHorizontal: gutter }]}>
                  {recentlyPlayed.slice(0, 6).map((track) => (
                    <Pressable
                      key={track.id}
                      style={s.quickGridItem}
                      onPress={() => void playTrackWithQueue(track, 'Recently played')}
                      onLongPress={() => setOptionsTrack(track)}
                      accessibilityRole="button"
                      accessibilityLabel={`${track.title} by ${track.artist}, recently played`}
                    >
                      {track.coverUrl ? (
                        <Image source={{ uri: track.coverUrl }} style={s.quickArtwork} />
                      ) : (
                        <View style={[s.quickArtwork, s.artworkPlaceholder]}>
                          <Icon name="musical-note" size={18} color={colors.onSurfaceVariant} />
                        </View>
                      )}
                      <View style={s.quickMeta}>
                        <Text numberOfLines={1} style={s.quickTitle}>{track.title}</Text>
                        <Text numberOfLines={1} style={s.quickArtist}>{track.artist}</Text>
                      </View>
                      <View style={s.quickPlayIndicator}>
                        <Icon name="play" size={14} color={colors.onSurface} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* 2. On This Device (Featured Offline Section with Play All) */}
            {completedDownloads.length > 0 && (
              <View style={s.section}>
                <View style={[s.sectionHeaderRow, { paddingHorizontal: gutter }]}>
                  <View style={s.headerWithBadge}>
                    <Text style={s.sectionHeader}>On this device</Text>
                    <View style={s.offlineChip}>
                      <View style={s.offlineDot} />
                      <Text style={s.offlineChipText}>{completedDownloads.length}</Text>
                    </View>
                  </View>
                  <View style={s.headerActions}>
                    <Pressable
                      onPress={() => void playAllDownloads()}
                      hitSlop={10}
                      style={s.sectionAction}
                      accessibilityRole="button"
                      accessibilityLabel="Play all downloaded tracks"
                    >
                      <Icon name="play" size={13} color={colors.accent} />
                      <Text style={s.sectionActionText}>Play all</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push('/downloads' as any)}
                      hitSlop={10}
                      style={s.sectionAction}
                      accessibilityRole="button"
                      accessibilityLabel="Open downloads screen"
                    >
                      <Text style={[s.sectionActionText, { color: colors.outlineText }]}>See all</Text>
                    </Pressable>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.rail, { paddingHorizontal: gutter }]}>
                  {completedDownloads.slice(0, 12).map((item) => (
                    <Pressable
                      key={item.trackId}
                      style={s.offlineCard}
                      onPress={() => void playTrackWithQueue(item.track, 'Downloads')}
                      onLongPress={() => setOptionsTrack(item.track)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.track.title} by ${item.track.artist}, downloaded`}
                    >
                      <View style={s.offlineArtWrap}>
                        {item.track.coverUrl ? (
                          <Image source={{ uri: item.track.coverUrl }} style={s.offlineArtwork} />
                        ) : (
                          <View style={[s.offlineArtwork, s.artworkPlaceholder]}>
                            <Icon name="musical-notes" size={22} color={colors.onSurfaceVariant} />
                          </View>
                        )}
                        <View style={s.offlineBadgeOverlay}>
                          <Icon name="arrow-down-circle" size={14} color="#10B981" />
                        </View>
                      </View>
                      <Text numberOfLines={1} style={s.cardTitle}>{item.track.title}</Text>
                      <Text numberOfLines={1} style={s.cardArtist}>{item.track.artist}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 3. Your Favorites */}
            {favorites.length > 0 && (
              <View style={s.section}>
                <View style={[s.sectionHeaderRow, { paddingHorizontal: gutter }]}>
                  <Text style={s.sectionHeader}>Your favorites</Text>
                  <Text style={s.sectionCounter}>{favorites.length} saved</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.rail, { paddingHorizontal: gutter }]}>
                  {favorites.slice(0, 12).map((track) => (
                    <Pressable
                      key={track.id}
                      style={s.favoriteCard}
                      onPress={() => void playTrackWithQueue(track, 'Favorites')}
                      onLongPress={() => setOptionsTrack(track)}
                      accessibilityRole="button"
                      accessibilityLabel={`${track.title} by ${track.artist}, favorite`}
                    >
                      <View style={s.favoriteArtWrap}>
                        {track.coverUrl ? (
                          <Image source={{ uri: track.coverUrl }} style={s.favoriteArtwork} />
                        ) : (
                          <View style={[s.favoriteArtwork, s.artworkPlaceholder]}>
                            <Icon name="musical-notes" size={22} color={colors.onSurfaceVariant} />
                          </View>
                        )}
                        <View style={s.favoriteHeartBadge}>
                          <Icon name="heart" size={12} color={colors.onSurface} />
                        </View>
                      </View>
                      <Text numberOfLines={1} style={s.cardTitle}>{track.title}</Text>
                      <Text numberOfLines={1} style={s.cardArtist}>{track.artist}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 4. Your Playlists (Differentiated Aspect Ratio & Card Layout) */}
            {playlists.length > 0 && (
              <View style={s.section}>
                <View style={[s.sectionHeaderRow, { paddingHorizontal: gutter }]}>
                  <Text style={s.sectionHeader}>Your playlists</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.rail, { paddingHorizontal: gutter }]}>
                  {playlists.map((playlist) => (
                    <Pressable
                      key={playlist.id}
                      style={s.playlistCard}
                      onPress={async () => {
                        if (playlist.tracks.length === 0) return;
                        cacheTracks(playlist.tracks);
                        useQueueStore.getState().playContext(playlist.tracks, 0, {
                          type: 'playlist',
                          id: playlist.id,
                          name: playlist.name,
                        });
                        await audioService.playTrack(playlist.tracks[0]);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Play playlist ${playlist.name}, ${playlist.tracks.length} tracks`}
                    >
                      <View style={s.playlistArtWrap}>
                        {playlist.coverUrl ? (
                          <Image source={{ uri: playlist.coverUrl }} style={s.playlistArtwork} />
                        ) : (
                          <View style={[s.playlistArtwork, s.playlistArtPlaceholder]}>
                            <Icon name="albums-outline" size={28} color={colors.onSurfaceVariant} />
                          </View>
                        )}
                      </View>
                      <View style={s.playlistMeta}>
                        <Text numberOfLines={1} style={s.playlistTitle}>{playlist.name}</Text>
                        <Text style={s.playlistCount}>
                          {playlist.tracks.length} tracks
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        <MadeForYou />
      </ScrollView>

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
    paddingBottom: 140,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#231B10',
    borderWidth: 1,
    borderColor: '#3D2F1B',
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#FFB340',
    lineHeight: 18,
  },
  offlineAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  offlineActionText: {
    fontSize: 13,
    color: '#FFB340',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  headerWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  offlineChipText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionCounter: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: colors.outlineText,
    letterSpacing: 0.3,
  },
  sectionAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'center',
  },
  sectionActionText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },

  /* Quick-Access 2-Column Grid */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickGridItem: {
    width: '48.5%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  quickArtwork: {
    width: 54,
    height: 54,
    backgroundColor: colors.surfaceContainer,
  },
  quickMeta: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    gap: 2,
  },
  quickTitle: {
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  quickArtist: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  quickPlayIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  /* Rails & Common Cards */
  rail: {
    gap: 14,
  },
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 8,
  },
  cardArtist: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  /* On This Device Cards */
  offlineCard: {
    width: 136,
  },
  offlineArtWrap: {
    position: 'relative',
    width: 136,
    height: 136,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  offlineArtwork: {
    width: '100%',
    height: '100%',
  },
  offlineBadgeOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(9, 11, 16, 0.85)',
    borderRadius: 10,
    padding: 3,
  },

  /* Favorite Cards */
  favoriteCard: {
    width: 140,
  },
  favoriteArtWrap: {
    position: 'relative',
    width: 140,
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  favoriteArtwork: {
    width: '100%',
    height: '100%',
  },
  favoriteHeartBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(9, 11, 16, 0.75)',
    borderRadius: 10,
    padding: 4,
  },

  /* Playlist Cards (Distinct Landscape / Card Style) */
  playlistCard: {
    width: 160,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    padding: 10,
  },
  playlistArtWrap: {
    width: 140,
    height: 110,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  playlistArtwork: {
    width: '100%',
    height: '100%',
  },
  playlistArtPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  playlistMeta: {
    marginTop: 8,
    gap: 3,
  },
  playlistTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  playlistCount: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: colors.outlineText,
    letterSpacing: 0.3,
  },

  /* Empty State */
  emptyState: {
    paddingTop: 56,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 14,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHighest,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
});