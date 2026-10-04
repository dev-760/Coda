import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/theme';
import { AppLogo } from './AppLogo';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function Icon({ name, size = 24, color = colors.onSurface, style }: IconProps) {
  if (name === 'tidal') {
    return <AppLogo size={size} color={color} style={style} />;
  }

  // Common icon name mappings for compatibility
  let ioniconName = name;
  if (name === 'favorite') ioniconName = 'heart';
  if (name === 'favorite-outline') ioniconName = 'heart-outline';
  if (name === 'queue-music') ioniconName = 'list';
  if (name === 'equalizer') ioniconName = 'options-outline';
  if (name === 'arrow-up') ioniconName = 'arrow-up-outline';
  if (name === 'arrow-down') ioniconName = 'arrow-down-outline';
  if (name === 'more-horiz') ioniconName = 'ellipsis-horizontal';
  if (name === 'more-vert') ioniconName = 'ellipsis-vertical';

  return <Ionicons name={ioniconName as any} size={size} color={color} style={style} />;
}
