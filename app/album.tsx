import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import HeaderBar from '../src/components/ui/HeaderBar';
import Icon from '../src/components/ui/Icon';
import MiniPlayer from '../src/components/ui/MiniPlayer';
import TrackOptionsMenu from '../src/components/ui/TrackOptionsMenu';
import { audioService } from '../src/audio/AudioService';
import { useQueueStore } from '../src/store/queueStore';
import { useLibraryStore } from '../src/store/libraryStore';
import { Track } from '../src/providers/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SAMPLE_TRACKS = [
  { id: 't1', num: 1, title: 'Beautiful Tango (Remastered Version)', artist: 'Hindi Zahra', durationMs: 236000 },
  { id: 't2', num: 2, title: 'Oursoul (Remastered Version)', artist: 'Hindi Zahra', durationMs: 202000 },
  { id: 't3', num: 3, title: 'Fascination (Remastered Version)', artist: 'Hindi Zahra', durationMs: 218000 },
  { id: 't4', num: 4, title: 'Set Me Free (Remastered Version)', artist: 'Hindi Zahra', durationMs: 245000 },
  { id: 't5', num: 5, title: 'Kiss & Thrills (Remastered Version)', artist: 'Hindi Zahra', durationMs: 210000 },
  { id: 't6', num: 6, title: 'At The Same Time (Remastered Version)', artist: 'Hindi Zahra', durationMs: 198000 },
];

export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const title = (params.title as string) || 'Handmade';
  const artist = (params.artist as string) || 'Hindi Zahra';
  const coverUrl = (params.coverUrl as string) || 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg';

  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { playContext } = useQueueStore();

  const handlePlayAlbum = () => {
    const tracks: Track[] = SAMPLE_TRACKS.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: title,
      durationMs: t.durationMs,
      coverUrl,
    }));
    playContext(tracks, 0, { type: 'album', name: title });
    void audioService.playTrack(tracks[0]);
  };

  const handleShuffleAlbum = () => {
    handlePlayAlbum();
    useQueueStore.getState().toggleShuffle();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Listen to "${title}" by ${artist} on Luma`,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Ambient Backdrop */}
      <View style={s.backdrop}>
        <Image source={{ uri: coverUrl }} style={s.backdropImage} blurRadius={40} />
        <View style={s.backdropGradient} />
      </View>

      <HeaderBar showBack />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Album Cover */}
        <View style={s.coverContainer}>
          <Image source={{ uri: coverUrl }} style={s.coverArt} />
        </View>

        {/* Album Meta */}
        <View style={s.metaCenter}>
          <Text style={s.albumTitle}>{title}</Text>
          <Pressable
            style={s.artistRow}
            onPress={() => router.push({ pathname: '/artist' as any, params: { name: artist } })}
          >
            <Image source={{ uri: coverUrl }} style={s.artistAvatar} />
            <Text style={s.artistName}>{artist}</Text>
          </Pressable>
          <View style={s.badgesRow}>
            <Text style={s.yearText}>2010</Text>
            <View style={s.qualityBadge}>
              <Text style={s.qualityText}>HIGH</Text>
            </View>
          </View>
        </View>

        {/* Big Action Buttons (Play / Shuffle) */}
        <View style={s.bigButtonsRow}>
          <Pressable style={s.playBtn} onPress={handlePlayAlbum}>
            <Icon name="play" size={20} color="#000000" />
            <Text style={s.playBtnText}>Play</Text>
          </Pressable>
          <Pressable style={s.shuffleBtn} onPress={handleShuffleAlbum}>
            <Icon name="shuffle" size={20} color="#ffffff" />
            <Text style={s.shuffleBtnText}>Shuffle</Text>
          </Pressable>
        </View>

        {/* Secondary Actions (Add, Share, More) */}
        <View style={s.actionsRow}>
          <Pressable style={s.actionItem} onPress={() => setIsSaved(!isSaved)}>
            <Icon name={isSaved ? 'heart' : 'heart-outline'} size={24} color="#ffffff" />
            <Text style={s.actionLabel}>{isSaved ? 'Added' : 'Add'}</Text>
          </Pressable>
          <Pressable style={s.actionItem} onPress={handleShare}>
            <Icon name="share-outline" size={24} color="#ffffff" />
            <Text style={s.actionLabel}>Share</Text>
          </Pressable>
          <Pressable
            style={s.actionItem}
            onPress={() => Alert.alert('More Options', `Options for album "${title}"`)}
          >
            <Icon name="ellipsis-horizontal" size={24} color="#ffffff" />
            <Text style={s.actionLabel}>More</Text>
          </Pressable>
        </View>

        {/* Track List */}
        <View style={s.trackList}>
          {SAMPLE_TRACKS.map((t) => {
            const trackObj: Track = {
              id: t.id,
              title: t.title,
              artist: t.artist,
              album: title,
              durationMs: t.durationMs,
              coverUrl,
            };
            return (
              <Pressable
                key={t.id}
                style={s.trackItem}
                onPress={() => audioService.playTrack(trackObj)}
              >
                <Text style={s.trackNum}>{t.num}</Text>
                <View style={s.trackTextCol}>
                  <Text numberOfLines={1} style={s.trackTitle}>{t.title}</Text>
                  <Text numberOfLines={1} style={s.trackArtist}>{t.artist}</Text>
                </View>
                <Pressable
                  style={s.moreBtn}
                  onPress={() => setOptionsTrack(trackObj)}
                  hitSlop={8}
                >
                  <Icon name="ellipsis-horizontal" size={18} color="#8e8e93" />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <MiniPlayer />

      {/* Options Menu Modal */}
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
    backgroundColor: '#000000',
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
    backgroundColor: '#1c1c1e',
  },
  metaCenter: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  albumTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
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
    color: '#ffffff',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearText: {
    fontSize: 13,
    color: '#8e8e93',
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
    color: '#00e5bf',
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
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  shuffleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shuffleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
    color: '#ffffff',
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
    color: '#8e8e93',
    width: 20,
    textAlign: 'center',
  },
  trackTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  trackArtist: {
    fontSize: 13,
    color: '#8e8e93',
  },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
