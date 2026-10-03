import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image, Dimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../src/components/ui/Icon';
import { colors, sp, t, r, FONTS } from '../src/theme/theme';
import { usePlaybackStore } from '../src/store/playbackStore';
import { audioService } from '../src/audio/AudioService';
import { hifiApiClient } from '../src/services/hifiApiClient';
import { useQueueStore } from '../src/store/queueStore';
import { useRouter } from 'expo-router';
import { useLibraryStore } from '../src/store/libraryStore';
import { parseLyricsPayload, LyricLineItem } from '../src/services/lyricsParser';

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function LyricsScreen() {
  const router = useRouter();
  const { currentTrack, isPlaying, positionMs, durationMs } = usePlaybackStore();
  const queue = useQueueStore();
  const position = positionMs / 1000;
  const duration = durationMs / 1000;
  const [lyricsItems, setLyricsItems] = useState<LyricLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncLocked, setIsSyncLocked] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { addFavorite, removeFavorite, isFavorite } = useLibraryStore();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const trackId = currentTrack?.id;
    if (!trackId) return;

    const likedNow = isFavorite(trackId);
    let active = true;
    setIsLoading(true);

    // Deferring the derived state keeps it out of the effect body.
    const timer = setTimeout(() => {
      setLiked(likedNow);
    }, 0);

    hifiApiClient
      .getLyrics(trackId)
      .then((data) => {
        if (!active) return;
        const parsed = parseLyricsPayload(data);
        if (parsed.length > 0) {
          setLyricsItems(parsed);
        } else {
          setLyricsItems([{ id: 'empty', text: 'No lyrics available for this track.' }]);
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch lyrics:', error);
        if (active) {
          setLyricsItems([
            { id: 'error', text: 'Lyrics could not be loaded. Tap to retry or check your connection.' }
          ]);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentTrack?.id, isFavorite]);

  const activeIndex = useMemo(() => {
    if (!lyricsItems.length || lyricsItems[0].timeMs === undefined) return -1;
    let active = -1;
    for (let i = 0; i < lyricsItems.length; i++) {
      if (lyricsItems[i].timeMs! <= positionMs) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }, [lyricsItems, positionMs]);

  useEffect(() => {
    if (isSyncLocked && activeIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: Math.max(0, activeIndex * 58 - 140),
        animated: true,
      });
    }
  }, [activeIndex, isSyncLocked]);

  const handleLinePress = (item: LyricLineItem) => {
    if (item.timeMs !== undefined) {
      audioService.seekTo(item.timeMs);
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioService.pause();
    } else {
      audioService.resume();
    }
  };

  const handleNext = () => {
    audioService.playNextInQueue();
  };

  const handlePrev = () => {
    audioService.playPrevious();
  };

  const handleToggleFavorite = async () => {
    if (!currentTrack) return;
    
    if (isFavorite(currentTrack.id)) {
      await removeFavorite(currentTrack.id);
      setLiked(false);
      Alert.alert('Removed from Favorites', `"${currentTrack.title}" has been removed from favorites.`);
    } else {
      await addFavorite(currentTrack);
      setLiked(true);
      Alert.alert('Added to Favorites', `"${currentTrack.title}" has been added to favorites.`);
    }
  };

  const handleShareLyrics = () => {
    Alert.alert('Share Lyrics', 'Share feature coming soon!');
  };

  const handleReportLyrics = () => {
    Alert.alert('Report Lyrics', 'Report feature coming soon!');
  };

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyState}>
          <Icon name="musical-notes-outline" size={56} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>Nothing playing</Text>
          <Text style={styles.emptyBody}>
            Start a track and its lyrics will show up here.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-down" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background Ambience Mock */}
      <View style={styles.ambientGlow} />

      {/* Top Sub-Navigation Header */}
      <View style={styles.header}>
        <Pressable 
          style={({pressed}) => [styles.iconButton, pressed && styles.pressed]} 
          onPress={handleDismiss}
          accessibilityLabel="Dismiss lyrics view"
        >
          <Icon name="chevron-down" size={22} color={colors.onSurfaceVariant} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>PLAYING FROM PLAYLIST</Text>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>Late Night Resonance</Text>
            <Icon name="checkmark-circle" size={14} color={colors.primary} />
          </View>
        </View>
        <Pressable style={({pressed}) => [styles.iconButton, pressed && styles.pressed]} onPress={() => {
          if (currentTrack) {
            Alert.alert('Track Options', `"${currentTrack.title}" by ${currentTrack.artist}`, [
              { text: 'Cancel', style: 'cancel' }
            ]);
          }
        }}>
          <Icon name="ellipsis-horizontal" size={20} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      {/* Mini Track Header / Anchor Card */}
      <View style={styles.anchorCardContainer}>
        <View style={styles.anchorCard}>
          <View style={styles.anchorLeft}>
            {currentTrack?.artwork || currentTrack?.coverUrl ? (
              <Image
                source={{ uri: (currentTrack?.artwork || currentTrack?.coverUrl) as string }}
                style={styles.artwork}
              />
            ) : (
              <View style={[styles.artwork, styles.artworkFallback]}>
                <Icon name="musical-note" size={22} color={colors.onSurfaceVariant} />
              </View>
            )}
            <View style={styles.anchorText}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {currentTrack?.title || 'Unknown Track'}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {currentTrack?.artist || 'Unknown Artist'}
              </Text>
            </View>
          </View>
          <Pressable 
            style={({pressed}) => [styles.likeButton, pressed && styles.pressed]}
            onPress={handleToggleFavorite}
          >
            <Icon 
              name={liked ? "heart" : "heart-outline"} 
              size={22} 
              color={liked ? colors.primary : colors.onSurfaceVariant} 
            />
          </Pressable>
        </View>
      </View>

      {/* Synchronized Interactive Lyrics Feed */}
      <ScrollView 
        ref={scrollRef}
        style={styles.lyricsScroll} 
        contentContainerStyle={styles.lyricsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fadeMaskTop} />
        
        <View style={styles.lyricsContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Icon name="musical-notes" size={32} color={colors.primary} />
              <Text style={styles.placeholderText}>Loading synchronized lyrics...</Text>
            </View>
          ) : lyricsItems.length === 0 ? (
            <Text style={styles.placeholderText}>No lyrics available for this track.</Text>
          ) : (
            lyricsItems.map((item, index) => {
              const isActive = index === activeIndex;
              const isPast = activeIndex >= 0 && index < activeIndex;
              
              if (isActive) {
                return (
                  <Pressable 
                    key={item.id} 
                    style={({ pressed }) => [styles.activeLyricLineContainer, pressed && styles.pressed]}
                    onPress={() => handleLinePress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Active lyric: ${item.text}. Tap to replay.`}
                  >
                    <View style={styles.activeLyricIndicator} />
                    <View style={styles.activeLyricTextContainer}>
                      <Text style={styles.activeLyricText}>{item.text}</Text>
                    </View>
                  </Pressable>
                );
              }

              return (
                <Pressable 
                  key={item.id} 
                  style={({ pressed }) => [styles.lyricLine, pressed && styles.pressed]}
                  onPress={() => handleLinePress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Lyric line: ${item.text}. Tap to jump to this point.`}
                >
                  <Text style={[styles.lyricText, isPast ? styles.pastLyricText : undefined]}>
                    {item.text}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Provider Credit & Action Strip */}
        <View style={styles.providerCreditContainer}>
          <View style={styles.providerCreditRow}>
            <Icon name="musical-notes" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.providerCreditText}>SYNCED LYRICS PROVIDED BY MUSIXMATCH</Text>
          </View>
          <Pressable style={({pressed}) => [styles.reportButton, pressed && styles.pressed]} onPress={handleReportLyrics}>
            <Icon name="flag" size={15} color={colors.onSurfaceVariant} />
            <Text style={styles.reportButtonText}>Report wrong lyrics</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Interactive Bottom Dock / Controls Container */}
      <View style={[styles.bottomDock, { paddingBottom: insets.bottom || sp.sm }]}>
        
        {/* Lyric Utilities */}
        <View style={styles.lyricUtilsRow}>
          <Pressable style={({pressed}) => [styles.shareCardButton, pressed && styles.pressed]} onPress={handleShareLyrics}>
            <Icon name="share-outline" size={16} color={colors.primary} />
            <Text style={styles.shareCardText}>Share Card</Text>
          </Pressable>
          <Pressable 
            style={({pressed}) => [
              styles.syncToggleButton, 
              pressed && styles.pressed,
              isSyncLocked && styles.syncToggleActive
            ]} 
            onPress={() => setIsSyncLocked(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel={isSyncLocked ? "Disable auto-scroll synchronization" : "Enable auto-scroll synchronization"}
          >
            <Icon 
              name="sync" 
              size={18} 
              color={isSyncLocked ? colors.onPrimary : colors.onSurfaceVariant} 
            />
          </Pressable>
        </View>

        {/* Scrubber Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.min(100, (position / Math.max(1, duration)) * 100)}%` }
              ]} 
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Transport Controls */}
        <View style={styles.transportControls}>
          <Pressable 
            style={({pressed}) => [styles.transportButton, pressed && styles.pressed]}
            onPress={() => queue.toggleShuffle()}
          >
            <Icon name="shuffle" size={20} color={queue.shuffle ? colors.primary : colors.onSurfaceVariant} />
          </Pressable>
          <Pressable 
            style={({pressed}) => [styles.transportButton, pressed && styles.pressed]}
            onPress={handlePrev}
          >
            <Icon name="play-skip-back" size={28} color={colors.onSurface} />
          </Pressable>
          <Pressable 
            style={({pressed}) => [styles.playPauseButton, pressed && styles.pressed]}
            onPress={handleTogglePlay}
          >
            <Icon name={isPlaying ? "pause" : "play"} size={32} color={colors.onPrimary} />
          </Pressable>
          <Pressable 
            style={({pressed}) => [styles.transportButton, pressed && styles.pressed]}
            onPress={handleNext}
          >
            <Icon name="play-skip-forward" size={28} color={colors.onSurface} />
          </Pressable>
          <Pressable 
            style={({pressed}) => [styles.transportButton, pressed && styles.pressed]}
            onPress={() => queue.setRepeat(queue.repeat === 'off' ? 'all' : queue.repeat === 'all' ? 'one' : 'off')}
          >
            <Icon name="repeat" size={20} color={queue.repeat !== 'off' ? colors.primary : colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    ...t.h3,
    color: colors.onSurface,
  },
  emptyBody: {
    ...t.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    width: 320,
    height: 288,
    borderRadius: 160,
    backgroundColor: colors.primaryContainer,
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: (sp as any).margin || 24,
    paddingTop: sp.xs,
    paddingBottom: sp.sm,
    backgroundColor: 'rgba(17, 19, 24, 0.8)',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: sp.xs,
  },
  headerSubtitle: {
    ...t.labelSm,
    color: colors.outlineText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    ...t.titleMd,
    color: colors.onSurface,
  },
  anchorCardContainer: {
    paddingHorizontal: (sp as any).margin || 24,
    marginBottom: sp.sm,
  },
  anchorCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: r.xl,
    padding: sp.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anchorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    flex: 1,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: r.lg,
  },
  anchorText: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    fontFamily: FONTS.display,
    ...t.titleMd,
    color: colors.onSurface,
  },
  artistName: {
    ...t.bodySm,
    color: colors.onSurfaceVariant,
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsScroll: {
    flex: 1,
    width: '100%',
  },
  lyricsScrollContent: {
    paddingHorizontal: (sp as any).margin || 24,
    paddingVertical: sp.md,
  },
  fadeMaskTop: {
    height: 16,
    width: '100%',
  },
  lyricsContainer: {
    flexDirection: 'column',
    gap: sp.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.md,
    marginTop: sp.xxl,
  },
  placeholderText: {
    ...t.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: sp.xl,
  },
  lyricLine: {
    opacity: 0.7,
  },
  lyricText: {
    ...t.h2,
    color: colors.onSurfaceVariant,
  },
  pastLyricText: {
    color: colors.onSurfaceVariant,
    opacity: 0.5,
  },
  activeLyricLineContainer: {
    marginVertical: sp.xs,
    padding: sp.sm,
    marginHorizontal: -sp.sm,
    backgroundColor: 'rgba(40, 42, 47, 0.6)', 
    borderRadius: r.xl,
    flexDirection: 'row',
  },
  activeLyricIndicator: {
    position: 'absolute',
    left: 6,
    top: 12,
    bottom: 12,
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: r.full,
  },
  activeLyricTextContainer: {
    paddingLeft: sp.sm,
    gap: sp.xs,
  },
  activeLyricText: {
    ...t.h2,
    fontWeight: '600',
    color: (colors as any).primaryFixed || colors.primary,
  },
  providerCreditContainer: {
    marginTop: sp.xl,
    paddingTop: sp.md,
    paddingBottom: sp.lg,
    alignItems: 'center',
    gap: sp.sm,
  },
  providerCreditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerCreditText: {
    ...t.labelSm,
    color: colors.outlineText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: sp.md,
    paddingVertical: 6,
    borderRadius: r.full,
    backgroundColor: colors.surfaceContainer,
  },
  reportButtonText: {
    ...t.bodySm,
    color: colors.onSurfaceVariant,
  },
  bottomDock: {
    width: '100%',
    backgroundColor: 'rgba(12, 14, 19, 0.95)',
    paddingHorizontal: (sp as any).margin || 24,
    paddingTop: sp.sm,
    gap: sp.xs,
  },
  lyricUtilsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.xs,
  },
  shareCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: sp.md,
    paddingVertical: 4,
    borderRadius: r.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  shareCardText: {
    ...t.labelMd,
    color: colors.onSurface,
  },
  syncToggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  syncToggleActive: {
    backgroundColor: colors.primary,
  },
  progressContainer: {
    width: '100%',
    gap: 4,
    paddingHorizontal: sp.xs,
    paddingTop: sp.xs,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: (colors as any).surfaceContainerHighest || colors.surfaceContainerHigh,
    borderRadius: r.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: r.full,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Monospace keeps the elapsed time from shifting as the digits tick.
  timeText: {
      fontFamily: FONTS.mono,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.3,
      color: colors.onSurfaceVariant,
    },
  transportControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
  },
  transportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: sp.xs,
    paddingTop: 2,
  },
  routeIndicatorText: {
    ...t.labelSm,
    color: colors.primary,
    fontWeight: '500',
  },
});
