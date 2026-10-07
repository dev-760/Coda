import React from 'react';
import { Platform, View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../../store/toastStore';
import { codaTokens, t } from '../../theme/theme';
import Icon from './Icon';

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const currentToast = useToastStore((state) => state.currentToast);
  const hideToast = useToastStore((state) => state.hideToast);

  if (!currentToast) {
    return null;
  }

  const iconName = (() => {
    switch (currentToast.type) {
      case 'success':
        return 'check';
      case 'error':
        return 'warning';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  })();

  const iconColor = (() => {
    switch (currentToast.type) {
      case 'success':
        return codaTokens.success;
      case 'error':
        return codaTokens.error;
      case 'warning':
        return codaTokens.textPrimary;
      default:
        return codaTokens.silver;
    }
  })();

  return (
    <View
      style={[s.container, { top: Math.max(insets.top, 16) + 8 }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={hideToast}
        style={({ pressed }) => [s.pill, pressed && s.pillPressed]}
        accessibilityRole="alert"
        accessibilityLabel={currentToast.message}
      >
        <Icon name={iconName} size={15} color={iconColor} />
        <Text numberOfLines={2} style={s.message}>
          {currentToast.message}
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: codaTokens.divider,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    maxWidth: 420,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pillPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  message: {
    ...t.caption,
    color: codaTokens.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
});
