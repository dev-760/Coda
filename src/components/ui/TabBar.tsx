import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import Icon from './Icon';

/**
 * Bottom navigation with a Settings action.
 *
 * Settings is a modal route outside the tab navigator, so it appears here as a
 * button rather than a tab. That keeps it reachable from every screen without
 * a per-screen header affordance.
 */

const TAB_BAR_HEIGHT = 64;

const INACTIVE = '#8e8e93';
const ACTIVE = '#ffffff';

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { href: '/', label: 'Home', icon: 'musical-note' },
  { href: '/library', label: 'Collection', icon: 'albums-outline' },
  { href: '/search', label: 'Explore', icon: 'search' },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 8);

  return (
    <View style={[s.container, { height: TAB_BAR_HEIGHT + bottomInset, paddingBottom: bottomInset }]}>
      {TABS.map((tab) => {
        const focused = isActivePath(pathname, tab.href);
        return (
          <Pressable
            key={tab.href}
            style={s.tab}
            onPress={() => router.push(tab.href as any)}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
          >
            <View style={[s.iconWrapper, focused && s.iconWrapperActive]}>
              <Icon name={tab.icon} size={22} color={focused ? ACTIVE : INACTIVE} />
            </View>
          </Pressable>
        );
      })}

      <Pressable
        style={s.tab}
        onPress={() => router.push('/settings' as any)}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <View style={s.iconWrapper}>
          <Icon name="settings-outline" size={22} color={INACTIVE} />
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderTopColor: '#1c1c1e',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
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
});
