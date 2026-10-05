// theme.ts — Luma design tokens.
//
// Generated from the official Luma Design System showcase:
// https://design-system-rho-dusky.vercel.app/
//
// Monochrome Ink and Silver system for a lyrics-first music player:
// Ink (#141416) canvas with Silver (#B8B8C0) opacity ladder.

export const INK = '#141416';
export const SILVER = '#B8B8C0';

/** Official showcase color tokens */
export const lumaTokens = {
  ink: INK,
  silver: SILVER,
  bg: INK,
  surface1: 'rgba(184, 184, 192, 0.05)', // Cards, rows, tab bar
  surface2: 'rgba(184, 184, 192, 0.09)', // Sheets, chips, inputs
  divider: 'rgba(184, 184, 192, 0.14)',  // 1px lines, tile borders, progress track
  textPrimary: SILVER,                   // Titles, body, active lyric (~9.3:1)
  textSecondary: 'rgba(184, 184, 192, 0.80)', // Captions, artist names (~6.4:1)
  textTertiary: 'rgba(184, 184, 192, 0.65)',  // Metadata, never below 12pt (~4.6:1)
  textPast: 'rgba(184, 184, 192, 0.45)',      // Past lyric lines only
  disabled: 'rgba(184, 184, 192, 0.35)',      // Disabled controls
  glow: 'rgba(184, 184, 192, 0.20)',          // Color of active glow effect
  accent: SILVER,                             // Playing item, progress, primary actions
  onAccent: INK,                              // Text and icons on Silver fills
  error: '#FFB4AB',
  errorContainer: '#DC2626',
  success: '#3DA35D',
} as const;

export const colors = {
  // Canvas
  background: lumaTokens.bg,
  surface: lumaTokens.bg,
  surfaceDeep: INK,
  surfaceContainerLowest: INK,
  surfaceContainerLow: lumaTokens.surface1,
  surfaceContainer: lumaTokens.surface1,
  surfaceContainerHigh: lumaTokens.surface2,
  surfaceContainerHighest: lumaTokens.surface2,
  surfaceVariant: lumaTokens.surface2,
  surfaceSubtle: lumaTokens.surface1,
  surfaceBright: lumaTokens.surface2,

  // Direct token names matching showcase
  surface1: lumaTokens.surface1,
  surface2: lumaTokens.surface2,
  divider: lumaTokens.divider,
  glow: lumaTokens.glow,
  textPast: lumaTokens.textPast,

  /** Silver 100% — Track titles, body and active lyric. */
  onSurface: lumaTokens.textPrimary,
  textPrimary: lumaTokens.textPrimary,

  /** Silver 80% — Supporting copy, artist names and captions. */
  onSurfaceVariant: lumaTokens.textSecondary,
  textSecondary: lumaTokens.textSecondary,

  /** Silver 65% — De-emphasised labels, counters and timestamps. */
  outlineText: lumaTokens.textTertiary,
  textTertiary: lumaTokens.textTertiary,

  // Line work (14% Silver)
  outline: lumaTokens.divider,
  outlineVariant: lumaTokens.divider,

  // Text tints
  textSoft: lumaTokens.textPrimary,
  textMuted: lumaTokens.textSecondary,
  disabled: lumaTokens.disabled,

  // Primary chrome. Inverts rather than tints: solid Silver fill with Ink text
  primary: lumaTokens.accent,
  onPrimary: lumaTokens.onAccent,
  primaryContainer: lumaTokens.surface2,
  onPrimaryContainer: lumaTokens.textPrimary,

  secondary: lumaTokens.textSecondary,
  onSecondary: lumaTokens.onAccent,
  secondaryContainer: lumaTokens.surface2,
  onSecondaryContainer: lumaTokens.textPrimary,

  tertiary: lumaTokens.textTertiary,
  onTertiary: lumaTokens.onAccent,
  tertiaryContainer: lumaTokens.surface1,
  onTertiaryContainer: lumaTokens.textSecondary,

  // Feedback
  error: lumaTokens.error,
  onError: lumaTokens.onAccent,
  errorContainer: lumaTokens.errorContainer,
  onErrorContainer: '#FFE9E7',

  success: lumaTokens.success,
  onSuccess: '#04180C',

  inverseSurface: lumaTokens.accent,
  inverseOnSurface: lumaTokens.onAccent,
  inversePrimary: lumaTokens.surface2,

  surfaceDim: INK,

  /** Active playback accent is solid Silver. */
  accent: lumaTokens.accent,
  onAccent: lumaTokens.onAccent,
  ink: INK,
  silver: SILVER,
} as const;

export const sp = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 } as const;
export const SPACING_SCALE = [4, 8, 12, 16, 20, 24, 32, 40, 48] as const;

export const r = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  sheet: 20,
  pill: 9999,
  full: 999,
} as const;

export const RADIUS_TOKENS = {
  chip: 8,
  card: 12,
  sheet: 20,
  full: 999,
} as const;

export const FONTS = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semiBold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',

  content: 'Inter_400Regular',
  contentMedium: 'Inter_500Medium',
  contentSemiBold: 'Inter_600SemiBold',
  contentBold: 'Inter_700Bold',

  display: 'Geist_600SemiBold',
  displayMedium: 'Geist_500Medium',
  displayBold: 'Geist_700Bold',
  displayRegular: 'Geist_400Regular',
  mono: 'Geist_400Regular',
  monoBold: 'Geist_600SemiBold',
} as const;

/**
 * Type scale directly from the Luma showcase:
 * - display: 32/36, tracking -1, semibold
 * - title: 22/28, tracking -0.5, semibold
 * - headline: 17/24, tracking 0, semibold
 * - body: 15/22, tracking 0, regular
 * - bodyStrong: 15/22, tracking 0, semibold
 * - caption: 13/18, tracking 0, regular
 * - captionStrong: 13/18, tracking 0, semibold
 * - micro: 12/16, tracking 0, medium
 * - label: 12/16, tracking 0.08em uppercase, semibold
 * - monoBody: 15/22
 * - monoCaption: 13/18
 * - monoMicro: 12/16
 */
export const t = {
  /** 32px / 36px. Showcase type/display. */
  display:       { fontFamily: FONTS.semiBold, fontSize: 32, lineHeight: 36, fontWeight: '600' as const, letterSpacing: -1 },
  /** 26px / 32px. Hero title. */
  hero:          { fontFamily: FONTS.semiBold, fontSize: 26, lineHeight: 32, fontWeight: '600' as const, letterSpacing: -0.5 },
  /** 22px / 28px. Showcase type/title. */
  title:         { fontFamily: FONTS.semiBold, fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.5 },
  /** 18px / 24px. Section headings. */
  titleMd:       { fontFamily: FONTS.medium, fontSize: 18, lineHeight: 24, fontWeight: '500' as const, letterSpacing: -0.45 },
  /** 17px / 24px. Showcase type/headline. */
  headline:      { fontFamily: FONTS.semiBold, fontSize: 17, lineHeight: 24, fontWeight: '600' as const, letterSpacing: 0 },
  /** 15px / 22px. Showcase type/body-strong. */
  bodyStrong:    { fontFamily: FONTS.semiBold, fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  bodyLg:        { fontFamily: FONTS.contentSemiBold, fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  /** 15px / 22px. Showcase type/body. */
  body:          { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMd:        { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  /** 13px / 18px. Showcase type/caption. */
  caption:       { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  /** 13px / 18px. Showcase type/caption-strong. */
  captionStrong: { fontFamily: FONTS.semiBold, fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  bodySm:        { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  /** 12px / 16px. Showcase type/label (uppercase tracking 0.08em). */
  label:         { fontFamily: FONTS.semiBold, fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.96, textTransform: 'uppercase' as const },
  labelSm:       { fontFamily: FONTS.semiBold, fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.96, textTransform: 'uppercase' as const },
  labelMd:       { fontFamily: FONTS.medium, fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: -0.12 },
  labelXs:       { fontFamily: FONTS.medium, fontSize: 10, lineHeight: 14, fontWeight: '500' as const, letterSpacing: 0.4 },
  /** 12px / 16px. Showcase type/micro. */
  micro:         { fontFamily: FONTS.medium, fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0 },
  /** JetBrains / Geist Mono scales */
  monoBody:      { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22, fontWeight: '400' as const, letterSpacing: 0 },
  monoCaption:   { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: 0 },
  monoMicro:     { fontFamily: FONTS.medium, fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0 },
  mono:          { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.3 },
  monoSm:        { fontFamily: FONTS.regular, fontSize: 10, lineHeight: 14, fontWeight: '400' as const, letterSpacing: 0.3 },

  /** Legacy aliases */
  h1:            { fontFamily: FONTS.semiBold, fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.4 },
  h1m:           { fontFamily: FONTS.medium, fontSize: 20, lineHeight: 26, fontWeight: '500' as const, letterSpacing: -0.4 },
  h2:            { fontFamily: FONTS.medium, fontSize: 18, lineHeight: 24, fontWeight: '500' as const, letterSpacing: -0.45 },
  h3:            { fontFamily: FONTS.medium, fontSize: 16, lineHeight: 22, fontWeight: '500' as const, letterSpacing: -0.2 },
  titleLg:       { fontFamily: FONTS.medium, fontSize: 16, lineHeight: 22, fontWeight: '500' as const, letterSpacing: -0.2 },
} as const;

export const COLORS = {
  dark: colors.background,
  surface: colors.background,
  surfaceDeep: colors.surfaceDeep,
  elevated: colors.surfaceContainer,
  white: colors.onSurface,
  gray: colors.onSurfaceVariant,
  muted: colors.outlineText,
  accent: colors.accent,
  steel: colors.primary,
  surfaceDim: colors.surfaceContainerLowest,
  surfaceBright: colors.surfaceBright,
  surfaceContainerLowest: colors.surfaceContainerLowest,
  surfaceContainerLow: colors.surfaceContainerLow,
  surfaceContainer: colors.surfaceContainer,
  surfaceContainerHigh: colors.surfaceContainerHigh,
  surfaceContainerHighest: colors.surfaceContainerHighest,
  onSurface: colors.onSurface,
  onSurfaceVariant: colors.onSurfaceVariant,
  outline: colors.outline,
  outlineVariant: colors.outlineVariant,
  primary: colors.primary,
  onPrimary: colors.onPrimary,
  primaryContainer: colors.primaryContainer,
  onPrimaryContainer: colors.onPrimaryContainer,
  secondary: colors.secondary,
  onSecondary: colors.onSecondary,
  secondaryContainer: colors.secondaryContainer,
  onSecondaryContainer: colors.onSecondaryContainer,
  secondaryFixed: colors.secondary,
  secondaryFixedDim: colors.secondaryContainer,
  onSecondaryVariant: colors.onSurfaceVariant,
  tertiary: colors.tertiary,
  onTertiary: colors.onTertiary,
  tertiaryContainer: colors.tertiaryContainer,
  onTertiaryContainer: colors.onTertiaryContainer,
  tertiaryFixed: colors.tertiary,
  tertiaryFixedDim: colors.tertiaryContainer,
  onTertiaryFixed: colors.onTertiary,
  onTertiaryFixedVariant: colors.onTertiaryContainer,
  error: colors.error,
  onError: colors.onError,
  errorContainer: colors.errorContainer,
  onErrorContainer: colors.onErrorContainer,
  inverseSurface: colors.inverseSurface,
  inverseOnSurface: colors.inverseOnSurface,
  inversePrimary: colors.inversePrimary,
  surfaceVariant: colors.surfaceVariant,
  background: colors.background,
  onBackground: colors.onSurface,
  surfaceTint: colors.primary,
  glassBackground: 'rgba(20, 20, 22, 0.92)',
  glassBorder: colors.divider,
  gradientStart: colors.surfaceContainer,
  gradientEnd: colors.background,
} as const;

export const SPACING = {
  xs: sp.xs,
  sm: sp.sm,
  md: sp.md,
  lg: sp.lg,
  xl: sp.xl,
  xxl: sp.xxl,
  margin: sp.md,
} as const;

export const RADIUS = {
  sm: r.sm,
  md: r.md,
  lg: r.lg,
  xl: r.sheet,
  pill: r.pill,
  full: r.full,
} as const;