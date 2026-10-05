import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/theme';

interface LevelMeterProps {
  isPlaying?: boolean;
  active?: boolean;
  color?: string;
  height?: number;
  size?: number;
  barWidth?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

const FRAMES: number[][] = [
  [6, 12, 9],
  [12, 6, 14],
  [9, 14, 6],
  [14, 9, 12],
];

export function LevelMeter({
  isPlaying,
  active,
  color = colors.accent,
  height,
  size,
  barWidth = 3,
  gap = 2,
  style,
}: LevelMeterProps) {
  const isCurrentlyPlaying = isPlaying ?? active ?? true;
  const actualHeight = size ?? height ?? 14;
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isCurrentlyPlaying) return;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % FRAMES.length);
    }, 280);
    return () => clearInterval(interval);
  }, [isCurrentlyPlaying]);

  const heights = isCurrentlyPlaying ? FRAMES[frameIndex] : [8, 12, 10];
  const scale = actualHeight / 16;

  return (
    <View
      style={[styles.container, { height: actualHeight, gap }, style]}
      accessibilityRole="none"
      accessibilityLabel="Playing audio meter"
    >
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: Math.max(4, h * scale),
              backgroundColor: color,
              borderRadius: barWidth / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    alignSelf: 'flex-end',
  },
});

export default LevelMeter;
