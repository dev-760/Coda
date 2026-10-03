import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import Icon from '../src/components/ui/Icon';
import PlayerTabBar, { PlayerTab } from '../src/components/ui/PlayerTabBar';
import { colors, FONTS, r, t } from '../src/theme/theme';
import { usePlaybackStore } from '../src/store/playbackStore';
import { audioService } from '../src/audio/AudioService';
import { hifiApiClient } from '../src/services/hifiApiClient';
import { useLibraryStore } from '../src/store/libraryStore';
import { parseLyricsPayload, LyricLineItem } from '../src/services/lyricsParser';

const formatTime = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function LyricsScreen() {
  const router = useRouter();
  const { currentTrack, isPlaying, positionMs, durationMs } = usePlaybackStore();
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore();

  const [items, setItems] = useState<LyricLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLocked, setSyncLocked] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const trackId = currentTrack?.id;
  const liked = trackId ? isFavorite(trackId) : false;

  useEffect(() => {
    if (!trackId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    hifiApiClient
      .getLyrics(trackId)
      .then((data) => {
        if (!active) return;
        const parsed = parseLyricsPayload(data);
        setItems(parsed);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trackId]);

  /**
   * The active line is the last one whose timestamp has passed. With no
   * timestamps there is no sync to do, so every line renders as static text
   * rather than pretending to be one live.
   */
  const synced = useMemo(() => items.some((item) => item.timeMs !== undefined), [items]);

  const activeIndex = useMemo(() => {
    if (!synced) return -1;
    let active = -1;
    for (let i = 0; i < items.length; i += 1) {
      const time = items[i].timeMs;
      if (time === undefined) continue;
      if (time <= positionMs) active = i;
      else break;
    }
    return active;
  }, [items, positionMs, synced]);

  useEffect(() => {
    if (!syncLocked || activeIndex < 0 || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: Math.max(0, activeIndex * 88 - 220), animated: true });
  }, [activeIndex, syncLocked]);

  const handleLinePress = (item: LyricLineItem) => {
    if (item.timeMs !== undefined) {
      void audioService.seekTo(item.timeMs);
    }
  };

  const handleTogglePlay = async () => {
    if (isPlaying) await audioService.pause();
    else await audioService.resume();
  };

  const handleToggleFavorite = async () => {
    if (!trackId) return;
    if (liked) await removeFavorite(trackId);
    else await addFavorite(currentTrack!);
  };

  const goToPlayerTab = (tab: PlayerTab) => {
    router.push(`/${tab}` as any);
  };

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.push('/now-playing' as any)}
          hitSlop={10}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to now playing"
        >
          <Icon name="chevron-down" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={s.headerTitle}>LYRICS</Text>
        <Pressable
          onPress={() => setSyncLocked((prev) => !prev)}
          hitSlop={10}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="switch"
          accessibilityState={{ checked: syncLocked }}
          accessibilityLabel={syncLocked ? 'Disable lyric sync' : 'Enable lyric sync'}
        >
          <Icon
            name="sync"
            size={19}
            color={syncLocked ? colors.onSurface : colors.outlineText}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Sticky context player card */}
        <View style={s.contextCard}>
          {currentTrack?.coverUrl || currentTrack?.artwork ? (
            <Image
              source={{ uri: (currentTrack.coverUrl ?? currentTrack.artwork) as string }}
              style={s.contextArt}
            />
          ) : (
            <View style={[s.contextArt, s.contextArtFallback]}>
              <Icon name="musical-note" size={16} color={colors.outlineText} />
            </View>
          )}

          <View style={s.contextMeta}>
            <Text style={s.contextTitle} numberOfLines={1}>{currentTrack?.title ?? 'Nothing playing'}</Text>
            <Text style={s.contextArtist} numberOfLines={1}>
              {currentTrack ? [currentTrack.artist, currentTrack.album].filter(Boolean).join(' • ') : '—'}
            </Text>
          </View>

          <Pressable
            onPress={handleToggleFavorite}
            hitSlop={6}
            style={({ pressed }) => [pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Icon name={liked ? 'heart' : 'heart-outline'} size={20} color={colors.onSurface} />
          </Pressable>

          <Pressable
            onPress={handleTogglePlay}
            hitSlop={6}
            style={({ pressed }) => [s.contextPlay, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} color={colors.onPrimary} />
          </Pressable>

          {/* Progress sits under the card content, matching the mockup */}
          <View style={s.contextProgressWrap}>
            <View style={s.contextTrack}>
              <View style={[s.contextFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={s.contextTimes}>
              <Text style={s.contextTime}>{formatTime(positionMs)}</Text>
              <Text style={s.contextTime}>{formatTime(durationMs)}</Text>
            </View>
          </View>
        </View>

        {/* Lyric lines */}
        {loading ? (
          <Text style={s.emptyText}>Loading synchronized lyrics…</Text>
        ) : items.length === 0 ? (
          <Text style={s.emptyText}>No lyrics available for this track.</Text>
        ) : (
          <View style={s.lyricList}>
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              const isPast = activeIndex >= 0 && index < activeIndex;

              if (isActive) {
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleLinePress(item)}
                    style={({ pressed }) => [s.activeLineWrap, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Now singing: ${item.text}. Tap to replay.`}
                  >
                    <Text style={s.activeTime}>{formatTime(item.timeMs ?? 0)}</Text>
                    <View style={s.activeLineBody}>
                      <Text style={s.activeLineText}>{item.text}</Text>
                      <View style={s.activeIndicatorRow}>
                        <View style={[s.activeDash, { height: 4 }]} />
                        <View style={[s.activeDash, s.activeDashLong, { height: 4 }]} />
                        <View style={[s.activeDash, { height: 4 }]} />
                      </View>
                    </View>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleLinePress(item)}
                  style={({ pressed }) => [s.lineWrap, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Lyric: ${item.text}. Tap to jump here.`}
                >
                  {item.timeMs !== undefined && (
                    <Text style={[s.lineTime, isPast && s.lineTimePast]}>
                      {formatTime(item.timeMs)}
                    </Text>
                  )}
                  <Text style={[s.lineText, isPast && s.lineTextPast]}>{item.text}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <PlayerTabBar active="lyrics" onSelect={goToPlayerTab} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceDeep,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...t.titleMd,
    color: colors.onSurface,
  },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
    flexWrap: 'wrap',
  },
  contextArt: {
    width: 48,
    height: 48,
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainer,
  },
  contextArtFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  contextTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  contextArtist: {
    ...t.bodySm,
    color: colors.outlineText,
  },
  contextPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onSurface,
  },
  contextProgressWrap: {
    width: '100%',
    marginTop: 4,
    gap: 4,
  },
  contextTrack: {
    height: 3,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  contextFill: {
    height: 3,
    borderRadius: r.pill,
    backgroundColor: colors.onSurface,
  },
  contextTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contextTime: {
    ...t.mono,
    color: colors.onSurfaceVariant,
  },

  lyricList: {
    gap: 28,
  },
  lineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  lineTime: {
    ...t.mono,
    width: 44,
    paddingTop: 4,
    color: colors.outlineText,
  },
  lineTimePast: {
    opacity: 0.5,
  },
  lineText: {
    flex: 1,
    fontFamily: FONTS.content,
    fontSize: 18,
    lineHeight: 26,
    color: colors.outlineText,
  },
  lineTextPast: {
    opacity: 0.45,
  },

  activeLineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  activeTime: {
    ...t.mono,
    width: 44,
    paddingTop: 2,
    color: colors.onSurface,
  },
  activeLineBody: {
    flex: 1,
    gap: 12,
  },
  activeLineText: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.onSurface,
  },
  activeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDash: {
    width: 14,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHighest,
  },
  activeDashLong: {
    width: 28,
    backgroundColor: colors.onSurface,
  },

  emptyText: {
    ...t.bodyMd,
    color: colors.outlineText,
    textAlign: 'center',
    paddingVertical: 48,
  },
});