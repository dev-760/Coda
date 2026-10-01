import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderBar from '../../src/components/ui/HeaderBar';
import Icon from '../../src/components/ui/Icon';
import { audioService } from '../../src/audio/AudioService';

const DROPS = [
  {
    id: 'd1',
    title: 'Studio Session Live',
    artist: 'Hindi Zahra',
    views: '12.4K listeners',
    coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
  },
  {
    id: 'd2',
    title: 'Casablanca Nights Radio',
    artist: 'ElGrandeToto',
    views: '45.1K listeners',
    coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
  },
];

export default function LiveScreen() {
  const handlePlay = (item: typeof DROPS[0]) => {
    audioService.playTrack({
      id: item.id,
      title: item.title,
      artist: item.artist,
      durationMs: 300000,
      coverUrl: item.coverUrl,
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <HeaderBar />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Live & Uploads</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Now Live on TIDAL</Text>
          <View style={s.list}>
            {DROPS.map((item) => (
              <Pressable key={item.id} style={s.card} onPress={() => handlePlay(item)}>
                <Image source={{ uri: item.coverUrl }} style={s.art} />
                <View style={s.badge}>
                  <View style={s.liveDot} />
                  <Text style={s.badgeText}>LIVE</Text>
                </View>
                <View style={s.overlay}>
                  <Text style={s.title}>{item.title}</Text>
                  <Text style={s.artist}>{item.artist}</Text>
                  <Text style={s.views}>{item.views}</Text>
                </View>
              </Pressable>
            ))}
          </View>
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
    gap: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  list: {
    gap: 16,
  },
  card: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161616',
  },
  art: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff453a',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  artist: {
    fontSize: 13,
    color: '#00e5bf',
    marginTop: 2,
  },
  views: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 4,
  },
});
