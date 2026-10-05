import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, r, t } from '../../theme/theme';

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
    backgroundColor: colors.background,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 3,
    borderRadius: r.full,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  segment: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.full,
    paddingHorizontal: 16,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...t.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.onPrimary,
  },
});