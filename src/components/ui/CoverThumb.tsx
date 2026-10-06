import { memo, useMemo } from 'react';
import { Image, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import { withCoverSize } from '../../providers/mappers';
import { GenerativeArt, GenerativePattern } from './GenerativeArt';

interface CoverThumbProps {
  uri?: string | null;
  /** Edge length in px, used to pick the closest CDN size. */
  size: number;
  borderRadius?: number;
  style?: StyleProp<ImageStyle>;
  /** Scales the displayed artwork, e.g. 2 for @2x screens. */
  pixelRatio?: number;
  fallbackIconSize?: number;
  glow?: boolean;
  showGlow?: boolean;
  pattern?: GenerativePattern;
}

/**
 * CDN sizes Tidal actually serves. A row thumbnail requests the smallest that
 * still covers its pixels rather than the default 320, which the mappers attach
 * to every cover URL.
 */
const CDN_SIZES = [80, 160, 320, 640, 1280] as const;

function pickSize(edge: number): string {
  const wanted = Math.max(80, Math.round(edge));
  const match = CDN_SIZES.find((size) => size >= wanted);
  return `${match ?? 1280}x${match ?? 1280}`;
}

function CoverThumbComponent({
  uri,
  size,
  borderRadius = 8,
  style,
  pixelRatio = 2,
  glow = false,
  showGlow = false,
  pattern,
}: CoverThumbProps) {
  const isGlowing = glow || showGlow;
  const source = useMemo(() => {
    const resolved = withCoverSize(uri, pickSize(size * pixelRatio));
    return resolved ? { uri: resolved } : null;
  }, [uri, size, pixelRatio]);

  if (!source) {
    return (
      <GenerativeArt
        seedKey={uri || size}
        pattern={pattern}
        size={size}
        borderRadius={borderRadius}
        glow={isGlowing}
        style={style as any}
      />
    );
  }

  return (
    <Image
      source={source}
      style={[
        { width: size, height: size, borderRadius },
        glow && styles.glow,
        style,
      ]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: '#B8B8C0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
});

/**
 * Memoized because list rows re-render on every playback tick, and the image is
 * by far the most expensive node in a row to reconcile.
 */
export default memo(CoverThumbComponent);