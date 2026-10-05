import React from 'react';
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

/**
 * Luma Primitives — faithfully built to match the Luma Design System showcase:
 * https://design-system-rho-dusky.vercel.app/
 */

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
 * Standard Luma Button:
 * - Primary: Solid Silver fill (#B8B8C0), Ink (#141416) text & icon
 * - Secondary / Outline: 1px Silver outline, Silver text
 * - Ghost: No border/background, Silver text, surface-1 pressed
 * - Destructive: Trash icon, 1px Silver outline
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
 * Circular Play / Transport Button with signature Luma Glow
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
 * Filter Chip from showcase:
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
 * Audio Quality Badge from showcase:
 * e.g. "FLAC 24/96", "Hi-Res Lossless 192k", "Dolby Atmos"
 */
export function QualityBadge({
  quality,
  format,
  active = false,
  onPress,
  style,
}: {
  quality?: string;
  format?: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const displayQuality = format ?? quality ?? 'FLAC 24/96';
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.qualityBadge,
        active && s.qualityBadgeActive,
        style,
      ]}
      accessibilityLabel={`Audio quality ${displayQuality}`}
    >
      <Text style={s.qualityText}>{displayQuality}</Text>
    </Pressable>
  );
}

/**
 * Offline Mode Pill toggle from showcase:
 * - On: Solid Silver fill, Ink text ("Offline · On")
 * - Off: 1px Silver outline, Silver text ("Offline · Off")
 */
export function OfflinePill({
  isOffline,
  onToggle,
  style,
}: {
  isOffline: boolean;
  onToggle?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        s.offlinePill,
        isOffline ? s.offlinePillOn : s.offlinePillOff,
        pressed && s.pressed,
        style,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOffline }}
      accessibilityLabel={`Offline mode ${isOffline ? 'on' : 'off'}`}
      hitSlop={6}
    >
      <Icon
        name="cloud-off"
        size={16}
        color={isOffline ? colors.onPrimary : colors.onSurface}
      />
      <Text
        style={[
          s.offlinePillText,
          { color: isOffline ? colors.onPrimary : colors.onSurface },
        ]}
      >
        {isOffline ? 'Offline · On' : 'Offline · Off'}
      </Text>
    </Pressable>
  );
}

/**
 * Segmented Control container from showcase
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
            >
              {seg.label}
              {seg.count !== undefined ? `  ${seg.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Storage Bar from showcase
 */
export function StorageBar({
  usedGb,
  totalGb,
  isLow = false,
  onManage,
}: {
  usedGb: number;
  totalGb: number;
  isLow?: boolean;
  onManage?: () => void;
}) {
  const freeGb = Math.max(0, totalGb - usedGb);
  const ratio = totalGb > 0 ? Math.min(1, usedGb / totalGb) : 0;

  return (
    <View style={s.storageCard}>
      <View style={s.storageHeader}>
        <View style={s.storageTitleRow}>
          {isLow && <Icon name="warning" size={16} color={colors.onSurface} />}
          <Text style={s.storageUsedText}>
            {`${usedGb.toFixed(1)} GB of ${totalGb.toFixed(0)} GB used`}
          </Text>
        </View>
        <Text style={s.storageFreeText}>{`${freeGb.toFixed(1)} GB free`}</Text>
      </View>
      <View style={s.storageTrack}>
        <View style={[s.storageFill, { width: `${ratio * 100}%` }]} />
      </View>
      {isLow && (
        <Text style={s.storageWarningText}>
          Storage almost full. Remove downloads to keep saving music offline.
        </Text>
      )}
    </View>
  );
}

/**
 * Feedback Banner from showcase (Offline, Error, Low Storage, Success)
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
  type?: 'offline' | 'error' | 'success' | 'lowStorage';
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const iconName =
    type === 'offline'
      ? 'cloud-off'
      : type === 'error'
      ? 'warning'
      : type === 'lowStorage'
      ? 'storage'
      : 'check';

  return (
    <View style={[s.banner, style]} accessibilityRole="alert">
      <Icon name={iconName} size={20} color={colors.onSurface} />
      <View style={s.bannerContent}>
        <Text style={s.bannerTitle}>{title}</Text>
        <Text style={s.bannerBody}>{body}</Text>
      </View>
      {!!actionLabel && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [s.bannerAction, pressed && s.pressed]}
          hitSlop={6}
        >
          <Text style={s.bannerActionText}>{actionLabel}</Text>
        </Pressable>
      )}
      {!!onDismiss && (
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [pressed && s.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notice"
        >
          <Icon name="close" size={16} color={colors.outlineText} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * Empty State component from showcase:
 * Surface-2 disc (64px) with centered icon, headline, single explanatory sentence, single button.
 */
export function EmptyState({
  icon,
  code,
  title,
  body,
  actionLabel,
  onAction,
  style,
}: {
  icon?: string;
  code?: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const iconName =
    icon ??
    (code === 'EMPTY_01'
      ? 'playlist'
      : code === 'EMPTY_02'
      ? 'queue'
      : code === 'EMPTY_03'
      ? 'lyrics'
      : code === 'EMPTY_04'
      ? 'download'
      : 'disc');

  return (
    <View style={[s.emptyContainer, style]}>
      <View style={s.emptyDisc}>
        <Icon name={iconName} size={32} color={colors.onSurface} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {!!actionLabel && (
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

/**
 * Signal Path diagram from showcase (Source -> Decoder -> EQ -> Output)
 */
export function SignalPathDiagram({
  activeNode = 'Output',
}: {
  activeNode?: 'Source' | 'Decoder' | 'EQ' | 'Output';
}) {
  const nodes = ['Source', 'Decoder', 'EQ', 'Output'] as const;

  return (
    <View style={s.signalPathContainer}>
      <Text style={s.signalPathLabel}>SIGNAL PATH</Text>
      <View style={s.signalPathRow}>
        {nodes.map((node, i) => {
          const isActive = node === activeNode;
          return (
            <React.Fragment key={node}>
              <View
                style={[
                  s.signalNode,
                  isActive ? s.signalNodeActive : s.signalNodeInactive,
                ]}
              >
                <Text
                  style={[
                    s.signalNodeText,
                    { color: isActive ? colors.onAccent : colors.onSurfaceVariant },
                  ]}
                >
                  {node}
                </Text>
              </View>
              {i < nodes.length - 1 && <View style={s.signalSegment} />}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={s.signalPathDescription}>
        FLAC 24/96 → native decoder → EQ bypassed → Direct Output to USB DAC.
      </Text>
    </View>
  );
}

/**
 * Pill button (backward compatible).
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
        <Icon name={icon} size={14} color={selected ? colors.onPrimary : colors.onSurfaceVariant} />
      )}
      <Text style={[s.pillLabel, selected && s.pillLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Circular icon button, 36px/48px in the spec. */
export function CircleButton({
  icon,
  onPress,
  size = 36,
  iconSize = 18,
  color = colors.onSurface,
  background = colors.surfaceVariant,
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

/** Hairline rule */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.divider, style]} />;
}

/** Small status dot */
export function Dot({ color = colors.onSurface, size = 6 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** Meter bar */
export function Meter({
  level,
  segments = 5,
  color = colors.onSurface,
  track = colors.surfaceContainerHighest,
  height = 12,
  width = 17,
}: {
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

  qualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: r.full,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceVariant,
  },
  qualityBadgeActive: {
    borderColor: colors.accent,
  },
  qualityText: {
    ...t.monoMicro,
    color: colors.onSurface,
  },

  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: r.full,
  },
  offlinePillOn: {
    backgroundColor: colors.accent,
  },
  offlinePillOff: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  offlinePillText: {
    ...t.captionStrong,
  },

  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: r.full,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.full,
  },
  segmentedItemSelected: {
    backgroundColor: colors.accent,
  },
  segmentedLabel: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  segmentedLabelSelected: {
    ...t.captionStrong,
    color: colors.onPrimary,
  },

  storageCard: {
    padding: 16,
    borderRadius: r.lg,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 10,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storageUsedText: {
    ...t.bodyStrong,
    color: colors.onSurface,
  },
  storageFreeText: {
    ...t.monoCaption,
    color: colors.onSurfaceVariant,
  },
  storageTrack: {
    height: 8,
    borderRadius: r.full,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: r.full,
  },
  storageWarningText: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: r.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
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

  signalPathContainer: {
    padding: 16,
    gap: 10,
    backgroundColor: colors.surface1,
    borderRadius: r.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  signalPathLabel: {
    ...t.label,
    color: colors.onSurfaceVariant,
  },
  signalPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signalNode: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: r.full,
  },
  signalNodeActive: {
    backgroundColor: colors.accent,
  },
  signalNodeInactive: {
    borderWidth: 1.5,
    borderColor: colors.onSurfaceVariant,
  },
  signalNodeText: {
    ...t.monoMicro,
  },
  signalSegment: {
    flex: 1,
    height: 2,
    backgroundColor: colors.onSurfaceVariant,
  },
  signalPathDescription: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: r.full,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillLabel: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  pillLabelSelected: {
    ...t.captionStrong,
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

  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },

  meter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  meterBar: {
    borderRadius: r.full,
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