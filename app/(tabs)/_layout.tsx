import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import MiniPlayer from '../../src/components/ui/MiniPlayer';
import TabBar from '../../src/components/ui/TabBar';
import { resolveTabBarInset, TAB_BAR_HEIGHT } from '../../src/hooks/useResponsive';
import { colors } from '../../src/theme/theme';

function DockedMiniPlayer() {
  const insets = useSafeAreaInsets();
  const bottomInset = resolveTabBarInset(insets.bottom, Platform.OS);

  return (
    <View style={[styles.dock, { bottom: TAB_BAR_HEIGHT + bottomInset }]} pointerEvents="box-none">
      <MiniPlayer />
    </View>
  );
}

export default function TabLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={() => <TabBar />}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="library" options={{ title: 'Collection' }} />
        <Tabs.Screen name="search" options={{ title: 'Explore' }} />
      </Tabs>
      <DockedMiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /**
   * The tab bar is rendered inside the navigator, above the scene content, so
   * the mini player has to be overlaid and offset by the bar's full height.
   * As a plain flex sibling it would be laid out below the bar, hidden behind
   * the device navigation area.
   */
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
