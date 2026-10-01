import { ExpoConfig, ConfigContext } from 'expo/config';
import packageJson from './package.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Luma',
  slug: 'luma',
  owner: 'wasler4j',
  version: packageJson.version,
  orientation: 'default',
  icon: './icon.png',
  scheme: 'luma',
  userInterfaceStyle: 'dark',
  backgroundColor: '#000000', // App background
  ios: {
    bundleIdentifier: 'com.luma.musicplayer',
    infoPlist: {
      UIBackgroundModes: ['audio', 'fetch'],
    },
  },
  android: {
    package: 'com.luma.musicplayer',
    versionCode: 4,
    adaptiveIcon: {
      foregroundImage: './icon.png',
      backgroundColor: '#000000',
    },
    permissions: [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE'
    ],
    backgroundColor: '#000000', // Android splash background
  },
  web: {
    output: 'static',
    backgroundColor: '#000000', // Web background
  },
  plugins: [
    'expo-router',
    // Adds the Android media foreground service and the iOS audio background mode.
    ['expo-audio', {}],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './splash.png',
        imageWidth: 180,
        resizeMode: 'contain',
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          'node_modules/@expo-google-fonts/space-grotesk/SpaceGrotesk_400Regular.ttf',
          'node_modules/@expo-google-fonts/space-grotesk/SpaceGrotesk_500Medium.ttf',
          'node_modules/@expo-google-fonts/space-grotesk/SpaceGrotesk_600SemiBold.ttf',
          'node_modules/@expo-google-fonts/space-grotesk/SpaceGrotesk_700Bold.ttf',
          'node_modules/@expo-google-fonts/courier-prime/CourierPrime_400Regular.ttf',
          'node_modules/@expo-google-fonts/courier-prime/CourierPrime_700Bold.ttf'
        ]
      }
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
    eas: {
      projectId: "04e8b1da-7e68-4186-b984-58c97312cfec"
    }
  }
});
