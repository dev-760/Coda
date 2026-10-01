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

  const playTrackWithQueue = async (track: Track, contextName: string) => {
    cacheTracks([track]);
    useQueueStore.getState().playContext([track], 0, { type: 'collection', name: contextName });
    await audioService.playTrack(track);
  };

  const hasAnything = favorites.length > 0 || playlists.length > 0
    || recentlyPlayed.length > 0 || completedDownloads.length > 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <HeaderBar showBack={false} title="Home" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {offline && (
          <View style={s.offlineBanner} accessibilityRole="alert">
            <Icon name="cloud-offline-outline" size={18} color="#ffb340" />
            <Text style={s.offlineText}>
              You are offline. Only downloaded music will play.
            </Text>
            <Pressable
              onPress={() => router.push('/downloads' as any)}
              hitSlop={8}
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
            {completedDownloads.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionHeader}>On this device</Text>
                  <Pressable
                    onPress={() => router.push('/downloads' as any)}
                    hitSlop={8}
                    style={s.sectionAction}
                    accessibilityRole="button"
                    accessibilityLabel="Open downloads"
                  >
                    <Text style={s.sectionActionText}>See all</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                  {completedDownloads.slice(0, 12).map((item) => (
                    <Pressable
                      key={item.trackId}
                      style={s.card}
                      onPress={() => void playTrackWithQueue(item.track, 'Downloads')}
                      onLongPress={() => setOptionsTrack(item.track)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.track.title} by ${item.track.artist}, downloaded`}
                    >
                      {item.track.coverUrl ? (
                        <Image source={{ uri: item.track.coverUrl }} style={s.artwork} />
                      ) : (
                        <View style={[s.artwork, s.artworkPlaceholder]}>
                          <Icon name="musical-notes" size={22} color="#8e8e93" />
                        </View>
                      )}
                      <Text numberOfLines={1} style={s.cardTitle}>{item.track.title}</Text>
                      <Text numberOfLines={1} style={s.cardArtist}>{item.track.artist}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {recentlyPlayed.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionHeader}>Recently played</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                  {recentlyPlayed.slice(0, 12).map((track) => (
                    <Pressable
                      key={track.id}
                      style={s.card}
                      onPress={() => void playTrackWithQueue(track, 'Recently played')}
                      onLongPress={() => setOptionsTrack(track)}
                      accessibilityRole="button"
                      accessibilityLabel={`${track.title} by ${track.artist}, recently played`}
                    >
                      {track.coverUrl ? (
                        <Image source={{ uri: track.coverUrl }} style={s.artwork} />
                      ) : (
                        <View style={[s.artwork, s.artworkPlaceholder]}>
                          <Icon name="musical-notes" size={22} color="#8e8e93" />
                        </View>
                      )}
                      <Text numberOfLines={1} style={s.cardTitle}>{track.title}</Text>
                      <Text numberOfLines={1} style={s.cardArtist}>{track.artist}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {favorites.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionHeader}>Your favorites</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                  {favorites.slice(0, 12).map((track) => (
                    <Pressable
                      key={track.id}
                      style={s.card}
                      onPress={() => void playTrackWithQueue(track, 'Favorites')}
                      onLongPress={() => setOptionsTrack(track)}
                      accessibilityRole="button"
                      accessibilityLabel={`${track.title} by ${track.artist}, favorite`}
                    >
                      {track.coverUrl ? (
                        <Image source={{ uri: track.coverUrl }} style={s.artwork} />
                      ) : (
                        <View style={[s.artwork, s.artworkPlaceholder]}>
                          <Icon name="musical-notes" size={22} color="#8e8e93" />
                        </View>
                      )}
                      <Text numberOfLines={1} style={s.cardTitle}>{track.title}</Text>
                      <Text numberOfLines={1} style={s.cardArtist}>{track.artist}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {playlists.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionHeader}>Your playlists</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
                  {playlists.map((playlist) => (
                    <Pressable
                      key={playlist.id}
                      style={s.card}
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
                      {playlist.coverUrl ? (
                        <Image source={{ uri: playlist.coverUrl }} style={s.artwork} />
                      ) : (
                        <View style={[s.artwork, s.artworkPlaceholder]}>
                          <Icon name="musical-notes" size={22} color="#8e8e93" />
                        </View>
                      )}
                      <Text numberOfLines={1} style={s.cardTitle}>{playlist.name}</Text>
                      <Text numberOfLines={1} style={s.cardArtist}>
                        {playlist.tracks.length} tracks
                      </Text>
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
    backgroundColor: '#000000',
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
    borderRadius: 10,
    backgroundColor: '#2a2318',
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#ffb340',
    lineHeight: 18,
  },
  offlineAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  offlineActionText: {
    fontSize: 13,
    color: '#ffb340',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  sectionActionText: {
    fontSize: 14,
    color: '#00e5bf',
    fontWeight: '600',
  },
  rail: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    width: 148,
  },
  artwork: {
    width: 148,
    height: 148,
    borderRadius: 8,
    backgroundColor: '#1c1c1e',
    marginBottom: 10,
  },
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardArtist: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  emptyState: {
    paddingTop: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
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
});