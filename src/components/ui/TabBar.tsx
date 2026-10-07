import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import Icon from './Icon';
import { resolveTabBarInset, TAB_BAR_HEIGHT } from '../../hooks/useResponsive';
import { colors, t } from '../../theme/theme';

/**
 * Bottom navigation faithfully matching Coda Design System showcase:
 * Surface-1 on Ink background with 1px hairline divider top border,
 * active dot indicator, and bespoke monoline icons.
 */

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/search', label: 'Explore', icon: 'explore' },
  { href: '/library', label: 'Collection', icon: 'collection' },
  { href: '/settings', label: 'Settings', icon: 'sliders' },
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
              name={tab.icon}
              size={22}
              color={focused ? colors.accent : colors.textTertiary}
            />
            <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            <View style={[s.dot, focused && s.dotActive]} />
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
    backgroundColor: colors.surfaceDeep,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 46,
  },
  label: {
    ...t.caption,
    fontSize: 11,
    color: colors.textTertiary,
  },
  labelActive: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 1,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
});