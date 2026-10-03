// theme.ts — Luma v2.0 palette.
//
// Values come from Design.md, which defines the committed visual world:
// a near-black slate base ("never absolute zero black"), desaturated
// steel-sage accents, and a warm matte accent for playback indicators.
//
// `outline` is the structural border colour from the spec, but at 4.4:1 it is
// under the 4.5:1 floor for body text. `outlineText` is the accessible variant
// used wherever muted copy is rendered; `outlineVariant` stays border-only.

export const colors = {
  // Structural foundations
  background: '#090B10',
  surface: '#090B10',
  surfaceContainerLowest: '#090B10',
  surfaceContainerLow: '#0D1017',
  surfaceContainer: '#11151D',
  surfaceContainerHigh: '#1A1F29',
  surfaceContainerHighest: '#252B37',
  surfaceVariant: '#11151D',
  surfaceBright: '#1A1F29',

  // Line work
  outline: '#737D8C',
  outlineVariant: '#4A5463',
  /** Muted text. 5.7:1 on the base, 5.4:1 on an elevated surface. */
  outlineText: '#8791A0',

  // Text
  onSurface: '#F3F5F8',
  onSurfaceVariant: '#AEB6C3',

  // Primary actions / navigation use Luma Steel
  primary: '#6F7E88',
  onPrimary: '#F3F5F8',
  primaryContainer: '#4A5463',
  onPrimaryContainer: '#D8E4EB',
  primaryFixed: '#6F7E88',
  primaryFixedDim: '#5A6B75',
  onPrimaryFixed: '#090B10',
  onPrimaryFixedVariant: '#4A5463',

  // Secondary accent, used with restraint for playback indicators
  secondary: '#8D8170',
  onSecondary: '#F3F5F8',
  secondaryContainer: '#6B6152',
  onSecondaryContainer: '#E0D8CC',
  secondaryFixed: '#8D8170',
  secondaryFixedDim: '#6B6152',
  onSecondaryFixed: '#090B10',
  onSecondaryFixedVariant: '#4A4235',

  tertiary: '#5A6B75',
  onTertiary: '#F3F5F8',
  tertiaryContainer: '#3D4A52',
  onTertiaryContainer: '#D8E4EB',
  tertiaryFixed: '#5A6B75',
  tertiaryFixedDim: '#3D4A52',
  onTertiaryFixed: '#090B10',
  onTertiaryFixedVariant: '#2C353B',

  error: '#EF4444',
  onError: '#FFFFFF',
  errorContainer: '#DC2626',
  onErrorContainer: '#FEE2E2',

  inverseSurface: '#F3F5F8',
  inverseOnSurface: '#090B10',
  inversePrimary: '#5A6B75',

  surfaceDim: '#090B10',
  /** Playback indicator / active selector pin. Warm, never neon. */
  accent: '#8D8170',
} as const;

export const sp = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 } as const;
export const r  = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 } as const;

export const t = {
  display:  { fontSize: 48, lineHeight: 56, fontWeight: '700' as const, letterSpacing: -1 },
  h1:       { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.6 },
  h1m:      { fontSize: 26, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2:       { fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  h3:       { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  titleLg:  { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  titleMd:  { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  body:     { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyLg:   { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMd:   { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySm:   { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  labelMd:  { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelSm:  { fontSize: 10, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.5 },
  mono:     { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0.3 },
  monoSm:   { fontSize: 10, lineHeight: 14, fontWeight: '400' as const },
} as const;

/**
 * Flattened aliases for screens that predate the token names. Kept so those
 * screens inherit the Luma palette without a sweeping rewrite.
 */
export const COLORS = {
  dark: colors.background,
  surface: colors.background,
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
  secondaryFixed: colors.secondaryFixed,
  secondaryFixedDim: colors.secondaryFixedDim,
  onSecondaryVariant: colors.onSurfaceVariant,
  tertiary: colors.tertiary,
  onTertiary: colors.onTertiary,
  tertiaryContainer: colors.tertiaryContainer,
  onTertiaryContainer: colors.onTertiaryContainer,
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
  vuGreen: colors.accent,
  vuAmber: '#D9A441',
  vuRed: colors.error,
  glassBackground: 'rgba(243, 245, 248, 0.06)',
  glassBorder: 'rgba(243, 245, 248, 0.12)',
  gradientStart: colors.surfaceContainer,
  gradientEnd: colors.background,
};

export const FONTS = {
  display: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  displayBold: 'SpaceGrotesk_700Bold',
  displayRegular: 'SpaceGrotesk_400Regular',
  mono: 'CourierPrime_400Regular',
  monoBold: 'CourierPrime_700Bold',
};

export const SPACING = {
  xs: sp.xs,
  sm: sp.sm,
  md: sp.md,
  lg: sp.lg,
  xl: sp.xl,
  xxl: sp.xxl,
  margin: sp.md,
};

export const RADIUS = {
  sm: r.sm,
  md: r.md,
  lg: r.lg,
  xl: r.xl,
  full: r.full,
};