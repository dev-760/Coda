import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import MiniPlayer from '../../src/components/ui/MiniPlayer';
import TabBar from '../../src/components/ui/TabBar';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={() => <TabBar />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="library" options={{ title: 'Collection' }} />
        <Tabs.Screen name="search" options={{ title: 'Explore' }} />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
