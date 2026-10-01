import React from 'react';
import { View, Image, ViewStyle } from 'react-native';

interface AppLogoProps {
  size?: number;
  /** Kept for call-site compatibility. The source image has its own colour. */
  color?: string;
  style?: ViewStyle;
}

/**
 * App logo. splash.png is mostly transparent, so the container keeps its box
 * and the image scales inside it rather than stretching a transparent square.
 */
export function AppLogo({ size = 26, style }: AppLogoProps) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        source={require('../../../splash.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export default AppLogo;
