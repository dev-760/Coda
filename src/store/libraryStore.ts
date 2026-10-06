import { create } from 'zustand';

import { Track } from '../providers/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../storage/StorageKeys';
import { colors } from '../theme/theme';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  artwork?: string;
  coverUrl?: string;
  isPublic?: boolean;
  tags?: string[];
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  playCount?: number;
  lastPlayedAt?: number;
}

export interface PlaylistTrack {
  track: Track;
  addedAt: number;
  addedBy?: string;
}

interface LibraryState {
  favorites: Track[];
  playlists: Playlist[];
  recentlyPlayed: Track[];
  searchHistory: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  
  loadFavorites: () => Promise<void>;
  addFavorite: (track: Track) => Promise<void>;
  removeFavorite: (trackId: string) => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  
  loadPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string, color?: string, icon?: string) => Promise<Playlist>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  getPlaylistById: (id: string) => Playlist | null;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderPlaylistTracks: (playlistId: string, trackIds: string[]) => Promise<void>;
  duplicatePlaylist: (playlistId: string) => Promise<Playlist>;
  setPlaylistCover: (playlistId: string, coverUrl: string) => Promise<void>;
  incrementPlaylistPlayCount: (playlistId: string) => Promise<void>;
  updatePlaylistLastPlayed: (playlistId: string) => Promise<void>;
  
  loadRecentlyPlayed: () => Promise<void>;
  addToRecentlyPlayed: (track: Track) => Promise<void>;
  clearRecentlyPlayed: () => Promise<void>;
  
  loadSearchHistory: () => Promise<void>;
  addToSearchHistory: (query: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  removeFromSearchHistory: (query: string) => Promise<void>;
  
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  (set, get) => ({
    favorites: [],
    playlists: [],
    recentlyPlayed: [],
    searchHistory: [],
    isLoading: false,
    error: null,

      initialize: async () => {
        set({ isLoading: true, error: null });
        try {
          await Promise.all([
            get().loadFavorites(),
            get().loadPlaylists(),
            get().loadRecentlyPlayed(),
            get().loadSearchHistory(),
          ]);
          set({ isLoading: false });
        } catch (error) {
          set({ error: 'Failed to initialize library', isLoading: false });
          throw error;
        }
      },

      loadFavorites: async () => {
        try {
          let data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
          if (!data) {
            const legacy = await AsyncStorage.getItem('luma:favorites');
            if (legacy) {
              await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, legacy);
              data = legacy;
            }
          }
          const favorites = data ? JSON.parse(data) : [];
          set({ favorites });
        } catch {
          set({ error: 'Failed to load favorites' });
          const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
          const favorites = data ? JSON.parse(data) : [];
          set({ favorites });
        }
      },

      addFavorite: async (track) => {
        try {
          const { favorites } = get();
          if (!favorites.some(f => f.id === track.id)) {
            const newFavorites = [...favorites, track];
            set({ favorites: newFavorites }); // Optimistic update
            
            await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
          }
        } catch (error) {
          set({ error: 'Failed to add favorite' });
          // Revert on error
          get().loadFavorites();
          throw error;
        }
      },

      removeFavorite: async (trackId) => {
        try {
          const { favorites } = get();
          const newFavorites = favorites.filter(f => f.id !== trackId);
          set({ favorites: newFavorites }); // Optimistic
          
          await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
        } catch (error) {
          set({ error: 'Failed to remove favorite' });
          get().loadFavorites();
          throw error;
        }
      },

      isFavorite: (trackId) => {
        const { favorites } = get();
        return favorites.some(f => f.id === trackId);
      },

      loadPlaylists: async () => {
        try {
          let data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
          if (!data) {
            const legacy = await AsyncStorage.getItem('luma:playlists');
            if (legacy) {
              await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, legacy);
              data = legacy;
            }
          }
          const playlists = data ? JSON.parse(data) : [];
          set({ playlists });
        } catch {
          set({ error: 'Failed to load playlists' });
        }
      },

      createPlaylist: async (name, description, color, icon) => {
        try {
          const newPlaylist: Playlist = {
            id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            description: description?.trim(),
            tracks: [],
            isPublic: false,
            tags: [],
            // Falls back to Coda Steel so an unnamed playlist still matches the palette.
color: color || colors.primary,
            icon: icon || 'musical-notes',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            playCount: 0,
          };

          const { playlists } = get();
          const newPlaylists = [...playlists, newPlaylist];
          
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
          
          return newPlaylist;
        } catch (error) {
          set({ error: 'Failed to create playlist' });
          throw error;
        }
      },

      updatePlaylist: async (id, updates) => {
        try {
          const { playlists } = get();
          const playlistIndex = playlists.findIndex(p => p.id === id);
          
          if (playlistIndex === -1) {
            throw new Error('Playlist not found');
          }

          const updatedPlaylist: Playlist = {
            ...playlists[playlistIndex],
            ...updates,
            updatedAt: Date.now(),
          };

          const newPlaylists = [...playlists];
          newPlaylists[playlistIndex] = updatedPlaylist;
          
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
        } catch (error) {
          set({ error: 'Failed to update playlist' });
          throw error;
        }
      },

      deletePlaylist: async (id) => {
        try {
          const { playlists } = get();
          const newPlaylists = playlists.filter(p => p.id !== id);
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
        } catch (error) {
          set({ error: 'Failed to delete playlist' });
          throw error;
        }
      },

      getPlaylistById: (id) => {
        const { playlists } = get();
        return playlists.find(p => p.id === id) || null;
      },

      addTrackToPlaylist: async (playlistId, track) => {
        try {
          const { playlists } = get();
          const playlistIndex = playlists.findIndex(p => p.id === playlistId);
          
          if (playlistIndex === -1) {
            throw new Error('Playlist not found');
          }

          // Check if track already exists in playlist
          if (playlists[playlistIndex].tracks.some(t => t.id === track.id)) {
            throw new Error('Track already in playlist');
          }

          const updatedPlaylist: Playlist = {
            ...playlists[playlistIndex],
            tracks: [...playlists[playlistIndex].tracks, track],
            updatedAt: Date.now(),
          };

          const newPlaylists = [...playlists];
          newPlaylists[playlistIndex] = updatedPlaylist;
          
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
        } catch (error) {
          set({ error: 'Failed to add track to playlist' });
          throw error;
        }
      },

      removeTrackFromPlaylist: async (playlistId, trackId) => {
        try {
          const { playlists } = get();
          const playlistIndex = playlists.findIndex(p => p.id === playlistId);
          
          if (playlistIndex === -1) {
            throw new Error('Playlist not found');
          }

          const updatedPlaylist: Playlist = {
            ...playlists[playlistIndex],
            tracks: playlists[playlistIndex].tracks.filter(t => t.id !== trackId),
            updatedAt: Date.now(),
          };

          const newPlaylists = [...playlists];
          newPlaylists[playlistIndex] = updatedPlaylist;
          
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
        } catch (error) {
          set({ error: 'Failed to remove track from playlist' });
          throw error;
        }
      },

      reorderPlaylistTracks: async (playlistId, trackIds) => {
        try {
          const { playlists } = get();
          const playlistIndex = playlists.findIndex(p => p.id === playlistId);
          
          if (playlistIndex === -1) {
            throw new Error('Playlist not found');
          }

          const playlist = playlists[playlistIndex];
          const trackMap = new Map(playlist.tracks.map(t => [t.id, t]));
          const reorderedTracks: Track[] = [];
          trackIds.forEach(id => {
            const track = trackMap.get(id);
            if (track) {
              reorderedTracks.push(track);
            }
          });

          const updatedPlaylist: Playlist = {
            ...playlist,
            tracks: reorderedTracks,
            updatedAt: Date.now(),
          };

          const newPlaylists = [...playlists];
          newPlaylists[playlistIndex] = updatedPlaylist;
          
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
        } catch (error) {
          set({ error: 'Failed to reorder playlist tracks' });
          throw error;
        }
      },

      duplicatePlaylist: async (playlistId) => {
        try {
          const { playlists } = get();
          const originalPlaylist = playlists.find(p => p.id === playlistId);
          
          if (!originalPlaylist) {
            throw new Error('Playlist not found');
          }

          const duplicatedPlaylist: Playlist = {
            ...originalPlaylist,
            id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `${originalPlaylist.name} (Copy)`,
            tracks: [...originalPlaylist.tracks],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            playCount: 0,
          };

          const newPlaylists = [...playlists, duplicatedPlaylist];
          
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
          
          return duplicatedPlaylist;
        } catch (error) {
          set({ error: 'Failed to duplicate playlist' });
          throw error;
        }
      },

      setPlaylistCover: async (playlistId, coverUrl) => {
        try {
          await get().updatePlaylist(playlistId, { coverUrl });
        } catch (error) {
          set({ error: 'Failed to set playlist cover' });
          throw error;
        }
      },

      incrementPlaylistPlayCount: async (playlistId) => {
        try {
          const { playlists } = get();
          const playlistIndex = playlists.findIndex(p => p.id === playlistId);
          
          if (playlistIndex === -1) {
            throw new Error('Playlist not found');
          }

          const updatedPlaylist: Playlist = {
            ...playlists[playlistIndex],
            playCount: (playlists[playlistIndex].playCount || 0) + 1,
            lastPlayedAt: Date.now(),
          };

          const newPlaylists = [...playlists];
          newPlaylists[playlistIndex] = updatedPlaylist;
          
          await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(newPlaylists));
          set({ playlists: newPlaylists });
        } catch (error) {
          set({ error: 'Failed to increment play count' });
          throw error;
        }
      },

      updatePlaylistLastPlayed: async (playlistId) => {
        try {
          await get().updatePlaylist(playlistId, { lastPlayedAt: Date.now() });
        } catch (error) {
          set({ error: 'Failed to update last played time' });
          throw error;
        }
      },

      loadRecentlyPlayed: async () => {
        try {
          let data = await AsyncStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
          if (!data) {
            const legacy = await AsyncStorage.getItem('luma:recently_played');
            if (legacy) {
              await AsyncStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, legacy);
              data = legacy;
            }
          }
          const recentlyPlayed = data ? JSON.parse(data) : [];
          set({ recentlyPlayed });
        } catch {
          set({ error: 'Failed to load recently played' });
        }
      },

      addToRecentlyPlayed: async (track) => {
        try {
          const { recentlyPlayed } = get();
          const newRecentlyPlayed = [track, ...recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 50);
          await AsyncStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(newRecentlyPlayed));
          set({ recentlyPlayed: newRecentlyPlayed });
        } catch (error) {
          set({ error: 'Failed to add to recently played' });
          throw error;
        }
      },

      clearRecentlyPlayed: async () => {
        try {
          await AsyncStorage.removeItem(STORAGE_KEYS.RECENTLY_PLAYED);
          set({ recentlyPlayed: [] });
        } catch (error) {
          set({ error: 'Failed to clear recently played' });
          throw error;
        }
      },

      loadSearchHistory: async () => {
        try {
          const data = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
          const searchHistory = data ? JSON.parse(data) : [];
          set({ searchHistory });
        } catch {
          set({ error: 'Failed to load search history' });
        }
      },

      addToSearchHistory: async (query) => {
        try {
          const { searchHistory } = get();
          const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 20);
          await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(newHistory));
          set({ searchHistory: newHistory });
        } catch (error) {
          set({ error: 'Failed to add to search history' });
          throw error;
        }
      },

      clearSearchHistory: async () => {
        try {
          await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
          set({ searchHistory: [] });
        } catch (error) {
          set({ error: 'Failed to clear search history' });
          throw error;
        }
      },

      removeFromSearchHistory: async (query) => {
        try {
          const newHistory = get().searchHistory.filter((q) => q !== query);
          await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(newHistory));
          set({ searchHistory: newHistory });
        } catch (error) {
          set({ error: 'Failed to remove from search history' });
          throw error;
        }
      },

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    })
);
