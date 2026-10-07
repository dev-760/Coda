import { Component, ReactNode, useEffect } from 'react';
import { BackHandler, Platform, Pressable, StatusBar, Text, View } from 'react-native';
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
import { useLibraryStore } from '../src/store/libraryStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { autoQueueService } from '../src/services/autoQueueService';
import { requestAndroidNotificationPermission } from '../src/utils/androidPermissions';
import { ToastContainer } from '../src/components/ui/ToastContainer';
import { logger } from '../src/logging/Logger';

SplashScreen.preventAutoHideAsync();

function reportStartupError(stage: string, error: unknown): void {
  try {
    logger.error('Startup', `${stage} failed`, error);
  } catch {
    // The log store itself may be unavailable; never throw from here.
  }
  if (__DEV__) console.error(`[${stage}]`, error);
}

/** Production crash containment: a render failure must show retry UI, never a blank screen. */
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    reportStartupError('Render', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Text style={{ color: colors.onSurface, fontSize: 17, fontWeight: '600' }}>
            Something went wrong
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Coda hit an unexpected error. Your library and downloads are safe.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => this.setState({ error: null })}
            style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
          >
            <Text style={{ color: colors.onSurface, fontSize: 15, fontWeight: '600' }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
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
    requestAndroidNotificationPermission().catch((error) => {
      reportStartupError('NotificationPermission', error);
    });
    audioService.init().catch((error) => {
      reportStartupError('AudioService.init', error);
    });
  }, []);
  useEffect(() => {
    // Initialize storage systems
    initializeSettings().catch((error) => reportStartupError('Settings.init', error));
    initializeLibrary().catch((error) => reportStartupError('Library.init', error));
    initializeDownloads().catch((error) => reportStartupError('Downloads.init', error));
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
    <RootErrorBoundary>
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
      <ToastContainer />
    </RootErrorBoundary>
  );
}
