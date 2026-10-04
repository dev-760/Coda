// theme.ts — Luma design tokens.
//
// Rebuilt from the eight current Figma specs. The previous theme used a
// steel/warm-grey palette with Space Grotesk and Courier Prime; this spec uses
// a neutral near-black base with Geist for UI chrome and Inter for content, so
// the whole scale below comes from the new screens rather than being adapted.

/** Base canvas. Screens using the flat `#131316` surface stop here. */
const BASE = '#131316';
/** Deeper canvas, used by full-bleed player surfaces. */
const BASE_DEEP = '#0E0E11';
const RAISED = '#2A2A2D';
const RAISED_ALT = '#353438';
const SUBTLE = '#1B1B1E';
const SUBTLE_ALT = '#1F1F22';
const HAIRLINE = '#444748';

export const colors = {
  // Canvas
  background: BASE,
  surface: BASE,
  surfaceDeep: BASE_DEEP,
  surfaceContainerLowest: BASE_DEEP,
  surfaceContainerLow: RAISED,
  surfaceContainer: RAISED,
  surfaceContainerHigh: RAISED_ALT,
  surfaceContainerHighest: RAISED_ALT,
  surfaceVariant: SUBTLE_ALT,
  surfaceSubtle: SUBTLE,
  surfaceBright: RAISED_ALT,

  /** Track titles and other content set in Inter. */
  onSurface: '#FFFFFF',
  /** Supporting copy and metadata. */
  onSurfaceVariant: '#C6C6CF',
  /** De-emphasised labels, counters and timestamps. */
  outlineText: '#C4C7C8',

  // Line work
  outline: '#8E9192',
  outlineVariant: HAIRLINE,

  // Text tints seen on player surfaces
  textSoft: '#E4E1E6',
  textMuted: '#C6C6C7',

  // Primary chrome. The spec inverts rather than tints: a selected pill is a
  // solid white pill with dark text, never a coloured one.
  primary: '#FFFFFF',
  onPrimary: BASE_DEEP,
  primaryContainer: RAISED,
  onPrimaryContainer: '#E4E1E6',

  secondary: '#C4C7C8',
  onSecondary: BASE_DEEP,
  secondaryContainer: RAISED_ALT,
  onSecondaryContainer: '#E4E1E6',

  tertiary: '#8E9192',
  onTertiary: BASE_DEEP,
  tertiaryContainer: SUBTLE_ALT,
  onTertiaryContainer: '#C6C6CF',

  // Feedback. #FFB4AB is the spec's error tint; errorContainer keeps the
  // stronger red for surfaces behind that text.
  error: '#FFB4AB',
  onError: BASE_DEEP,
  errorContainer: '#DC2626',
  onErrorContainer: '#FFE9E7',

  success: '#3DA35D',
  onSuccess: '#04180C',

  inverseSurface: '#F3F5F8',
  inverseOnSurface: BASE_DEEP,
  inversePrimary: RAISED,

  surfaceDim: BASE_DEEP,

  /**
   * Playback indicator. The spec's active accent is a warm white rather than a
   * hue, so this is the on-surface token and states read through weight.
   */
  accent: '#FFFFFF',
} as const;

export const sp = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 } as const;
export const r = {
  sm: 4,
  md: 8,
  lg: 12,
  /** Legacy alias for the old 16px step, kept while screens migrate. */
  xl: 16,
  /** Pills and circular controls are fully rounded in the spec. */
  pill: 9999,
  full: 999,
} as const;

/**
 * The two families, declared before the scale below so every token can bind a
 * family. Names are the expo-google-fonts export names, which is also what the
 * web build registers them as.
 *
 * Previously the `t` tokens carried no family at all, so every heading silently
 * fell back to the platform UI font and the Geist install appeared unused.
 */
export const FONTS = {
  // Geist, UI chrome
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semiBold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',

  // Inter, catalog content
  content: 'Inter_400Regular',
  contentMedium: 'Inter_500Medium',
  contentSemiBold: 'Inter_600SemiBold',
  contentBold: 'Inter_700Bold',

  /**
   * Legacy names still referenced by screens that have not been rebuilt.
   * `display` maps to Geist so headings pick up the new face immediately.
   */
  display: 'Geist_600SemiBold',
  displayMedium: 'Geist_500Medium',
  displayBold: 'Geist_700Bold',
  displayRegular: 'Geist_400Regular',
  mono: 'Geist_400Regular',
  monoBold: 'Geist_600SemiBold',
} as const;

/**
 * Type scale taken from the specs, where 11px and 12px carry nearly all body
 * copy and 18px is the section-heading size.
 *
 * Every entry names its family explicitly: Geist for UI, Inter for content, so
 * a token can be spread into a style without also guessing a font.
 */
export const t = {
  /** 26px. Reserved for the Now Playing title. */
  hero:      { fontFamily: FONTS.semiBold, fontSize: 26, lineHeight: 32, fontWeight: '600' as const, letterSpacing: -0.5 },
  /** 22px. Large screen titles. */
  display:   { fontFamily: FONTS.semiBold, fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.4 },
  /** 18px. Section headings. */
  title:     { fontFamily: FONTS.medium, fontSize: 18, lineHeight: 24, fontWeight: '500' as const, letterSpacing: -0.45 },
  /** 16px. Sub-headings and emphasis. */
  titleMd:   { fontFamily: FONTS.medium, fontSize: 16, lineHeight: 22, fontWeight: '500' as const, letterSpacing: -0.2 },
  /** 14px. Track and card titles. Content, so Inter. */
  bodyLg:    { fontFamily: FONTS.contentSemiBold, fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  /** 14px. Geist UI text. */
  body:      { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  /** 12px. The workhorse UI size. */
  bodyMd:    { fontFamily: FONTS.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  /** 11px. Captions, metadata and telemetry. */
  bodySm:    { fontFamily: FONTS.regular, fontSize: 11, lineHeight: 14, fontWeight: '400' as const },
  /** 12px. Buttons and pills, which are always medium weight. */
  labelMd:   { fontFamily: FONTS.medium, fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: -0.12 },
  /** 11px. Uppercase section eyebrows, letterspaced. */
  labelSm:   { fontFamily: FONTS.medium, fontSize: 11, lineHeight: 14, fontWeight: '500' as const, letterSpacing: 0.66 },
  /** 10px. Tabular figures for timecodes and counters. */
  labelXs:   { fontFamily: FONTS.medium, fontSize: 10, lineHeight: 14, fontWeight: '500' as const, letterSpacing: 0.4 },
  /** 9px. Densest metadata. */
  micro:     { fontFamily: FONTS.medium, fontSize: 9, lineHeight: 12, fontWeight: '500' as const, letterSpacing: 0.3 },
  mono:      { fontFamily: FONTS.regular, fontSize: 11, lineHeight: 14, fontWeight: '400' as const, letterSpacing: 0.3 },
  monoSm:    { fontFamily: FONTS.regular, fontSize: 9, lineHeight: 12, fontWeight: '400' as const, letterSpacing: 0.3 },

  /**
   * Legacy names. Screens not yet rebuilt still reference these, so they map
   * onto the new scale rather than being left to break the build.
   */
  h1:       { fontFamily: FONTS.semiBold, fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.4 },
  h1m:      { fontFamily: FONTS.medium, fontSize: 20, lineHeight: 26, fontWeight: '500' as const, letterSpacing: -0.4 },
  h2:       { fontFamily: FONTS.medium, fontSize: 18, lineHeight: 24, fontWeight: '500' as const, letterSpacing: -0.45 },
  h3:       { fontFamily: FONTS.medium, fontSize: 16, lineHeight: 22, fontWeight: '500' as const, letterSpacing: -0.2 },
  titleLg:  { fontFamily: FONTS.medium, fontSize: 16, lineHeight: 22, fontWeight: '500' as const, letterSpacing: -0.2 },
} as const;

/**
 * Flattened aliases kept for screens that predate the token names, so they
 * inherit the new palette without a sweeping rewrite.
 */
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
  glassBackground: 'rgba(31, 31, 34, 0.95)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
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
  xl: r.lg,
  pill: r.pill,
  full: r.full,
} as const;