import { useWindowDimensions, PixelRatio, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SizeClass = 'compact' | 'regular' | 'large';

/**
 * Width breakpoints follow the platform window size classes rather than device
 * names, so a phone in landscape and a small tablet are judged the same way.
 *
 *   compact  < 600  phones, small split-screen windows
 *   regular  600-767 large phones landscape, foldables closed
 *   large    >= 768 tablets, unfolded foldables, desktop windows
 *
 * 768 is the width of an iPad mini in portrait, so any device that can carry a
 * two or three column layout gets the wide treatment.
 */
export function getSizeClass(width: number): SizeClass {
  if (width < 600) return 'compact';
  if (width < 768) return 'regular';
  return 'large';
}

/** Tab bar content height, excluding the device inset added on top of it. */
export const TAB_BAR_HEIGHT = 64;

/** Height of the docked mini player that sits above the tab bar. */
export const MINI_PLAYER_HEIGHT = 60;

/**
 * Bottom inset the tab bar reserves for the device navigation area.
 *
 * Some devices report no safe-area inset while still drawing navigation keys,
 * so the bar keeps a minimum. Overlays docked above the bar and list clearance
 * both call this, so they stay in agreement about the reserved height.
 */
export function resolveTabBarInset(bottomInset: number, os: 'ios' | 'android' | 'web' | 'windows' | 'macos'): number {
  return Math.max(bottomInset, os === 'ios' ? 24 : 8);
}

/**
 * Clearance a scrolling list needs so its last row is not hidden behind the
 * fixed bars. Screens must add this to their own content padding.
 */
export function bottomBarClearance(bottomInset: number, hasMiniPlayer = true): number {
  return TAB_BAR_HEIGHT + bottomInset + (hasMiniPlayer ? MINI_PLAYER_HEIGHT : 0) + 16;
}

export function useResponsive() {
  const { width, height, scale, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const sizeClass = getSizeClass(width);

  // Cap the font multiplier: beyond this, fixed-height rows clip their text.
  const boundedFontScale = Math.min(fontScale, 1.4);

  /**
   * Horizontal page padding. Wider windows get more breathing room rather than
   * just stretching the content, which keeps line lengths readable on tablets.
   */
  const gutter =
    sizeClass === 'compact' ? 20 : sizeClass === 'regular' ? 28 : 40;

  const maxContentWidth = sizeClass === 'large' ? 720 : Number.POSITIVE_INFINITY;

  const isShortScreen = height < 720;

  /**
   * Square artwork edge length. Derived from available horizontal and vertical budget
   * so it fits without scrolling when the device rotates or the window is short.
   */
  const artworkSize = (max: number) => {
    const verticalBudget = isLandscape ? height * 0.68 : Math.max(160, height - 420);
    const horizontalBudget = isLandscape ? width * 0.45 : width - gutter * 2;
    const available = Math.min(horizontalBudget, verticalBudget);
    return Math.round(Math.min(Math.max(available, 140), max));
  };

  /** Columns for a grid that stays usable at any width. */
  const gridColumns = (minTileWidth: number) =>
    Math.max(2, Math.floor((width - gutter * 2) / minTileWidth));

  const round = PixelRatio.roundToNearestPixel;

  return {
    width,
    height,
    scale,
    fontScale: boundedFontScale,
    isLandscape,
    isShortScreen,
    sizeClass,
    gutter,
    maxContentWidth,
    artworkSize,
    gridColumns,
    round,
    /** Safe-area aware clearance for lists sitting under the fixed bars. */
    bottomBarClearance: bottomBarClearance(resolveTabBarInset(insets.bottom, Platform.OS)),
  };
}