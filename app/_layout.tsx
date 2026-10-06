import { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/theme/theme';
import { audioService } from '../src/audio/AudioService';
import { BackHandler, Platform, StatusBar } from 'react-native';
import { useLibraryStore } from '../src/store/libraryStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { autoQueueService } from '../src/services/autoQueueService';
import { requestAndroidNotificationPermission } from '../src/utils/androidPermissions';

SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Geist sets UI chrome, Inter sets catalog content. See src/theme/theme.ts.
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const initializeSettings = useSettingsStore(state => state.initialize);
  const initializeLibrary = useLibraryStore(state => state.initialize);
  const initializeDownloads = useDownloadStore(state => state.initialize);
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);
  useEffect(() => {
    requestAndroidNotificationPermission().catch(console.warn);
    audioService.init().catch((error) => {
      console.error('Failed to initialize audio service:', error);
    });
  }, []);
  useEffect(() => {
    // Initialize storage systems
    initializeSettings().catch(console.error);
    initializeLibrary().catch(console.error);
    initializeDownloads().catch(console.error);
  }, [initializeSettings, initializeLibrary, initializeDownloads]);

    useEffect(() => {
      autoQueueService.start();
      return () => autoQueueService.stop();
    }, []);

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        if (router.canDismiss?.()) {
          router.dismiss();
          return true;
        }
        if (pathname && pathname !== '/' && pathname !== '/index' && pathname !== '/(tabs)' && pathname !== '/(tabs)/index') {
          router.navigate('/(tabs)');
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [pathname, router]);

    if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
      <Stack screenOptions={{ 
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerShown: false,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="now-playing" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="queue" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="album" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="artist" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
                <Stack.Screen name="lyrics" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="downloads" options={{ presentation: 'card', headerShown: false }} />
      </Stack>
    </>
  );
}
