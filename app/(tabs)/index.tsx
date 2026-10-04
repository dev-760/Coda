import React, { useCallback, useEffect, useState } from 'react';
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
import { audioService } from '../../src/audio/AudioService';
import { useQueueStore, cacheTracks } from '../../src/store/queueStore';
import { Track } from '../../src/providers/types';
import { subscribeToConnectivity } from '../../src/services/connectivity';
import { useResponsive } from '../../src/hooks/useResponsive';
import { getSuggestions, Suggestion } from '../../src/services/suggestionEngine';
import { colors, FONTS, r, t } from '../../src/theme/theme';

/** Curated series shown in the bento rows. */
const SERIES = [
  { id: 'discover', name: 'Discover Weekly', note: 'Fresh finds every Monday', glyph: 'DW' },
  { id: 'radar', name: 'Release Radar', note: 'New from artists you follow', glyph: 'RR' },
  { id: 'focus', name: 'Deep Focus Mono', note: 'Instrumental, no vocals', glyph: 'DF' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { favorites, playlists, recentlyPlayed } = useLibraryStore();
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  // The spec's fixed 144px bottom padding, resolved so it also clears the
  // device navigation area rather than assuming a gesture-only device.
  const { bottomBarClearance } = useResponsive();

  const [rotation, setRotation] = useState<Suggestion[]>([]);
  const [rotationState, setRotationState] = useState<'loading' | 'ready' | 'empty'>('loading');
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => subscribeToConnectivity((isConnected) => setOffline(!isConnected)), []);

  const loadRotation = useCallback(async (seed: Track | null) => {
    try {
      const results = await getSuggestions(seed, 10);
      setRotation(results);
      setRotationState(results.length === 0 ? 'empty' : 'ready');
    } catch {
      setRotationState('empty');
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const results = await getSuggestions(null, 10);
        if (!active) return;
        setRotation(results);
        setRotationState(results.length === 0 ? 'empty' : 'ready');
      } catch {
        if (active) setRotationState('empty');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRotation(null);
    setRefreshing(false);
  };

  const playList = async (tracks: Track[], index: number, contextName: string) => {
    if (tracks.length === 0) return;
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, index, { type: 'collection', name: contextName });
    await audioService.playTrack(tracks[index]);
  };

  const playSuggestion = (index: number) => {
    const tracks = rotation.map((item) => item.track);
    void playList(tracks, index, 'Heavy Rotation');
  };

  const hasAnything =
    favorites.length > 0 || playlists.length > 0 || recentlyPlayed.length > 0;

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

        {/* 1. Heavy Rotation rail */}
        <View style={s.section}>
          <SectionHeader
            title="Heavy Rotation"
            eyebrow={`${rotation.length} tracks`}
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/search' as any)}
          />

          {rotationState === 'loading' ? (
            <View style={s.railPlaceholder}>
              <Text style={s.placeholderText}>Building your rotation</Text>
            </View>
          ) : rotationState === 'empty' ? (
            <View style={s.railPlaceholder}>
              <Text style={s.placeholderText}>
                Play a few tracks and your rotation builds here.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
              {rotation.map((item, index) => (
                <Pressable
                  key={item.track.id}
                  style={({ pressed }) => [s.card, pressed && s.pressed]}
                  onPress={() => playSuggestion(index)}
                  onLongPress={() => setOptionsTrack(item.track)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.track.title} by ${item.track.artist}. ${item.reason}`}
                >
                  <View style={s.cardArtWrap}>
                    {item.track.coverUrl ? (
                      <Image source={{ uri: item.track.coverUrl }} style={s.cardArt} />
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
                    {item.track.title}
                  </Text>
                  <Text numberOfLines={1} style={s.cardArtist}>
                    {item.track.artist}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 3. Made for you bento series */}
        <View style={s.section}>
          <SectionHeader title="Made for you" eyebrow="Curated series" />

          <View style={s.bento}>
            {SERIES.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [s.bentoRow, pressed && s.pressed]}
                onPress={() => router.push('/(tabs)/search' as any)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <View style={s.bentoGlyph}>
                  <Text style={s.bentoGlyphText}>{item.glyph}</Text>
                </View>
                <View style={s.bentoMeta}>
                  <Text numberOfLines={1} style={s.bentoTitle}>{item.name}</Text>
                  <Text numberOfLines={1} style={s.bentoNote}>{item.note}</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={colors.outlineText} />
              </Pressable>
            ))}
          </View>

          <MadeForYou />
        </View>

        {/* 4. Recently played */}
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
              Search for music and press play, or favorite a track. This page fills in as you listen.
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
    gap: 24,
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
    height: 196,
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
  },

  card: {
    width: 144,
    gap: 8,
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
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  cardArtist: {
    ...t.bodySm,
    color: colors.outlineText,
  },

  bento: {
    gap: 8,
  },
  bentoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    height: 98,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceContainerHigh,
  },
  bentoGlyph: {
    width: 56,
    height: 56,
    borderRadius: r.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHighest,
  },
  bentoGlyphText: {
    ...t.labelSm,
    fontWeight: '700',
    color: colors.onSurface,
  },
  bentoMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  bentoTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  bentoNote: {
    ...t.bodyMd,
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