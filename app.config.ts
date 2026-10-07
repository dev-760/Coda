import { ExpoConfig, ConfigContext } from 'expo/config';
import packageJson from './package.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Coda',
  slug: 'coda',
  owner: 'windsurf29',
  version: packageJson.version,
  orientation: 'default',
  icon: './assets/brand/icon-1024.png',
  scheme: 'coda',
  userInterfaceStyle: 'dark',
  backgroundColor: '#131316', // App background
  ios: {
    bundleIdentifier: 'com.coda.player',
    // Mirrors android.versionCode so both stores bump in lockstep per release.
    buildNumber: '43',
    infoPlist: {
      UIBackgroundModes: ['audio', 'fetch'],
    },
  },
  android: {
    package: 'com.coda.player',
    versionCode: 43,
    adaptiveIcon: {
      // Split layers so the launcher can mask and tint them. The mark sits
      // inside the adaptive safe zone, which a single squashed foreground
      // would have clipped on circular and squircle masks.
      foregroundImage: './assets/brand/adaptive-icon-foreground.png',
      backgroundImage: './assets/brand/adaptive-icon-background.png',
      backgroundColor: '#1a1c1e',
    },
    // Downloads live in the app-private directory, so no storage or media
    // read permissions are declared. READ/WRITE_EXTERNAL_STORAGE are legacy
    // (max SDK 32) and trigger Play Store review flags.
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.POST_NOTIFICATIONS',
    ],
    backgroundColor: '#131316', // Android splash background
    predictiveBackGestureEnabled: true,
  },
  web: {
    output: 'static',
    backgroundColor: '#131316', // Web background
  },
  plugins: [
    'expo-router',
    // Adds the Android media foreground service and the iOS audio background mode.
    // enableBackgroundPlayback keeps the media session alive past Android's
    // ~3 minute background limit, so the notification and lock screen controls
    // survive once the app is backgrounded.
    ['expo-audio', { enableBackgroundPlayback: true }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#131316',
        image: './assets/brand/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          'node_modules/@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf',
          'node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf',
          'node_modules/@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf',
          'node_modules/@expo-google-fonts/geist/700Bold/Geist_700Bold.ttf',
          'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
          'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
          'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
          'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
        ],
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: "16.4"
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    hifiApiBaseUrl: 'https://hifi-api00.vercel.app',
    eas: {
      projectId: 'e0f53ea8-5afd-42c5-a154-2908a1d8c084',
    },
  }
});
