export const STORAGE_NAMESPACE = 'luma';

export const STORAGE_KEYS = {
  FAVORITES: `${STORAGE_NAMESPACE}:favorites`,
  PLAYLISTS: `${STORAGE_NAMESPACE}:playlists`,
  SEARCH_HISTORY: `${STORAGE_NAMESPACE}:search_history`,
  RECENTLY_PLAYED: `${STORAGE_NAMESPACE}:recently_played`,
  DOWNLOAD_METADATA: `${STORAGE_NAMESPACE}:download_metadata`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];