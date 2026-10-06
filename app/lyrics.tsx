import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../src/components/ui/Icon';
import CoverThumb from '../src/components/ui/CoverThumb';
import PlayerTabBar, { PlayerTab } from '../src/components/ui/PlayerTabBar';
import { EmptyState } from '../src/components/ui/primitives';
import { colors, r, t } from '../src/theme/theme';
import { usePlaybackStore } from '../src/store/playbackStore';
import { audioService } from '../src/audio/AudioService';
import { useLibraryStore } from '../src/store/libraryStore';
import { useResponsive } from '../src/hooks/useResponsive';
import { useBackHandler } from '../src/hooks/useBackHandler';
import { LyricLineItem, isArabicText } from '../src/services/lyricsParser';
import { lyricsService } from '../src/services/lyricsService';

export default function LyricsScreen() {
  const router = useRouter();
  const { gutter, maxContentWidth } = useResponsive();
  const { currentTrack, isPlaying, positionMs, durationMs } = usePlaybackStore();
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore();

  const [items, setItems] = useState<LyricLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLocked, setSyncLocked] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const lineYRefs = useRef<Record<number, number>>({});

  const trackId = currentTrack?.id;
  const liked = trackId ? isFavorite(trackId) : false;

  useEffect(() => {
    let active = true;
    if (!currentTrack) {
      const timer = setTimeout(() => {
        if (!active) return;
        setItems([]);
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    void (async () => {
      setLoading(true);
      try {
        const res = await lyricsService.getLyrics(currentTrack, durationMs);
        if (!active) return;
        setItems(res.items);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentTrack, durationMs]);

  /**
   * The active line is the last one whose timestamp has passed.
   */
  const synced = useMemo(() => items.some((item) => item.timeMs !== undefined), [items]);

  const activeIndex = useMemo(() => {
    if (!synced || items.length === 0) return -1;
    let active = -1;
    for (let i = 0; i < items.length; i += 1) {
      const time = items[i].timeMs;
      if (time === undefined) continue;
      if (time <= positionMs) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }, [items, positionMs, synced]);

  useEffect(() => {
    if (!syncLocked || activeIndex < 0 || !scrollRef.current) return;
    const y = lineYRefs.current[activeIndex];
    const targetY = typeof y === 'number' ? Math.max(0, y - 180) : Math.max(0, activeIndex * 84 - 180);
    scrollRef.current.scrollTo({ y: targetY, animated: true });
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
    if (tab === 'lyrics') return;
    if (tab === 'now-playing') {
      router.replace('/now-playing' as any);
      return;
    }
    router.replace(`/${tab}` as any);
  };

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  const handleDismiss = () => {
    if (router.canDismiss?.()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)');
    }
  };

  useBackHandler(() => {
    handleDismiss();
    return true;
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={16}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close lyrics"
        >
          <Icon name="chevron-down" size={24} color={colors.textPrimary} />
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
            name={syncLocked ? 'lock' : 'lock-open'}
            size={18}
            color={syncLocked ? colors.accent : colors.disabled}
          />
        </Pressable>
      </View>

      {/* Sticky top context bar */}
      <View style={s.contextCard}>
        <CoverThumb
          uri={currentTrack?.coverUrl ?? currentTrack?.artwork}
          pattern="lines"
          size={42}
          borderRadius={r.sm}
          showGlow={isPlaying}
        />

        <View style={s.contextMeta}>
          <Text style={s.contextTitle} numberOfLines={1}>
            {currentTrack?.title ?? 'Nothing playing'}
          </Text>
          <Text style={s.contextArtist} numberOfLines={1}>
            {currentTrack ? [currentTrack.artist, currentTrack.album].filter(Boolean).join(' · ') : '—'}
          </Text>
        </View>

        <Pressable
          onPress={handleToggleFavorite}
          hitSlop={8}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove from saved' : 'Save track'}
        >
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? colors.accent : colors.textTertiary}
          />
        </Pressable>

        <Pressable
          onPress={handleTogglePlay}
          hitSlop={8}
          style={({ pressed }) => [s.playBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={16}
            color={colors.onAccent}
          />
        </Pressable>

        {/* Progress track */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          s.content,
          {
            paddingHorizontal: gutter,
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lyric lines */}
        {loading ? (
          <Text style={s.statusNotice}>Retrieving synchronized lyrics…</Text>
        ) : items.length === 0 ? (
          <EmptyState
            code="EMPTY_03"
            title="No lyrics found"
            body="Synchronized lyrics are not available for this track."
            actionLabel="BACK TO PLAYER"
            onAction={() => router.replace('/now-playing' as any)}
          />
        ) : (
          <View style={s.lyricList}>
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              const isPast = activeIndex >= 0 && index < activeIndex;
              const isArabic = item.isRtl ?? isArabicText(item.text);

              if (isActive) {
                return (
                  <Pressable
                    key={item.id}
                    onLayout={(e) => {
                      lineYRefs.current[index] = e.nativeEvent.layout.y;
                    }}
                    onPress={() => handleLinePress(item)}
                    style={({ pressed }) => [
                      s.activeLineWrap,
                      isArabic && s.activeLineWrapArabic,
                      pressed && s.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Now playing: ${item.text}. Tap to jump.`}
                  >
                    <View style={[s.activeLineBody, isArabic && s.activeLineBodyArabic]}>
                      <Text
                        style={[
                          s.activeLineText,
                          isArabic ? s.textArabic : s.textEnglish,
                        ]}
                      >
                        {item.text}
                      </Text>
                      <View style={[s.levelDots, isArabic && s.levelDotsArabic]}>
                        <View style={[s.levelDot, s.levelDotFilled]} />
                        <View style={[s.levelDot, s.levelDotFilled]} />
                        <View style={s.levelDot} />
                      </View>
                    </View>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={item.id}
                  onLayout={(e) => {
                    lineYRefs.current[index] = e.nativeEvent.layout.y;
                  }}
                  onPress={() => handleLinePress(item)}
                  style={({ pressed }) => [
                    s.lineWrap,
                    isArabic && s.lineWrapArabic,
                    pressed && s.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Lyric: ${item.text}. Tap to jump.`}
                >
                  <Text
                    style={[
                      s.lineText,
                      isPast && s.lineTextPast,
                      isArabic ? s.textArabic : s.textEnglish,
                    ]}
                  >
                    {item.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Capsule tab bar */}
      <PlayerTabBar active="lyrics" onSelect={goToPlayerTab} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...t.headline,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: r.md,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    position: 'relative',
  },
  contextMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  contextTitle: {
    ...t.bodyStrong,
    color: colors.textPrimary,
  },
  contextArtist: {
    ...t.caption,
    color: colors.textTertiary,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.surface2,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
  },

  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  lyricList: {
    gap: 24,
  },
  lineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    width: '100%',
  },
  lineWrapArabic: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  lineText: {
    flex: 1,
    ...t.headline,
    fontSize: 18,
    lineHeight: 26,
    color: colors.textTertiary,
  },
  lineTextPast: {
    color: colors.textPast,
  },

  activeLineWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderRadius: r.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
    width: '100%',
  },
  activeLineWrapArabic: {
    flexDirection: 'row-reverse',
  },
  activeLineBody: {
    flex: 1,
    gap: 8,
  },
  activeLineBodyArabic: {
    alignItems: 'flex-end',
  },
  activeLineText: {
    ...t.title,
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
    fontWeight: '700',
  },

  /* Arabic vs English typography */
  textArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 34,
  },
  textEnglish: {
    textAlign: 'left',
    writingDirection: 'ltr',
    lineHeight: 26,
  },

  levelDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  levelDotsArabic: {
    flexDirection: 'row-reverse',
  },
  levelDot: {
    width: 8,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.surface2,
  },
  levelDotFilled: {
    backgroundColor: colors.accent,
  },

  statusNotice: {
    ...t.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 48,
  },
});