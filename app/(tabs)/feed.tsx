import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderBar from '../../src/components/ui/HeaderBar';
import Icon from '../../src/components/ui/Icon';
import { audioService } from '../../src/audio/AudioService';
import { Track } from '../../src/providers/types';

const NOTIFICATIONS = [
  {
    id: 'n1',
    artist: 'ElGrandeToto',
    title: 'SALGOAT (Vol. 2)',
    type: 'Album',
    time: '2h ago',
    coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
  },
  {
    id: 'n2',
    artist: 'Hindi Zahra',
    title: 'New live performance added',
    type: 'Video',
    time: 'Yesterday',
    coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
  },
  {
    id: 'n3',
    artist: 'Aziza Galal',
    title: 'Mestaneyak (Remastered)',
    type: 'Single',
    time: '3 days ago',
    coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
  },
];

export default function FeedScreen() {
  const handlePlay = (item: typeof NOTIFICATIONS[0]) => {
    const track: Track = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      durationMs: 210000,
      coverUrl: item.coverUrl,
    };
    audioService.playTrack(track);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <HeaderBar />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Activity</Text>

        <View style={s.list}>
          {NOTIFICATIONS.map((item) => (
            <Pressable key={item.id} style={s.card} onPress={() => handlePlay(item)}>
              <Image source={{ uri: item.coverUrl }} style={s.art} />
              <View style={s.info}>
                <View style={s.typeRow}>
                  <Text style={s.type}>{item.type}</Text>
                  <Text style={s.dot}>•</Text>
                  <Text style={s.time}>{item.time}</Text>
                </View>
                <Text numberOfLines={1} style={s.title}>{item.title}</Text>
                <Text numberOfLines={1} style={s.artist}>{item.artist}</Text>
              </View>
              <View style={s.playBtn}>
                <Icon name="play" size={16} color="#ffffff" />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#262626',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  type: {
    fontSize: 11,
    color: '#00e5bf',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dot: {
    fontSize: 10,
    color: '#8e8e93',
  },
  time: {
    fontSize: 11,
    color: '#8e8e93',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  artist: {
    fontSize: 12,
    color: '#8e8e93',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
