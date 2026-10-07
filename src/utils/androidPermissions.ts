import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests Android notification permission (required on Android 13+ / API 33+
 * for media playback controls and status to display in the notification bar).
 */
export async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel =
      typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    if (apiLevel >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Media Playback Controls',
          message: 'Allow Coda to display playback controls in your notification bar and lock screen.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        }
      );
      return status === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch (error) {
    if (__DEV__) console.warn('Notification permission request failed:', error);
    return false;
  }
}

/**
 * @deprecated Downloads live in the app-private directory and declare no
 * storage permissions. Kept as a no-op so older call sites keep working.
 */
export async function requestAndroidStoragePermission(): Promise<boolean> {
  return true;
}
