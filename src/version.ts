import Constants from 'expo-constants';
import packageJson from '../package.json';

export const APP_VERSION: string = packageJson.version;

export const APP_BUILD_NUMBER: string =
  (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode?.toString() ?? '1';
