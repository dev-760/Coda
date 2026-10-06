import React, { useMemo, useState, useEffect } from 'react';
import {
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
import { AppLogo } from '../../src/components/ui/AppLogo';
import CoverThumb from '../../src/components/ui/CoverThumb';
import { LevelMeter } from '../../src/components/ui/LevelMeter';
import {
  Button,
  Banner,
  SectionHeader,
} from '../../src/components/ui/primitives';
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
import { colors, r, t } from '../../src/theme/theme';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}


export default function HomeScreen() {
  const router = useRouter();
  const { favorites, playlists, recentlyPlayed } = useLibraryStore();
  const stats = useListeningStore((state) => state.stats);
  const currentTrack = usePlaybackStore((state) => state.currentTrack);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const positionMs = usePlaybackStore((state) => state.positionMs);
  const durationMs = usePlaybackStore((state) => state.durationMs);
  const { gutter, maxContentWidth, bottomBarClearance } = useResponsive();

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => subscribeToConnectivity((isConnected) => setOffline(!isConnected)), []);

  const heroTrack = currentTrack || recentlyPlayed[0] || favorites[0] || null;
  const heroProgress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0.35;

  /**
   * Heavy rotation derived from recorded playback stats
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

  const handleHeroAction = async () => {
    if (!heroTrack) return;
    if (currentTrack?.id === heroTrack.id) {
      if (isPlaying) {
        await audioService.pause();
      } else {
        await audioService.resume();
      }
    } else {
      await audioService.playTrack(heroTrack);
    }
  };

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.onSurface} />
        }
      >
        {/* Top Header */}
        <View style={s.headerRow}>
          <View style={s.brandGroup}>
            <View style={s.brandLine}>
              <AppLogo size={24} color={colors.accent} />
              <Text style={s.brandTitle}>LUMA</Text>
            </View>
            <Text style={s.dateEyebrow}>{getGreeting()}</Text>
          </View>
        </View>

        {offline && (
          <Banner
            type="offline"
            title="Offline Mode Active"
            body="Showing music saved on this device. Downloads remain fully playable."
            style={s.bannerSpacing}
          />
        )}

        {/* Hero "Continue listening" card from showcase */}
        {heroTrack && (
          <View style={s.heroCard}>
            <View style={s.heroEyebrowRow}>
              <Text style={s.heroEyebrow}>CONTINUE LISTENING</Text>
              <Text style={s.heroMeta}>FLAC 24/96 · LOSSLESS</Text>
            </View>

            <Pressable
              style={s.heroBody}
              onPress={() => router.push('/now-playing' as any)}
              accessibilityRole="button"
              accessibilityLabel={`Now playing ${heroTrack.title} by ${heroTrack.artist}`}
            >
              <CoverThumb
                uri={heroTrack.coverUrl}
                size={88}
                borderRadius={12}
                glow={isPlaying && currentTrack?.id === heroTrack.id}
              />
              <View style={s.heroTextSlot}>
                <Text numberOfLines={1} style={s.heroTitle}>
                  {heroTrack.title}
                </Text>
                <Text numberOfLines={1} style={s.heroArtist}>
                  {heroTrack.artist}
                </Text>
                <Text numberOfLines={1} style={s.heroCatalog}>
                  {heroTrack.album || 'Coda Master Recording'}
                </Text>
              </View>
            </Pressable>

            {/* 2px progress track */}
            <View style={s.heroTrackBar}>
              <View style={[s.heroTrackFill, { width: `${heroProgress * 100}%` }]} />
            </View>

            {/* Actions */}
            <View style={s.heroActions}>
              <Button
                label={isPlaying && currentTrack?.id === heroTrack.id ? 'Playing' : 'Resume'}
                variant="primary"
                icon={isPlaying && currentTrack?.id === heroTrack.id ? 'pause' : 'play'}
                onPress={handleHeroAction}
                style={s.heroResumeBtn}
              />
              <Pressable
                onPress={() => setOptionsTrack(heroTrack)}
                style={({ pressed }) => [s.heroMoreBtn, pressed && s.pressed]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Options for current track"
              >
                <Icon name="more" size={20} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
        )}


        {/* Heavy Rotation Carousel */}
        {heavyRotation.length > 0 && (
          <View style={s.section}>
            <SectionHeader
              title="Heavy Rotation"
              eyebrow={`${heavyRotation.length} TRACKS`}
              actionLabel="PLAY ALL"
              onAction={() => void playList(heavyRotation, 0, 'Heavy Rotation')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.cardCarousel}
            >
              {heavyRotation.map((track, index) => {
                const isThisPlaying = isPlaying && currentTrack?.id === track.id;
                return (
                  <Pressable
                    key={track.id}
                    style={({ pressed }) => [s.albumCard, pressed && s.pressed]}
                    onPress={() => void playList(heavyRotation, index, 'Heavy Rotation')}
                    onLongPress={() => setOptionsTrack(track)}
                    accessibilityRole="button"
                    accessibilityLabel={`${track.title} by ${track.artist}`}
                  >
                    <View style={s.albumArtWrap}>
                      <CoverThumb
                        uri={track.coverUrl}
                        size={144}
                        borderRadius={12}
                        glow={isThisPlaying}
                      />
                      {isThisPlaying && (
                        <View style={s.cardMeterBadge}>
                          <LevelMeter isPlaying={true} height={12} barWidth={3} gap={2} />
                        </View>
                      )}
                    </View>
                    <Text numberOfLines={1} style={s.cardTitle}>
                      {track.title}
                    </Text>
                    <Text numberOfLines={1} style={s.cardArtist}>
                      {track.artist}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Made for You Recommendations */}
        <View style={s.section}>
          <MadeForYou seed={null} />
        </View>
      </ScrollView>

      {/* Options sheet */}
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
    gap: 24,
  },
  pressed: {
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  brandGroup: {
    gap: 4,
  },
  brandLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    ...t.title,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 2,
  },
  dateEyebrow: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  screenTitle: {
    ...t.display,
    color: colors.onSurface,
  },
  avatarDisc: {
    width: 44,
    height: 44,
    borderRadius: r.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerSpacing: {
    marginBottom: -8,
  },

  heroCard: {
    padding: 16,
    borderRadius: r.lg,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEyebrow: {
    ...t.label,
    color: colors.onSurfaceVariant,
  },
  heroMeta: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroTextSlot: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroTitle: {
    ...t.title,
    color: colors.onSurface,
  },
  heroArtist: {
    ...t.body,
    color: colors.onSurfaceVariant,
  },
  heroCatalog: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },
  heroTrackBar: {
    height: 2,
    backgroundColor: colors.divider,
    borderRadius: r.full,
    overflow: 'hidden',
  },
  heroTrackFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroResumeBtn: {
    paddingHorizontal: 24,
  },
  heroMoreBtn: {
    width: 44,
    height: 44,
    borderRadius: r.full,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipRail: {
    gap: 8,
    paddingRight: 20,
  },

  section: {
    gap: 12,
  },
  cardCarousel: {
    gap: 16,
    paddingRight: 20,
  },
  albumCard: {
    width: 144,
    gap: 6,
  },
  albumArtWrap: {
    width: 144,
    height: 144,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardMeterBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(20, 20, 22, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: r.full,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardTitle: {
    ...t.bodyStrong,
    color: colors.onSurface,
  },
  cardArtist: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  emptySpacing: {
    marginTop: 20,
  },
});