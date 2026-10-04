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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const GENRE_CHIPS = ['All', 'Electronic', 'Ambient', 'Chill', 'Lo-Fi', 'Classical', 'Jazz'] as const;

const SOUNDSCAPES = [
  { id: 'ambient', title: 'Ambient & Drone', blurb: 'Slow modular synth beds', genre: 'Ambient' },
  { id: 'lofi', title: 'Lo-Fi & Downtempo', blurb: 'Tape-warm beats & keys', genre: 'Lo-Fi' },
  { id: 'electronic', title: 'Electronic & Synth', blurb: 'Pulsing textures & rhythms', genre: 'Electronic' },
  { id: 'classical', title: 'Modern Classical', blurb: 'Acoustic piano & chamber strings', genre: 'Classical' },
];

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
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

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
        {/* Top Header: Brand & Settings shortcut */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.brandTitle}>Luma</Text>
            <Text style={s.greetingText}>{getGreeting()}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings' as any)}
            hitSlop={12}
            style={({ pressed }) => [s.headerSettingsButton, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Icon name="settings-outline" size={22} color={colors.onSurface} />
          </Pressable>
        </View>

        {offline && (
          <View style={s.offlineBanner} accessibilityRole="alert">
            <Icon name="cloud-offline-outline" size={16} color={colors.error} />
            <Text style={s.offlineText}>Offline. Playing downloaded music only.</Text>
          </View>
        )}

        {/* Quick Genre / Mood Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRail}
        >
          {GENRE_CHIPS.map((genre) => {
            const active = selectedGenre === genre;
            return (
              <Pressable
                key={genre}
                onPress={() => setSelectedGenre(genre)}
                style={({ pressed }) => [
                  s.genreChip,
                  active && s.genreChipActive,
                  pressed && !active && s.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${genre} filter`}
              >
                <Text style={[s.genreChipText, active && s.genreChipTextActive]}>
                  {genre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 1. Heavy Rotation rail: only shown when user has playback history */}
        {heavyRotation.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Heavy Rotation"
              eyebrow={`${heavyRotation.length} tracks`}
              actionLabel="Play all"
              onAction={() => void playList(heavyRotation, 0, 'Heavy Rotation')}
            />
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
          </View>
        )}

        {/* 2. Made for you: recommendations with seed from genre chip if selected */}
        <View style={s.section}>
          <MadeForYou
            seed={
              selectedGenre === 'All'
                ? null
                : { id: `genre_${selectedGenre.toLowerCase()}`, title: selectedGenre, artist: selectedGenre }
            }
          />
        </View>

        {/* 3. Soundscape Discovery styles when rotation is empty */}
        {heavyRotation.length === 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Featured Soundscapes"
              eyebrow="Lossless Discovery"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
              {SOUNDSCAPES.map((style) => (
                <Pressable
                  key={style.id}
                  style={({ pressed }) => [s.soundscapeCard, pressed && s.pressed]}
                  onPress={() => setSelectedGenre(style.genre)}
                  accessibilityRole="button"
                  accessibilityLabel={style.title}
                >
                  <View style={s.soundscapeContent}>
                    <Text style={s.soundscapeTitle} numberOfLines={1}>{style.title}</Text>
                    <Text style={s.soundscapeBlurb} numberOfLines={2}>{style.blurb}</Text>
                    <View style={s.soundscapeTag}>
                      <Text style={s.soundscapeTagText}>Explore {style.genre}</Text>
                      <Icon name="arrow-forward" size={12} color={colors.onSurface} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brandTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  greetingText: {
    ...t.bodySm,
    color: colors.outlineText,
    marginTop: 2,
  },
  headerSettingsButton: {
    width: 44,
    height: 44,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },

  chipRail: {
    gap: 8,
    paddingRight: 16,
  },
  genreChip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreChipActive: {
    backgroundColor: colors.onSurface,
    borderColor: colors.onSurface,
  },
  genreChipText: {
    ...t.labelMd,
    color: colors.outlineText,
  },
  genreChipTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },

  soundscapeCard: {
    width: 170,
    height: 120,
    borderRadius: r.md,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: 12,
    justifyContent: 'space-between',
  },
  soundscapeContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  soundscapeTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onSurface,
  },
  soundscapeBlurb: {
    ...t.micro,
    color: colors.outlineText,
    lineHeight: 14,
    marginTop: 4,
  },
  soundscapeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  soundscapeTagText: {
    ...t.micro,
    color: colors.onSurface,
    fontWeight: '600',
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
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
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