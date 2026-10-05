import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { colors, r } from '../../theme/theme';

export type ArtPattern = 'Halftone' | 'Lines' | 'Waveform' | 'Grain' | 'Rings' | 'Contour';
export type GenerativePattern = ArtPattern | 'waveform' | 'contour' | 'halftone' | 'rings' | 'lines' | 'grain' | 'wave';

export const ART_PATTERNS: ArtPattern[] = ['Halftone', 'Lines', 'Waveform', 'Grain', 'Rings', 'Contour'];

interface GenerativeArtProps {
  seedKey?: string | number;
  pattern?: GenerativePattern;
  size?: number;
  borderRadius?: number;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Pseudo-random helper seeded by string or number
function getSeedNumber(key: string | number): number {
  if (typeof key === 'number') return key;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function GenerativeArt({
  seedKey = 'luma',
  pattern,
  size = 144,
  borderRadius = r.lg,
  glow = false,
  style,
}: GenerativeArtProps) {
  const seed = useMemo(() => getSeedNumber(seedKey), [seedKey]);

  const activePattern = useMemo<ArtPattern>(() => {
    if (pattern) {
      const lower = pattern.toLowerCase();
      if (lower === 'wave' || lower === 'waveform') return 'Waveform';
      if (lower === 'contour') return 'Contour';
      if (lower === 'halftone') return 'Halftone';
      if (lower === 'rings') return 'Rings';
      if (lower === 'lines') return 'Lines';
      if (lower === 'grain') return 'Grain';
      return pattern as ArtPattern;
    }
    return ART_PATTERNS[seed % ART_PATTERNS.length];
  }, [pattern, seed]);

  const elements = useMemo(() => {
    const s = size;
    const S = colors.accent; // #B8B8C0

    if (activePattern === 'Halftone') {
      const step = s / 12;
      const circles = [];
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 12; x++) {
          const d = Math.hypot(x - 8, y - 4) / 10;
          const rad = Math.max(0, (1 - d) * step * 0.48);
          if (rad > 0.4) {
            circles.push(
              <Circle
                key={`h-${x}-${y}`}
                cx={(x + 0.5) * step}
                cy={(y + 0.5) * step}
                r={rad}
                fill={S}
              />
            );
          }
        }
      }
      return circles;
    }

    if (activePattern === 'Lines') {
      const lines = [];
      for (let i = 0; i < 18; i++) {
        const y = 8 + (i * (s - 16)) / 17;
        const amp = 4 + 8 * Math.sin(i / 2.5 + seed);
        lines.push(
          <Path
            key={`l-${i}`}
            d={`M0 ${y.toFixed(1)} C ${s * 0.3} ${(y - amp).toFixed(1)}, ${s * 0.6} ${(y + amp).toFixed(1)}, ${s} ${y.toFixed(1)}`}
            stroke={S}
            strokeOpacity={i % 3 === 0 ? 1 : 0.45}
            strokeWidth={1.25}
            fill="none"
          />
        );
      }
      return lines;
    }

    if (activePattern === 'Waveform') {
      const n = 32;
      const rects = [];
      for (let i = 0; i < n; i++) {
        const h = (0.2 + 0.75 * Math.abs(Math.sin((i + seed) * 0.35) * Math.cos(i * 0.12))) * s * 0.7;
        rects.push(
          <Rect
            key={`w-${i}`}
            x={(i * s) / n + 1}
            y={(s - h) / 2}
            width={s / n - 2}
            height={h}
            rx={1}
            fill={S}
            fillOpacity={i > 20 ? 0.35 : 1}
          />
        );
      }
      return rects;
    }

    if (activePattern === 'Rings') {
      const rings = [];
      for (let i = 1; i < 10; i++) {
        rings.push(
          <Circle
            key={`r-${i}`}
            cx={s * 0.38}
            cy={s * 0.62}
            r={(i * s) / 12}
            stroke={S}
            strokeOpacity={i === 4 ? 1 : 0.45}
            strokeWidth={i === 4 ? 2.5 : 1.25}
            fill="none"
          />
        );
      }
      return rings;
    }

    if (activePattern === 'Grain') {
      const grains = [];
      for (let i = 0; i < 120; i++) {
        const pseudoX = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;
        const pseudoY = ((seed * (i + 2) * 9301 + 49297) % 233280) / 233280;
        const x = pseudoX * s;
        const y = pseudoY * s;
        grains.push(
          <Circle
            key={`g-${i}`}
            cx={x}
            cy={y}
            r={1.2}
            fill={S}
            fillOpacity={i % 2 === 0 ? 0.8 : 0.4}
          />
        );
      }
      return grains;
    }

    // Default: Contour
    const contours = [];
    for (let i = 0; i < 7; i++) {
      const r_val = 12 + i * (s / 16);
      const pts = [];
      for (let a = 0; a <= 24; a++) {
        const t = (a / 24) * Math.PI * 2;
        const rr = r_val + 5 * Math.sin(t * 3 + i) + 3 * Math.cos(t * 4);
        pts.push(`${(s / 2 + rr * Math.cos(t)).toFixed(1)} ${(s / 2 + rr * Math.sin(t)).toFixed(1)}`);
      }
      contours.push(
        <Path
          key={`c-${i}`}
          d={`M${pts.join(' L')} Z`}
          stroke={S}
          strokeOpacity={i % 3 === 0 ? 1 : 0.45}
          strokeWidth={1.25}
          fill="none"
        />
      );
    }
    return contours;
  }, [activePattern, size, seed]);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          borderColor: colors.divider,
        },
        glow && styles.glowBorder,
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Rect width={size} height={size} fill={colors.background} />
        {elements}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  glowBorder: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 6,
  },
});
