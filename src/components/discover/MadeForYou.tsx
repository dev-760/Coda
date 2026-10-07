import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Icon from '../ui/Icon';
import { SectionHeader } from '../ui/primitives';
import { getSuggestions, Suggestion } from '../../services/suggestionEngine';
import { useListeningStore } from '../../store/listeningStore';
import { isOnline } from '../../services/connectivity';
import { audioService } from '../../audio/AudioService';
import { useQueueStore, cacheTracks } from '../../store/queueStore';
import { useDownloadStore } from '../../downloads/downloadStore';
import { colors, FONTS, r, t } from '../../theme/theme';

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/**
 * Suggestions come from what is on the device, so a new user sees an honest
 * empty state instead of invented picks.
 */
export default function MadeForYou({
  seed,
}: {
  seed?: { id: string; title: string; artist: string } | null;
}) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const hasHistory = useListeningStore((store) => store.hasHistory());
  const isDownloaded = useDownloadStore((store) => store.isTrackDownloaded);
  // Suggestions are derived from listening history, so a finished track has to
  // invalidate the list. Subscribing to the record count is enough and avoids
  // re-ranking on every position tick.
  const playedCount = useListeningStore((store) => Object.keys(store.stats).length);

  const fetchSuggestions = useCallback(async () => {
    setState('loading');
    try {
      const results = await getSuggestions(
        seed ? { id: seed.id, title: seed.title, artist: seed.artist } : null,
        12,
      );
      setItems(results);
      setState(results.length === 0 ? 'empty' : 'ready');
    } catch {
      setState('error');
    }
  }, [seed]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const results = await getSuggestions(
          seed ? { id: seed.id, title: seed.title, artist: seed.artist } : null,
          12,
        );
        if (!active) return;
        setItems(results);
        setState(results.length === 0 ? 'empty' : 'ready');
      } catch {
        if (active) setState('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [seed, playedCount]);

  const playAll = async () => {
    if (items.length === 0) return;
    const tracks = items.map((item) => item.track);
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, 0, {
      type: 'collection',
      name: seed ? seed.title : 'Made for you',
    });
    await audioService.playTrack(tracks[0]);
  };

  const playOne = async (index: number) => {
    const tracks = items.map((item) => item.track);
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, index, {
      type: 'collection',
      name: seed ? seed.title : 'Made for you',
    });
    await audioService.playTrack(tracks[index]);
  };

  if (state === 'error') {
    return (
      <View style={s.container}>
        <SectionHeader title="Made for you" />
        <Text style={s.emptyBody}>Suggestions could not be built. Try again in a moment.</Text>
        <Pressable
          onPress={() => {
            setState('loading');
            void fetchSuggestions().catch(() => setState('error'));
          }}
          style={({ pressed }) => [s.retryButton, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={s.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'loading') {
    return (
      <View style={s.container}>
        <SectionHeader title="Made for you" eyebrow="Finding music" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={s.card}>
              <View style={[s.cardArtWrap, s.skeletonArt]} />
              <View style={s.skeletonTitle} />
              <View style={s.skeletonSubtitle} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={s.container}>
        <SectionHeader title="Made for you" />
        <Text style={s.emptyBody}>
          {isOnline()
            ? hasHistory
              ? 'Nothing scored high enough yet. Play a few more tracks and this fills in.'
              : 'Play or favorite a few tracks and this section learns from what you listen to.'
            : 'You are offline, so this fills in from downloaded music and your collection. Reconnect for fresh picks.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <SectionHeader
        title="Made for you"
        eyebrow={`${items.length} picks`}
        actionLabel="Play all"
        onAction={() => void playAll()}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {items.map((item, index) => (
          <Pressable
            key={item.track.id}
            style={({ pressed }) => [s.card, pressed && s.pressed]}
            onPress={() => void playOne(index)}
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
              {isDownloaded(item.track.id) && (
                <View style={s.downloadedBadge}>
                  <Icon name="arrow-down-circle" size={13} color={colors.onSurface} />
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={s.cardTitle}>{item.track.title}</Text>
            <Text numberOfLines={1} style={s.cardArtist}>{item.track.artist}</Text>
            <Text numberOfLines={1} style={s.cardReason}>{item.reason}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  rail: {
    gap: 12,
    paddingRight: 16,
  },
  card: {
    width: 144,
    gap: 4,
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
    marginBottom: 4,
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
  downloadedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 19, 22, 0.85)',
  },
  skeletonArt: {
    backgroundColor: colors.surfaceVariant,
  },
  skeletonTitle: {
    width: 110,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
    marginBottom: 4,
  },
  skeletonSubtitle: {
    width: 70,
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
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
  cardReason: {
    ...t.micro,
    color: colors.outlineText,
  },
  emptyBody: {
    ...t.bodyMd,
    color: colors.outlineText,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  retryText: {
    ...t.labelMd,
    color: colors.onSurface,
  },
});