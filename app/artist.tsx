import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import HeaderBar from '../src/components/ui/HeaderBar';
import Icon from '../src/components/ui/Icon';
import MiniPlayer from '../src/components/ui/MiniPlayer';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import { audioService } from '../src/audio/AudioService';
import { useQueueStore, cacheTracks } from '../src/store/queueStore';
import { Track } from '../src/providers/types';
import { CatalogAlbum } from '../src/providers/catalogTypes';
import { getArtistCatalog } from '../src/services/catalogService';
import { useResponsive } from '../src/hooks/useResponsive';

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

function formatDuration(durationMs?: number): string {
  if (!durationMs) return '--:--';
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function ArtistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { bottomBarClearance } = useResponsive();

  // artistId is what makes the discography fetchable; name/coverUrl only give
  // an instant first paint and are replaced once real data arrives.
  const artistId = typeof params.artistId === 'string' ? params.artistId : '';
  const initialName = (params.name as string) || 'Artist';
  const initialCover = (params.coverUrl as string) || '';

  const [name, setName] = useState(initialName);
  const [cover, setCover] = useState(initialCover);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<CatalogAlbum[]>([]);
  const [state, setState] = useState<LoadState>(artistId ? 'loading' : 'notFound');
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [following, setFollowing] = useState(false);

  const load = useCallback(async () => {
    if (!artistId) {
      setState('notFound');
      return;
    }
    setState('loading');
    try {
      const result = await getArtistCatalog(artistId);
      if (!result.artist && result.tracks.length === 0) {
        setState('notFound');
        return;
      }
      if (result.artist) {
        setName(result.artist.name);
        if (result.artist.picture) setCover(result.artist.picture);
      }
      setTracks(result.tracks);
      setAlbums(result.albums);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [artistId]);

  useEffect(() => {
    // Deferred a tick so the initial state comes from the route params and the
    // fetch does not run synchronously inside the effect body.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const playTracks = (fromIndex = 0) => {
    if (tracks.length === 0) return;
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, fromIndex, { type: 'artist', name });
    void audioService.playTrack(tracks[fromIndex]);
  };

  const handleShuffle = () => {
    playTracks();
    useQueueStore.getState().toggleShuffle();
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Listen to ${name} on Luma` });
    } catch {}
  };

  const openAlbum = (album: CatalogAlbum) => {
    router.push({
      pathname: '/album' as any,
      params: {
        albumId: album.id,
        title: album.title,
        artist: album.artist,
        artistId: album.artistId ?? artistId,
        coverUrl: album.cover ?? '',
      },
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <HeaderBar showBack />

      <ScrollView
        contentContainerStyle={[{ paddingBottom: bottomBarClearance + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroContainer}>
          {cover ? (
            <Image source={{ uri: cover }} style={s.heroImage} blurRadius={2} />
          ) : (
            <View style={[s.heroImage, s.heroFallback]} />
          )}
          <View style={s.heroGradient} />
          <View style={s.heroMeta}>
            <Text style={s.artistTitle}>{name}</Text>
          </View>
        </View>

        <View style={s.bigButtonsRow}>
          <Pressable
            style={[s.playBtn, tracks.length === 0 && s.playBtnDisabled]}
            onPress={() => playTracks()}
            disabled={tracks.length === 0}
            accessibilityRole="button"
            accessibilityLabel={`Play ${name}`}
          >
            <Icon name="play" size={20} color="#000000" />
            <Text style={s.playBtnText}>Play</Text>
          </Pressable>
          <Pressable
            style={[s.shuffleBtn, tracks.length === 0 && s.shuffleBtnDisabled]}
            onPress={handleShuffle}
            disabled={tracks.length === 0}
            accessibilityRole="button"
            accessibilityLabel={`Shuffle ${name}`}
          >
            <Icon name="shuffle" size={20} color="#ffffff" />
            <Text style={s.shuffleBtnText}>Shuffle</Text>
          </Pressable>
        </View>

        <View style={s.actionsRow}>
          <Pressable
            style={s.actionItem}
            onPress={() => setFollowing((v) => !v)}
            accessibilityRole="button"
          >
            <Icon name={following ? 'checkmark' : 'add'} size={22} color="#ffffff" />
            <Text style={s.actionLabel}>{following ? 'Following' : 'Follow'}</Text>
          </Pressable>
          <Pressable style={s.actionItem} onPress={handleShare} accessibilityRole="button">
            <Icon name="share-outline" size={22} color="#ffffff" />
            <Text style={s.actionLabel}>Share</Text>
          </Pressable>
        </View>

        {state === 'loading' ? (
          <View style={s.stateBlock}>
            <ActivityIndicator color="#00e5bf" />
            <Text style={s.stateText}>Loading {name}</Text>
          </View>
        ) : state === 'notFound' ? (
          <View style={s.stateBlock}>
            <Text style={s.stateText}>This artist could not be loaded.</Text>
            <Pressable onPress={() => void load()} style={s.retryBtn} accessibilityRole="button">
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : state === 'error' ? (
          <View style={s.stateBlock}>
            <Text style={s.stateText}>Something went wrong loading this artist.</Text>
            <Pressable onPress={() => void load()} style={s.retryBtn} accessibilityRole="button">
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {tracks.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Popular</Text>
                </View>
                <View style={s.trackList}>
                  {tracks.slice(0, 10).map((track, index) => (
                    <Pressable
                      key={track.id}
                      style={s.trackRow}
                      onPress={() => playTracks(index)}
                      onLongPress={() => setOptionsTrack(track)}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${track.title}`}
                    >
                      <View>
                        {track.coverUrl ? (
                          <Image source={{ uri: track.coverUrl }} style={s.trackArt} />
                        ) : (
                          <View style={[s.trackArt, s.artFallback]}>
                            <Icon name="musical-note" size={16} color="#8e8e93" />
                          </View>
                        )}
                        <Text style={s.rankBadge}>{index + 1}</Text>
                      </View>
                      <View style={s.trackMeta}>
                        <Text numberOfLines={1} style={s.trackTitle}>
                          {track.title}
                        </Text>
                        <Text numberOfLines={1} style={s.trackArtist}>
                          {formatDuration(track.durationMs)}
                        </Text>
                      </View>
                      <Pressable
                        style={s.moreBtn}
                        onPress={() => setOptionsTrack(track)}
                        hitSlop={8}
                        accessibilityLabel={`More options for ${track.title}`}
                      >
                        <Icon name="ellipsis-horizontal" size={18} color="#8e8e93" />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {albums.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Albums</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.albumRail}
                >
                  {albums.map((album) => (
                    <Pressable
                      key={album.id}
                      style={s.albumCard}
                      onPress={() => openAlbum(album)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open album ${album.title}`}
                    >
                      {album.cover ? (
                        <Image source={{ uri: album.cover }} style={s.albumArt} />
                      ) : (
                        <View style={[s.albumArt, s.artFallback]}>
                          <Icon name="albums-outline" size={20} color="#8e8e93" />
                        </View>
                      )}
                      <Text numberOfLines={1} style={s.trackTitle}>
                        {album.title}
                      </Text>
                      <Text numberOfLines={1} style={s.trackArtist}>
                        {album.releaseDate ? album.releaseDate.slice(0, 4) : album.type}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {tracks.length === 0 && albums.length === 0 && (
              <View style={s.stateBlock}>
                <Text style={s.stateText}>Nothing available for this artist.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <MiniPlayer />

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
    paddingBottom: 130,
    gap: 18,
  },
  heroContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    justifyContent: 'flex-end',
    backgroundColor: '#161616',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroMeta: {
    padding: 20,
    gap: 4,
  },
  artistTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  fansCount: {
    fontSize: 14,
    color: '#b3b3b3',
    fontWeight: '500',
  },
  bigButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  playBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  shuffleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shuffleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  trackList: {
    gap: 10,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  trackArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#1c1c1e',
  },
  trackMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  trackArtist: {
    fontSize: 13,
    color: '#8e8e93',
  },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallback: {
    backgroundColor: '#1c1c1e',
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
  },
  rankBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
  },
  albumRail: {
    gap: 14,
    paddingVertical: 4,
  },
  albumCard: {
    width: 140,
  },
  albumArt: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#1c1c1e',
    marginBottom: 8,
  },
  playBtnDisabled: {
    opacity: 0.4,
  },
  shuffleBtnDisabled: {
    opacity: 0.4,
  },
  stateBlock: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 14,
  },
  stateText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 22,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#2c2c2e',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

