import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/theme';

/**
 * The official Coda Eclipse mark.
 *
 * Source: Coda Design System showcase:
 * A thick ring with an opening at the upper right; a detached dot of light sits in the gap.
 * Reads cleanly from 16px to 1024px.
 */
interface AppLogoProps {
  size?: number;
  /** Main mark colour. Defaults to Silver (#B8B8C0). */
  color?: string;
  showText?: boolean;
  style?: StyleProp<ViewStyle>;
}

const ECLIPSE_PATH =
  'M793.91 409.39A300 300 0 1 1 614.61 230.09L580.4 324.06A200 200 0 1 0 699.94 443.6ZM636.78 335.22A52 52 0 1 0 740.78 335.22A52 52 0 1 0 636.78 335.22Z';

export function AppLogo({
  size = 28,
  color = colors.accent,
  showText = false,
  style,
}: AppLogoProps) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', gap: 6 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Path
          d={ECLIPSE_PATH}
          fill={color}
          fillRule="evenodd"
        />
      </Svg>
    </View>
  );
}

export default AppLogo;