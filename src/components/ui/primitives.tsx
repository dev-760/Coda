import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import Icon from './Icon';
import { colors, r, t } from '../../theme/theme';

/**
 * Primitives shared across the eight screens.
 *
 * The spec leans on two shapes: fully rounded pills and 12px-radius cards. Both
 * appear on most screens, so they live here rather than being restated in each
 * screen's stylesheet.
 */

/**
 * Pill button. The spec's selected state inverts to a solid white pill with
 * dark text rather than tinting, so `selected` flips the fill instead.
 */
export function Pill({
  label,
  selected = false,
  onPress,
  icon,
  accessibilityLabel,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.pill, selected && s.pillSelected, pressed && s.pressed, style]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={4}
    >
      {!!icon && (
        <Icon name={icon} size={12} color={selected ? colors.onPrimary : colors.onSurfaceVariant} />
      )}
      <Text style={[s.pillLabel, selected && s.pillLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Circular icon button, 36px in the spec with a circular hit area. */
export function CircleButton({
  icon,
  onPress,
  size = 36,
  iconSize = 18,
  color = colors.onSurfaceVariant,
  background = colors.surfaceContainer,
  accessibilityLabel,
}: {
  icon: string;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        pressed && s.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}

/**
 * Section heading row: an 18px title with an optional uppercase eyebrow and a
 * trailing action, matching the header rows on Home and Explore.
 */
export function SectionHeader({
  title,
  eyebrow,
  actionLabel,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionHeaderText}>
        {!!eyebrow && <Text style={s.sectionEyebrow}>{eyebrow}</Text>}
        <Text style={s.sectionTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {!!actionLabel && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [s.sectionAction, pressed && s.pressed]}
        >
          <Text style={s.sectionActionLabel}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Hairline rule used between grouped rows. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.divider, style]} />;
}

/**
 * Small status dot used by the downloaded and playing indicators, sized in the
 * spec at 6px.
 */
export function Dot({ color = colors.onSurface, size = 6 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/**
 * Meter bar used by the Now Playing acoustic telemetry and the Queue
 * continuity bars. `segments` draws discrete dividers instead of a flat fill.
 */
export function Meter({
  level,
  segments = 5,
  color = colors.onSurface,
  track = colors.surfaceContainerHighest,
  height = 12,
  width = 17,
}: {
  /** 0..1 */
  level: number;
  segments?: number;
  color?: string;
  track?: string;
  height?: number;
  width?: number;
}) {
  const clamped = Math.max(0, Math.min(1, level));
  const active = Math.round(clamped * segments);
  const barWidth = (width - (segments - 1) * 3) / segments;

  return (
    <View style={[s.meter, { height, gap: 3 }]}>
      {Array.from({ length: segments }).map((_, index) => (
        <View
          key={index}
          style={[
            s.meterBar,
            {
              width: barWidth,
              backgroundColor: index < active ? color : track,
              height: height * (0.4 + (0.6 * (index + 1)) / segments),
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Pill-shaped toggle used in Settings and the Queue continuity section. */
export function Toggle({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        s.toggle,
        value && s.toggleOn,
        pressed && s.pressed,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <View style={[s.toggleKnob, value && s.toggleKnobOn]} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 16,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  pillSelected: {
    backgroundColor: colors.onSurface,
  },
  pillLabel: {
    ...t.labelMd,
    color: colors.onSurfaceVariant,
  },
  pillLabelSelected: {
    color: colors.onPrimary,
  },

  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 24,
  },
  sectionHeaderText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    ...t.title,
    color: colors.onSurface,
  },
  sectionEyebrow: {
    ...t.labelSm,
    color: colors.outlineText,
    textTransform: 'uppercase',
  },
  sectionAction: {
    minHeight: 32,
    justifyContent: 'center',
  },
  sectionActionLabel: {
    ...t.labelSm,
    color: colors.outlineText,
    textTransform: 'uppercase',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },

  meter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  meterBar: {
    borderRadius: r.pill,
  },

  toggle: {
    width: 44,
    height: 26,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHigh,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.onSurface,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.onSurfaceVariant,
  },
  toggleKnobOn: {
    backgroundColor: colors.onPrimary,
    alignSelf: 'flex-end',
  },
});