import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import Icon from './Icon';
import { resolveTabBarInset, TAB_BAR_HEIGHT } from '../../hooks/useResponsive';
import { colors, t } from '../../theme/theme';

/**
 * Bottom navigation.
 *
 * Four equal tabs, each an icon with its label beneath it. Settings is a tab
 * here rather than a header affordance, so it is reachable from every screen
 * without each one repeating it.
 */

const INACTIVE = colors.outlineText;
const ACTIVE = colors.onSurface;

interface TabItem {
  href: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const TABS: TabItem[] = [
  { href: '/', label: 'Home', icon: 'grid-outline', activeIcon: 'grid' },
  { href: '/search', label: 'Explore', icon: 'compass-outline', activeIcon: 'compass' },
  { href: '/library', label: 'Collection', icon: 'albums-outline', activeIcon: 'albums' },
  { href: '/settings', label: 'Settings', icon: 'options-outline', activeIcon: 'options' },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomInset = resolveTabBarInset(insets.bottom, Platform.OS);

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
            <Icon
              name={focused ? tab.activeIcon : tab.icon}
              size={22}
              color={focused ? ACTIVE : INACTIVE}
            />
            <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderTopColor: colors.surfaceContainer,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
  },
  label: {
    ...t.micro,
    color: INACTIVE,
  },
  labelActive: {
    color: ACTIVE,
  },
});