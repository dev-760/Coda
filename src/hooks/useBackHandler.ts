import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Ensures pressing the Android hardware or system back button navigates back
 * instead of closing the application.
 */
export function useBackHandler(handler?: () => boolean) {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (handler) {
        const handled = handler();
        if (handled) return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      if (router.canDismiss?.()) {
        router.dismiss();
        return true;
      }
      router.navigate('/(tabs)');
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handler, router]);
}
