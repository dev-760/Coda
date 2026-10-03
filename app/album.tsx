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
import { getAlbum } from '../src/services/catalogService';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, FONTS } from '../src/theme/theme';

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

function formatDuration(durationMs?: number): string {
  if (!durationMs) return '--:--';
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { bottomBarClearance } = useResponsive();

  // albumId is the only field that lets the track list be fetched. The rest are
  // passed alongside it for an instant first paint, then replaced by real data.
  const albumId = typeof params.albumId === 'string' ? params.albumId : '';
  const title = (params.title as string) || 'Album';
  const artist = (params.artist as string) || 'Unknown Artist';
  const artistId = (params.artistId as string) || '';
  const fallbackCover = (params.coverUrl as string) || '';

  const [albumTitle, setAlbumTitle] = useState(title);
  const [albumArtist, setAlbumArtist] = useState(artist);
  const [cover, setCover] = useState(fallbackCover);
  const [releaseDate, setReleaseDate] = useState<string | null>(null);
  const [explicit, setExplicit] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [state, setState] = useState<LoadState>(albumId ? 'loading' : 'notFound');
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!albumId) {
      setState('notFound');
      return;
    }
    setState('loading');
    try {
      const result = await getAlbum(albumId);
      if (!result) {
        setState('notFound');
        return;
      }
      setAlbumTitle(result.album.title);
      setAlbumArtist(result.album.artist);
      setCover(result.album.cover ?? fallbackCover);
      setReleaseDate(result.album.releaseDate);
      setExplicit(result.album.explicit);
      setTracks(result.tracks);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [albumId, fallbackCover]);

  useEffect(() => {
    // Deferred a tick so the initial state comes from the route params and the
    // fetch does not run synchronously inside the effect body.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const playAlbum = (fromIndex = 0) => {
    if (tracks.length === 0) return;
    cacheTracks(tracks);
    useQueueStore
      .getState()
      .playContext(tracks, fromIndex, { type: 'album', name: albumTitle });
    void audioService.playTrack(tracks[fromIndex]);
  };

  const handleShuffle = () => {
    playAlbum();
    useQueueStore.getState().toggleShuffle();
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Listen to "${albumTitle}" by ${albumArtist} on Luma` });
    } catch {}
  };

  const openArtist = () => {
    if (!artistId) return;
    router.push({
      pathname: '/artist' as any,
      params: { artistId, name: albumArtist, coverUrl: cover },
    });
  };

  const year = releaseDate ? releaseDate.slice(0, 4) : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {cover ? (
        <View style={s.backdrop} pointerEvents="none">
          <Image source={{ uri: cover }} style={s.backdropImage} blurRadius={40} />
          <View style={s.backdropGradient} />
        </View>
      ) : null}

      <HeaderBar showBack />

      <ScrollView
        contentContainerStyle={[{ paddingBottom: bottomBarClearance + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.coverContainer}>
          {cover ? (
            <Image source={{ uri: cover }} style={s.coverArt} />
          ) : (
            <View style={[s.coverArt, s.coverPlaceholder]}>
              <Icon name="albums-outline" size={44} color={colors.onSurfaceVariant} />
            </View>
          )}
        </View>

        <View style={s.metaCenter}>
          <Text style={s.albumTitle}>{albumTitle}</Text>
          {artistId ? (
            <Pressable style={s.artistRow} onPress={openArtist} accessibilityRole="button">
              {cover ? <Image source={{ uri: cover }} style={s.artistAvatar} /> : null}
              <Text style={s.artistName}>{albumArtist}</Text>
            </Pressable>
          ) : (
            <View style={s.artistRow}>
              <Text style={s.artistName}>{albumArtist}</Text>
            </View>
          )}
          {(year || explicit) && (
            <View style={s.badgesRow}>
              {year ? <Text style={s.yearText}>{year}</Text> : null}
              {explicit ? (
                <View style={s.qualityBadge}>
                  <Text style={s.qualityText}>E</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={s.bigButtonsRow}>
          <Pressable
            style={[s.playBtn, tracks.length === 0 && s.playBtnDisabled]}
            onPress={() => playAlbum()}
            disabled={tracks.length === 0}
            accessibilityRole="button"
            accessibilityLabel={`Play ${albumTitle}`}
          >
            <Icon name="play" size={20} color={colors.background} />
            <Text style={s.playBtnText}>Play</Text>
          </Pressable>
          <Pressable
            style={[s.shuffleBtn, tracks.length === 0 && s.shuffleBtnDisabled]}
            onPress={handleShuffle}
            disabled={tracks.length === 0}
            accessibilityRole="button"
            accessibilityLabel={`Shuffle ${albumTitle}`}
          >
            <Icon name="shuffle" size={20} color={colors.onSurface} />
            <Text style={s.shuffleBtnText}>Shuffle</Text>
          </Pressable>
        </View>

        <View style={s.actionsRow}>
          <Pressable style={s.actionItem} onPress={() => setSaved((v) => !v)} accessibilityRole="button">
            <Icon name={saved ? 'heart' : 'heart-outline'} size={24} color={colors.onSurface} />
            <Text style={s.actionLabel}>{saved ? 'Added' : 'Add'}</Text>
          </Pressable>
          <Pressable style={s.actionItem} onPress={handleShare} accessibilityRole="button">
            <Icon name="share-outline" size={24} color={colors.onSurface} />
            <Text style={s.actionLabel}>Share</Text>
          </Pressable>
        </View>

        {state === 'loading' ? (
          <View style={s.stateBlock}>
            <ActivityIndicator color={colors.accent} />
            <Text style={s.stateText}>Loading album</Text>
          </View>
        ) : state === 'notFound' ? (
          <View style={s.stateBlock}>
            <Text style={s.stateText}>This album could not be loaded.</Text>
            <Pressable onPress={() => void load()} style={s.retryBtn} accessibilityRole="button">
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : state === 'error' ? (
          <View style={s.stateBlock}>
            <Text style={s.stateText}>Something went wrong loading this album.</Text>
            <Pressable onPress={() => void load()} style={s.retryBtn} accessibilityRole="button">
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : tracks.length === 0 ? (
          <View style={s.stateBlock}>
            <Text style={s.stateText}>This album has no playable tracks.</Text>
          </View>
        ) : (
          <View style={s.trackList}>
            {tracks.map((track, index) => (
              <Pressable
                key={track.id}
                style={s.trackItem}
                onPress={() => playAlbum(index)}
                onLongPress={() => setOptionsTrack(track)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${track.title}`}
              >
                <Text style={s.trackNum}>{index + 1}</Text>
                <View style={s.trackTextCol}>
                  <Text numberOfLines={1} style={s.trackTitle}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={1} style={s.trackArtist}>
                    {albumArtist}
                  </Text>
                </View>
                <Text style={s.trackDuration}>{formatDuration(track.durationMs)}</Text>
                <Pressable
                  style={s.moreBtn}
                  onPress={() => setOptionsTrack(track)}
                  hitSlop={8}
                  accessibilityLabel={`More options for ${track.title}`}
                >
                  <Icon name="ellipsis-horizontal" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
              </Pressable>
            ))}
          </View>
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
    backgroundColor: colors.background,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  backdropGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 130,
    gap: 16,
  },
  coverContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  coverArt: {
    width: 190,
    height: 190,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainer,
  },
  metaCenter: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  albumTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artistAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  artistName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  qualityBadge: {
    backgroundColor: '#163330',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  bigButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  playBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.onSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  shuffleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shuffleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '500',
  },
  trackList: {
    gap: 14,
    marginTop: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  trackNum: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    width: 20,
    textAlign: 'center',
  },
  trackTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackTitle: {
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  trackArtist: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  trackDuration: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginRight: 4,
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
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 22,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHighest,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
});

