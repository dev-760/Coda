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
              <Text
                style={[s.label, focused && s.labelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
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
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceDeep,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    gap: 3,
    padding: 3,
    borderRadius: r.full,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  segment: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.full,
    paddingHorizontal: 4,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    ...t.label,
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.onPrimary,
  },
});