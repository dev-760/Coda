import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';

interface TidalLogoProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/**
 * App Logo component using the brand icon
 */
export function TidalLogo({ size = 26, style }: TidalLogoProps) {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        source={require('../../../icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export default TidalLogo;
