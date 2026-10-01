import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, ScrollView } from 'react-native';
import Icon from '../ui/Icon';
import { getSuggestions, Suggestion } from '../../services/suggestionEngine';
import { useListeningStore } from '../../store/listeningStore';
import { isOnline } from '../../services/connectivity';
import { audioService } from '../../audio/AudioService';
import { useQueueStore, cacheTracks } from '../../store/queueStore';
import { useDownloadStore } from '../../downloads/downloadStore';

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
  const isDownloaded = useDownloadStore((state) => state.isTrackDownloaded);

  const load = useCallback(async () => {
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
    }, [seed]);

  const playAll = async () => {
    if (items.length === 0) return;
    const tracks = items.map((item) => item.track);
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, 0, {
      type: seed ? 'collection' : 'radio',
      name: seed ? seed.title : 'Made for you',
    });
    await audioService.playTrack(tracks[0]);
  };

  const playOne = async (index: number) => {
    const tracks = items.map((item) => item.track);
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, index, {
      type: seed ? 'collection' : 'radio',
      name: seed ? seed.title : 'Made for you',
    });
    await audioService.playTrack(tracks[index]);
  };

  if (state === 'loading') {
    return (
      <View style={s.container}>
        <Text style={s.headerTitle}>Made for you</Text>
        <Text style={s.loadingText}>Reading your listening history.</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={s.container}>
        <Text style={s.headerTitle}>Made for you</Text>
        <Text style={s.emptyBody}>
          Suggestions could not be built. Try again in a moment.
        </Text>
        <Pressable
          onPress={() => void load()}
          style={s.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={s.actionText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={s.container}>
        <Text style={s.headerTitle}>Made for you</Text>
        <Text style={s.emptyBody}>
          {hasHistory
            ? 'Nothing scored high enough yet. Play a few more tracks and this fills in.'
            : `Play or favorite a few tracks and this section learns from what you listen to.${
                isOnline() ? '' : ' You are offline, so only downloaded music is used.'
              }`}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.headerTitle}>Made for you</Text>
        <Pressable
          onPress={() => void playAll()}
          style={s.playAllButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Play all suggestions"
        >
          <Text style={s.playAllText}>Play all</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {items.map((item, index) => (
          <Pressable
            key={item.track.id}
            style={s.card}
            onPress={() => void playOne(index)}
            accessibilityRole="button"
            accessibilityLabel={`${item.track.title} by ${item.track.artist}. ${item.reason}`}
          >
            {item.track.coverUrl ? (
              <Image source={{ uri: item.track.coverUrl }} style={s.artwork} />
            ) : (
              <View style={[s.artwork, s.artworkPlaceholder]}>
                <Icon name="musical-notes" size={22} color="#8e8e93" />
              </View>
            )}
            <Text numberOfLines={2} style={s.cardTitle}>{item.track.title}</Text>
            <Text numberOfLines={1} style={s.cardArtist}>{item.track.artist}</Text>
            <View style={s.reasonRow}>
              <Icon name="information-circle-outline" size={12} color="#8e8e93" />
              <Text numberOfLines={1} style={s.cardReason}>{item.reason}</Text>
            </View>
            {isDownloaded(item.track.id) && (
              <View style={s.downloadedTag}>
                <Icon name="checkmark-circle" size={12} color="#00e5bf" />
                <Text style={s.downloadedText}>On device</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 20,
  },
  playAllButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  playAllText: {
    fontSize: 14,
    color: '#00e5bf',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#8e8e93',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  actionButton: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: 22,
    backgroundColor: '#2c2c2e',
  },
  actionText: {
    fontSize: 14,
    color: '#ffffff',
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
    lineHeight: 18,
  },
  cardArtist: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  cardReason: {
    flex: 1,
    fontSize: 11,
    color: '#8e8e93',
  },
  downloadedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  downloadedText: {
    fontSize: 11,
    color: '#00e5bf',
  },
});