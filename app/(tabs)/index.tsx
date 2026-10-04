import React, { useMemo, useState, useEffect } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../../src/components/ui/Icon';
import { SectionHeader } from '../../src/components/ui/primitives';
import { TrackRow } from '../../src/components/ui/TrackRow';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import MadeForYou from '../../src/components/discover/MadeForYou';
import { useLibraryStore } from '../../src/store/libraryStore';
import { usePlaybackStore } from '../../src/store/playbackStore';
import { useListeningStore } from '../../src/store/listeningStore';
import { audioService } from '../../src/audio/AudioService';
import { useQueueStore, cacheTracks } from '../../src/store/queueStore';
import { Track } from '../../src/providers/types';
import { subscribeToConnectivity } from '../../src/services/connectivity';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, FONTS, r, t } from '../../src/theme/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { favorites, playlists, recentlyPlayed } = useLibraryStore();
  const stats = useListeningStore((state) => state.stats);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const { bottomBarClearance } = useResponsive();

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => subscribeToConnectivity((isConnected) => setOffline(!isConnected)), []);

  /**
   * Heavy rotation is derived from actual device play counts in listeningStore.
   * Only tracks with real recorded plays qualify.
   */
  const heavyRotation = useMemo(() => {
    const candidateMap = new Map<string, Track>();
    for (const track of recentlyPlayed) candidateMap.set(track.id, track);
    for (const track of favorites) candidateMap.set(track.id, track);
    for (const playlist of playlists) {
      for (const track of playlist.tracks) {
        candidateMap.set(track.id, track as Track);
      }
    }

    const scored: { track: Track; score: number }[] = [];
    for (const [id, track] of candidateMap.entries()) {
      const s = stats[id];
      if (s && s.playCount > 0) {
        const score = s.completedPlays * 2 + s.playCount - s.skips;
        if (score > 0) {
          scored.push({ track, score });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 10).map((item) => item.track);
  }, [stats, recentlyPlayed, favorites, playlists]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refreshing triggers store sync
    await Promise.all([
      useLibraryStore.getState().loadFavorites(),
      useLibraryStore.getState().loadRecentlyPlayed(),
    ]);
    setRefreshing(false);
  };

  const playList = async (tracks: Track[], index: number, contextName: string) => {
    if (tracks.length === 0) return;
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, index, { type: 'collection', name: contextName });
    await audioService.playTrack(tracks[index]);
  };

  const hasAnything =
    favorites.length > 0 || playlists.length > 0 || recentlyPlayed.length > 0 || heavyRotation.length > 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.outlineText} />
        }
      >
        {offline && (
          <View style={s.offlineBanner} accessibilityRole="alert">
            <Icon name="cloud-offline-outline" size={16} color={colors.error} />
            <Text style={s.offlineText}>Offline. Playing downloaded music only.</Text>
          </View>
        )}

        {/* 1. Heavy Rotation rail: backed by real play counts */}
        <View style={s.section}>
          <SectionHeader
            title="Heavy Rotation"
            eyebrow={heavyRotation.length > 0 ? `${heavyRotation.length} tracks` : 'Most played'}
            actionLabel={heavyRotation.length > 0 ? 'Play all' : undefined}
            onAction={heavyRotation.length > 0 ? () => void playList(heavyRotation, 0, 'Heavy Rotation') : undefined}
          />

          {heavyRotation.length === 0 ? (
            <View style={s.railPlaceholder}>
              <Text style={s.placeholderText}>
                Play tracks repeatedly and your top rotation will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
              {heavyRotation.map((track, index) => (
                <Pressable
                  key={track.id}
                  style={({ pressed }) => [s.card, pressed && s.pressed]}
                  onPress={() => void playList(heavyRotation, index, 'Heavy Rotation')}
                  onLongPress={() => setOptionsTrack(track)}
                  accessibilityRole="button"
                  accessibilityLabel={`${track.title} by ${track.artist}`}
                >
                  <View style={s.cardArtWrap}>
                    {track.coverUrl ? (
                      <Image source={{ uri: track.coverUrl }} style={s.cardArt} />
                    ) : (
                      <View style={[s.cardArt, s.cardArtFallback]}>
                        <Icon name="musical-notes" size={20} color={colors.outlineText} />
                      </View>
                    )}
                    <View style={s.cardPlay}>
                      <Icon name="play" size={10} color={colors.onSurface} />
                    </View>
                  </View>
                  <Text numberOfLines={1} style={s.cardTitle}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={s.cardArtist}>
                    {track.artist}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 2. Made for you: honest recommendations from suggestionEngine */}
        <View style={s.section}>
          <MadeForYou />
        </View>

        {/* 3. Favorites rail: real user-favorited music */}
        {favorites.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Favorites"
              eyebrow={`${favorites.length} saved`}
              actionLabel="Play all"
              onAction={() => void playList(favorites, 0, 'Favorites')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
              {favorites.map((track, index) => (
                <Pressable
                  key={`fav_${track.id}`}
                  style={({ pressed }) => [s.card, pressed && s.pressed]}
                  onPress={() => void playList(favorites, index, 'Favorites')}
                  onLongPress={() => setOptionsTrack(track)}
                  accessibilityRole="button"
                  accessibilityLabel={`${track.title} by ${track.artist}`}
                >
                  <View style={s.cardArtWrap}>
                    {track.coverUrl ? (
                      <Image source={{ uri: track.coverUrl }} style={s.cardArt} />
                    ) : (
                      <View style={[s.cardArt, s.cardArtFallback]}>
                        <Icon name="musical-notes" size={20} color={colors.outlineText} />
                      </View>
                    )}
                    <View style={s.cardPlay}>
                      <Icon name="play" size={10} color={colors.onSurface} />
                    </View>
                  </View>
                  <Text numberOfLines={1} style={s.cardTitle}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={s.cardArtist}>
                    {track.artist}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 4. Recently played: honest recent history */}
        {recentlyPlayed.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Recently played"
              eyebrow={`${recentlyPlayed.length} tracks`}
            />
            <View style={s.recentList}>
              {recentlyPlayed.slice(0, 5).map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isActive={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  onPress={() => void playList([track], 0, 'Recently played')}
                  onLongPress={() => setOptionsTrack(track)}
                  onMore={() => setOptionsTrack(track)}
                  style={s.recentRow}
                />
              ))}
            </View>
          </View>
        )}

        {!hasAnything && recentlyPlayed.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptyBody}>
              Search for music and press play, or favorite a track. Your home screen learns from what you listen to on this device.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/search' as any)}
              style={({ pressed }) => [s.emptyButton, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Go to Explore"
            >
              <Text style={s.emptyButtonText}>Go to Explore</Text>
            </Pressable>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 28,
  },
  pressed: {
    opacity: 0.7,
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  offlineText: {
    ...t.bodyMd,
    color: colors.onSurfaceVariant,
  },

  section: {
    gap: 12,
  },

  rail: {
    gap: 12,
    paddingRight: 16,
  },
  railPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 24,
  },
  placeholderText: {
    ...t.bodyMd,
    color: colors.outlineText,
    textAlign: 'center',
    lineHeight: 18,
  },

  card: {
    width: 144,
    gap: 6,
  },
  cardArtWrap: {
    position: 'relative',
    width: 144,
    height: 144,
    borderRadius: r.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  cardArt: {
    width: '100%',
    height: '100%',
  },
  cardArtFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 19, 22, 0.85)',
  },
  cardTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onSurface,
  },
  cardArtist: {
    ...t.bodySm,
    color: colors.outlineText,
  },

  recentList: {
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  recentRow: {
    paddingHorizontal: 16,
  },

  emptyState: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    ...t.title,
    color: colors.onSurface,
  },
  emptyBody: {
    ...t.bodyMd,
    color: colors.outlineText,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  emptyButtonText: {
    ...t.labelMd,
    color: colors.onSurface,
  },
});