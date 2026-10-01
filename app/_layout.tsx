import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { 
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold
} from '@expo-google-fonts/space-grotesk';
import {
  CourierPrime_400Regular,
  CourierPrime_700Bold
} from '@expo-google-fonts/courier-prime';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from '../src/theme/theme';
import { audioService } from '../src/audio/AudioService';
import { StatusBar } from 'react-native';
import { useLibraryStore } from '../src/store/libraryStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useDownloadStore } from '../src/downloads/downloadStore';
import { autoQueueService } from '../src/services/autoQueueService';
import { useListeningStore } from '../src/store/listeningStore';

SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
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

    if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack screenOptions={{ 
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.onSurface,
        headerShown: false,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="now-playing" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="queue" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="album" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="artist" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="audio-settings" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="dev-options" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="lyrics" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="downloads" options={{ presentation: 'card', headerShown: false }} />
      </Stack>
    </>
  );
}
