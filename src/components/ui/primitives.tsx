import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import Icon from './Icon';
import { colors, r, t } from '../../theme/theme';

export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/**
 * Standard Coda Button
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  onPress,
  disabled = false,
  fullWidth = false,
  style,
  labelStyle,
  accessibilityLabel,
}: ButtonProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'secondary' || variant === 'outline' || variant === 'destructive';
  const isGhost = variant === 'ghost';

  const fgColor = disabled
    ? colors.disabled
    : isPrimary
    ? colors.onPrimary
    : colors.onSurface;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        isSm ? s.btnSm : isLg ? s.btnLg : s.btnMd,
        fullWidth && { width: '100%' },
        isPrimary && s.btnPrimary,
        isOutline && s.btnOutline,
        isGhost && s.btnGhost,
        disabled && s.btnDisabled,
        pressed && !disabled && s.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
    >
      {!!icon && (
        <Icon
          name={icon}
          size={isSm ? 14 : isLg ? 20 : 16}
          color={fgColor}
        />
      )}
      <Text
        style={[
          isSm ? t.caption : isLg ? t.headline : t.bodyStrong,
          { color: fgColor },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Circular Play / Transport Button with signature Coda Glow
 */
export function PlayButton({
  isPlaying,
  onPress,
  size = 48,
  disabled = false,
  showGlow,
  style,
}: {
  isPlaying: boolean;
  onPress: () => void;
  size?: 36 | 48 | 64 | 72;
  disabled?: boolean;
  showGlow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const iconSize = size >= 64 ? 32 : size >= 48 ? 24 : 18;
  const glowing = showGlow ?? isPlaying;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.playBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? colors.disabled : colors.accent,
        },
        !disabled && glowing && s.glow,
        pressed && !disabled && s.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      hitSlop={8}
    >
      <Icon
        name={isPlaying ? 'pause' : 'play'}
        size={iconSize}
        color={colors.onAccent}
      />
    </Pressable>
  );
}

/**
 * Filter Chip:
 * 8px radius, surface-2 background, 1px divider border.
 * When active: solid Silver background, Ink text, check icon.
 */
export function Chip({
  label,
  selected = false,
  count,
  onPress,
  accessibilityLabel,
  style,
}: {
  label: string;
  selected?: boolean;
  count?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        selected ? s.chipSelected : s.chipUnselected,
        pressed && s.pressed,
        style,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={4}
    >
      {selected && (
        <Icon name="check" size={14} color={colors.onPrimary} />
      )}
      <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>
        {label}
      </Text>
      {count !== undefined && (
        <Text style={[s.chipCount, selected && s.chipCountSelected]}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Segmented Control container
 */
export function SegmentedControl<T extends string>({
  segments,
  selected,
  onSelect,
  style,
}: {
  segments: { key: T; label: string; count?: number }[];
  selected: T;
  onSelect: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.segmentedContainer, style]}>
      {segments.map((seg) => {
        const isSelected = selected === seg.key;
        return (
          <Pressable
            key={seg.key}
            onPress={() => onSelect(seg.key)}
            style={({ pressed }) => [
              s.segmentedItem,
              isSelected && s.segmentedItemSelected,
              pressed && s.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                s.segmentedLabel,
                isSelected && s.segmentedLabelSelected,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {seg.label}
              {seg.count !== undefined ? ` ${seg.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Feedback Banner (Offline, Error, Low Storage, Success)
 */
export function Banner({
  type = 'offline',
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
  style,
}: {
  type?: 'offline' | 'error' | 'warning' | 'success';
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const iconName =
    type === 'offline'
      ? 'cloud-off'
      : type === 'error'
      ? 'alert-circle'
      : type === 'warning'
      ? 'warning'
      : 'check-circle';

  return (
    <View style={[s.banner, style]}>
      <Icon name={iconName} size={20} color={colors.onSurface} />
      <View style={s.bannerContent}>
        <Text style={s.bannerTitle}>{title}</Text>
        {!!body && <Text style={s.bannerBody}>{body}</Text>}
      </View>
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [s.bannerAction, pressed && s.pressed]}
        >
          <Text style={s.bannerActionText}>{actionLabel}</Text>
        </Pressable>
      )}
      {!!onDismiss && (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss banner"
          style={({ pressed }) => [s.bannerAction, pressed && s.pressed]}
        >
          <Icon name="close" size={16} color={colors.onSurfaceVariant} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * Empty State view with icon, title, description and optional action button
 */
export function EmptyState({
  icon = 'music',
  code,
  title,
  body,
  description,
  actionLabel,
  onAction,
  style,
}: {
  icon?: string;
  code?: string;
  title: string;
  body?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const displayIcon = icon ?? code ?? 'music';
  const displayDesc = body ?? description;

  return (
    <View style={[s.emptyContainer, style]}>
      <View style={s.emptyDisc}>
        <Icon name={displayIcon} size={28} color={colors.onSurfaceVariant} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {!!displayDesc && <Text style={s.emptyBody}>{displayDesc}</Text>}
      {!!actionLabel && !!onAction && (
        <Button
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
          style={s.emptyButton}
        />
      )}
    </View>
  );
}

/** Section heading row */
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

/**
 * Showcase Toggle switch:
 * 52w x 32h, 24px circular knob.
 */
export function Toggle({
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={({ pressed }) => [
        s.toggle,
        value ? s.toggleOn : s.toggleOff,
        disabled && s.toggleDisabled,
        pressed && !disabled && s.pressed,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <View
        style={[
          s.toggleKnob,
          value ? s.toggleKnobOn : s.toggleKnobOff,
          disabled && s.toggleKnobDisabled,
        ]}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.full,
    gap: 8,
  },
  btnSm: {
    height: 32,
    paddingHorizontal: 12,
    gap: 6,
  },
  btnMd: {
    height: 44,
    paddingHorizontal: 20,
  },
  btnLg: {
    height: 52,
    paddingHorizontal: 28,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDisabled: {
    backgroundColor: colors.surfaceVariant,
    opacity: 0.5,
  },

  playBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  chipUnselected: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  chipLabel: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  chipLabelSelected: {
    ...t.captionStrong,
    color: colors.onPrimary,
  },
  chipCount: {
    ...t.monoMicro,
    color: colors.outlineText,
  },
  chipCountSelected: {
    color: colors.onPrimary,
  },

  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: r.full,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.full,
  },
  segmentedItemSelected: {
    backgroundColor: colors.accent,
  },
  segmentedLabel: {
    ...t.caption,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  segmentedLabelSelected: {
    ...t.captionStrong,
    fontSize: 11,
    color: colors.onPrimary,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: r.lg,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  bannerContent: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    ...t.captionStrong,
    color: colors.onSurface,
  },
  bannerBody: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  bannerAction: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  bannerActionText: {
    ...t.captionStrong,
    color: colors.onSurface,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyDisc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...t.headline,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptyBody: {
    ...t.body,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 28,
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
    ...t.label,
    color: colors.outlineText,
  },
  sectionAction: {
    minHeight: 32,
    justifyContent: 'center',
  },
  sectionActionLabel: {
    ...t.label,
    color: colors.outlineText,
  },

  toggle: {
    width: 48,
    height: 28,
    borderRadius: r.full,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOff: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  toggleOn: {
    backgroundColor: colors.accent,
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  toggleKnobOff: {
    backgroundColor: colors.onSurfaceVariant,
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    backgroundColor: colors.onAccent,
    alignSelf: 'flex-end',
  },
  toggleKnobDisabled: {
    backgroundColor: colors.disabled,
  },
});