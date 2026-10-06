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
    console.warn('Notification permission request failed:', error);
    return false;
  }
}

/**
 * Requests storage access permissions on Android when needed.
 */
export async function requestAndroidStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel =
      typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
    if (apiLevel >= 33 && PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO) {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        {
          title: 'Storage Access',
          message: 'Allow Coda to access audio files on this device.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        }
      );
      return status === PermissionsAndroid.RESULTS.GRANTED;
    } else if (
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE &&
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    ) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  } catch (error) {
    console.warn('Storage permission request failed:', error);
    return false;
  }
}
