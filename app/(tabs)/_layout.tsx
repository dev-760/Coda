import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import Icon from '../../src/components/ui/Icon';
import MiniPlayer from '../../src/components/ui/MiniPlayer';

function TabIconWrapper({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return (
    <View style={[s.iconWrapper, focused && s.iconWrapperActive]}>
      {children}
    </View>
  );
}

function CollectionIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#ffffff' : '#8e8e93';
  return (
    <TabIconWrapper focused={focused}>
      <View style={s.collectionBars}>
        <View style={[s.bar, { backgroundColor: color }]} />
        <View style={[s.bar, { backgroundColor: color }]} />
        <View style={[s.bar, { backgroundColor: color }]} />
      </View>
    </TabIconWrapper>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#8e8e93',
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopColor: '#1c1c1e',
            borderTopWidth: StyleSheet.hairlineWidth,
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIconWrapper focused={focused}>
                <Icon name="musical-note" size={22} color={focused ? '#ffffff' : '#8e8e93'} />
              </TabIconWrapper>
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ focused }) => (
              <TabIconWrapper focused={focused}>
                <Icon name="notifications-outline" size={22} color={focused ? '#ffffff' : '#8e8e93'} />
              </TabIconWrapper>
            ),
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: 'Live',
            tabBarIcon: ({ focused }) => (
              <TabIconWrapper focused={focused}>
                <Icon name="arrow-up" size={22} color={focused ? '#ffffff' : '#8e8e93'} />
              </TabIconWrapper>
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Collection',
            tabBarIcon: ({ focused }) => <CollectionIcon focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Explore',
            tabBarIcon: ({ focused }) => (
              <TabIconWrapper focused={focused}>
                <Icon name="search" size={22} color={focused ? '#ffffff' : '#8e8e93'} />
              </TabIconWrapper>
            ),
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}

const s = StyleSheet.create({
  iconWrapper: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#303030',
  },
  collectionBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    height: 18,
    justifyContent: 'center',
  },
  bar: {
    width: 2.2,
    height: 16,
    borderRadius: 1,
    transform: [{ rotate: '12deg' }],
  },
});
