import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

/**
 * The Luma waveform mark.
 *
 * Drawn as vector rather than shipped as a bitmap so it stays crisp from a 20px
 * tab bar to a 1024px splash, and so it can be themed. The bar geometry is
 * measured from the source artwork, on a 0..100 viewBox centred on 48,48.
 */
interface AppLogoProps {
  size?: number;
  /** Main mark colour. */
  color?: string;
  /** Ring colour. Defaults to a dimmer token so the mark reads first. */
  ringColor?: string;
  style?: ViewStyle;
}

// x centre, half width, half height, on a 0..100 box.
const BARS: { x: number; hw: number; hh: number }[] = [
  { x: 28.5, hw: 5.5, hh: 2.0 },
  { x: 37.6, hw: 2.1, hh: 17.4 },
  { x: 48.0, hw: 2.05, hh: 30.9 },
  { x: 59.6, hw: 2.05, hh: 13.6 },
  { x: 71.05, hw: 2.05, hh: 5.9 },
];

const RING_RADIUS = 45.5;
const RING_WIDTH = 1.6;
const CENTER = 48;

export function AppLogo({
  size = 26,
  color = '#F3F5F8',
  ringColor = '#4A5463',
  style,
}: AppLogoProps) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={ringColor}
          strokeWidth={RING_WIDTH}
          fill="none"
        />
        {BARS.map((bar) => (
          <Rect
            key={bar.x}
            x={bar.x - bar.hw}
            y={CENTER - bar.hh}
            width={bar.hw * 2}
            height={bar.hh * 2}
            rx={Math.min(bar.hw, bar.hh)}
            fill={color}
          />
        ))}
      </Svg>
    </View>
  );
}

export default AppLogo;