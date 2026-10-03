import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from './Icon';
import { colors } from '../../theme/theme';

interface HeaderBarProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  /** Extra controls rendered on the trailing edge (overflow menus, etc). */
  rightAction?: React.ReactNode;
}

export default function HeaderBar({
  showBack = false,
  onBack,
  title,
  rightAction,
}: HeaderBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={s.container}>
      <View style={s.left}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={s.circleBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="chevron-back" size={20} color={colors.onSurface} />
          </Pressable>
        )}
      </View>

      {title ? (
        <View style={s.center}>
          <Text numberOfLines={1} style={s.title}>{title}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={s.right}>
              {rightAction}
            </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
