import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, r, t } from '../../theme/theme';

/**
 * The segmented control shared by Now Playing, Lyrics and Queue.
 *
 * The mockups put these three on one surface with a single control switching
 * between them, so it navigates between routes rather than hiding tabs inside
 * one screen. The active segment inverts to a white pill.
 */

export type PlayerTab = 'now-playing' | 'lyrics' | 'queue';

const TABS: { key: PlayerTab; label: string }[] = [
  { key: 'now-playing', label: 'NOW PLAYING' },
  { key: 'lyrics', label: 'LYRICS' },
  { key: 'queue', label: 'QUEUE' },
];

export default function PlayerTabBar({
  active,
  onSelect,
}: {
  active: PlayerTab;
  onSelect: (tab: PlayerTab) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={s.track} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const focused = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              style={({ pressed }) => [
                s.segment,
                focused && s.segmentActive,
                pressed && !focused && s.pressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
            >
              <Text style={[s.label, focused && s.labelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.surfaceDeep,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 4,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  segment: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.pill,
    paddingHorizontal: 16,
  },
  segmentActive: {
    backgroundColor: colors.onSurface,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...t.labelMd,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.onPrimary,
  },
});