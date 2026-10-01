import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import { Track } from '../src/providers/types';

const TOP_TRACKS = [
  { id: 'att-1', title: 'Beautiful Tango', artist: 'Hindi Zahra', durationMs: 236000, coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg' },
  { id: 'att-2', title: 'Imik Si Mik', artist: 'Hindi Zahra', durationMs: 228000, coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg' },
  { id: 'att-3', title: 'Stand Up', artist: 'Hindi Zahra', durationMs: 250000, coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg' },
  { id: 'att-4', title: 'Any Story', artist: 'Hindi Zahra', durationMs: 195000, coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg' },
];

export default function ArtistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const artistName = (params.name as string) || 'Hindi Zahra';
  const coverUrl = (params.coverUrl as string) || 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg';

  const [isFollowing, setIsFollowing] = useState(false);
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const { playContext } = useQueueStore();

  const handlePlayAll = () => {
    const tracks: Track[] = TOP_TRACKS.map(t => ({
      id: t.id,
      title: t.title,
      artist: artistName,
      durationMs: t.durationMs,
      coverUrl: t.coverUrl,
    }));
    playContext(tracks, 0, { type: 'artist', name: artistName });
    void audioService.playTrack(tracks[0]);
  };

  const handleShuffle = () => {
    handlePlayAll();
    useQueueStore.getState().toggleShuffle();
  };

  const handleArtistRadio = () => {
    audioService.playTrack({
      id: `radio_${artistName}`,
      title: `${artistName} Radio`,
      artist: artistName,
      album: 'Artist Radio',
      durationMs: 240000,
      coverUrl,
    });
    Alert.alert('Artist Radio', `Started radio station for ${artistName}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Listen to ${artistName} on Luma`,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top Header */}
      <HeaderBar showBack />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Full-bleed Artist Hero Image */}
        <View style={s.heroContainer}>
          <Image source={{ uri: coverUrl }} style={s.heroImage} />
          <View style={s.heroGradient} />

          <View style={s.heroMeta}>
            <Text style={s.artistTitle}>{artistName}</Text>
            <Text style={s.fansCount}>8.7K fans</Text>
          </View>
        </View>

        {/* Action Buttons Row (Play / Shuffle) */}
        <View style={s.bigButtonsRow}>
          <Pressable style={s.playBtn} onPress={handlePlayAll}>
            <Icon name="play" size={20} color="#000000" />
            <Text style={s.playBtnText}>Play</Text>
          </Pressable>
          <Pressable style={s.shuffleBtn} onPress={handleShuffle}>
            <Icon name="shuffle" size={20} color="#ffffff" />
            <Text style={s.shuffleBtnText}>Shuffle</Text>
          </Pressable>
        </View>

        {/* 4 Actions Row (Follow, Artist Radio, Share, More) */}
        <View style={s.actionsRow}>
          <Pressable style={s.actionItem} onPress={() => setIsFollowing(!isFollowing)}>
            <Icon name={isFollowing ? 'checkmark' : 'add'} size={22} color="#ffffff" />
            <Text style={s.actionLabel}>{isFollowing ? 'Following' : 'Follow'}</Text>
          </Pressable>
          <Pressable style={s.actionItem} onPress={handleArtistRadio}>
            <Icon name="radio-outline" size={22} color="#ffffff" />
            <Text style={s.actionLabel}>Artist radio</Text>
          </Pressable>
          <Pressable style={s.actionItem} onPress={handleShare}>
            <Icon name="share-outline" size={22} color="#ffffff" />
            <Text style={s.actionLabel}>Share</Text>
          </Pressable>
          <Pressable
            style={s.actionItem}
            onPress={() => Alert.alert('More Options', `Options for artist ${artistName}`)}
          >
            <Icon name="ellipsis-horizontal" size={22} color="#ffffff" />
            <Text style={s.actionLabel}>More</Text>
          </Pressable>
        </View>

        {/* Section: Top Tracks */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Top Tracks</Text>
            <Pressable>
              <Text style={s.viewAllText}>View all</Text>
            </Pressable>
          </View>

          <View style={s.trackList}>
            {TOP_TRACKS.map((t) => {
              const trackObj: Track = {
                id: t.id,
                title: t.title,
                artist: artistName,
                durationMs: t.durationMs,
                coverUrl: t.coverUrl,
              };
              return (
                <Pressable
                  key={t.id}
                  style={s.trackRow}
                  onPress={() => audioService.playTrack(trackObj)}
                >
                  <Image source={{ uri: t.coverUrl }} style={s.trackArt} />
                  <View style={s.trackMeta}>
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
  content: {
    paddingBottom: 130,
    gap: 18,
  },
  heroContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    justifyContent: 'flex-end',
    backgroundColor: '#161616',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroMeta: {
    padding: 20,
    gap: 4,
  },
  artistTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  fansCount: {
    fontSize: 14,
    color: '#b3b3b3',
    fontWeight: '500',
  },
  bigButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  section: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  trackList: {
    gap: 10,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  trackArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#1c1c1e',
  },
  trackMeta: {
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
