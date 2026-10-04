import Constants from 'expo-constants';

const configuredBaseUrl =
  (Constants.expoConfig?.extra?.hifiApiBaseUrl as string | undefined) ||
  'https://hifi-api00.vercel.app';

export const HIFI_API_CONFIG = {
  baseURL: configuredBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const HIFI_ENDPOINTS = {
  ROOT: '/',
  INFO: '/info/',
  SEARCH: '/search/',
  ALBUM: '/album/',
  ALBUM_SIMILAR: '/album/similar/',
  ARTIST: '/artist/',
  ARTIST_SIMILAR: '/artist/similar/',
  PLAYLIST: '/playlist/',
  MIX: '/mix/',
  RECOMMENDATIONS: '/recommendations/',
  COVER: '/cover/',
  LYRICS: '/lyrics/',
  TOP_VIDEOS: '/topvideos/',
  TRACK: '/track/',
  TRACK_MANIFESTS: '/trackManifests/',
  VIDEO: '/video/',
  WIDEVINE: '/widevine',
  DOWNLOAD: '/download/',
  PLAYBACK_REQUESTS: '/playback/requests/',
};

export const AUDIO_QUALITIES = ['LOSSLESS', 'HIGH', 'LOW'] as const;
export type AudioQuality = typeof AUDIO_QUALITIES[number];

export const VIDEO_QUALITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type VideoQuality = typeof VIDEO_QUALITIES[number];
