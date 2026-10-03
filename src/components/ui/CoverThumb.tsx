import React, { memo, useMemo } from 'react';
import { Image, View, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import Icon from './Icon';
import { withCoverSize } from '../../providers/mappers';
import { colors } from '../../theme/theme';

interface CoverThumbProps {
  uri?: string | null;
  /** Edge length in px, used to pick the closest CDN size. */
  size: number;
  borderRadius?: number;
  style?: StyleProp<ImageStyle>;
  /** Scales the displayed artwork, e.g. 2 for @2x screens. */
  pixelRatio?: number;
  fallbackIconSize?: number;
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
  borderRadius = 4,
  style,
  pixelRatio = 2,
  fallbackIconSize,
}: CoverThumbProps) {
  const source = useMemo(() => {
    const resolved = withCoverSize(uri, pickSize(size * pixelRatio));
    return resolved ? { uri: resolved } : null;
  }, [uri, size, pixelRatio]);

  if (!source) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius },
          style as StyleProp<ImageStyle>,
        ]}
      >
        <Icon name="musical-notes" size={fallbackIconSize ?? Math.round(size * 0.42)} color={colors.onSurfaceVariant} />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[{ width: size, height: size, borderRadius }, style]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Memoized because list rows re-render on every playback tick, and the image is
 * by far the most expensive node in a row to reconcile.
 */
export default memo(CoverThumbComponent);