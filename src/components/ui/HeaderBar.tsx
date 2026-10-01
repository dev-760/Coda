import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AppLogo from './AppLogo';
import Icon from './Icon';

interface HeaderBarProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  showProfile?: boolean;
  onProfilePress?: () => void;
  rightAction?: React.ReactNode;
}

export default function HeaderBar({
  showBack = false,
  onBack,
  title,
  showProfile = false,
  onProfilePress,
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

  const handleProfile = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.push('/settings' as any);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.left}>
        {showBack ? (
          <Pressable onPress={handleBack} style={s.circleBtn} hitSlop={8}>
            <Icon name="chevron-back" size={20} color="#ffffff" />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/')} hitSlop={8}>
            <AppLogo size={24} color="#ffffff" />
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
        {showProfile && (
          <Pressable onPress={handleProfile} style={s.circleBtn} hitSlop={8}>
            <Icon name="person" size={18} color="#ffffff" />
          </Pressable>
        )}
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
    color: '#ffffff',
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
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
