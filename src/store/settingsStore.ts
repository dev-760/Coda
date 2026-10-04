import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioQuality } from '../config/hifiApi';

export interface AudioSettings {
  /** 0.5 to 2.0. expo-audio pitch corrects to the original key. */
  playbackSpeed: number;
  sleepTimerEnabled: boolean;
  /** Minutes, or 'end' to stop after the current track finishes. */
  sleepTimerDuration: number | 'end';
  /** Quality requested from the HiFi API when resolving a stream. */
  hifiAudioQuality: AudioQuality;
}

export type DownloadQuality = 'LOSSLESS' | 'HIGH' | 'LOW';

export interface AppSettings {
  verboseLogging: boolean;
  audio: AudioSettings;
  downloadQuality: DownloadQuality;
  /** When true, downloads wait for Wi-Fi instead of using mobile data. */
  downloadWifiOnly: boolean;
  /**
   * When true, playback is restricted to downloaded music. The Collection
   * screen exposes this, so it is stored rather than derived from connectivity:
   * being offline is not the same as asking to stay offline.
   */
  offlineMode: boolean;
}

interface SettingsState extends AppSettings {
  hasHydrated: boolean;
  setHydrated: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setVerboseLogging: (value: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSleepTimerEnabled: (enabled: boolean) => void;
  setSleepTimerDuration: (duration: number | 'end') => void;
  setHifiAudioQuality: (quality: AudioQuality) => void;
  setDownloadQuality: (quality: DownloadQuality) => void;
  setDownloadWifiOnly: (value: boolean) => void;
  setOfflineMode: (value: boolean) => void;
  initialize: () => Promise<void>;
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  playbackSpeed: 1.0,
  sleepTimerEnabled: false,
  sleepTimerDuration: 30,
  hifiAudioQuality: 'LOSSLESS',
};

const DEFAULT_SETTINGS: AppSettings = {
  verboseLogging: false,
  audio: DEFAULT_AUDIO_SETTINGS,
  downloadQuality: 'LOSSLESS',
  downloadWifiOnly: true,
  offlineMode: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hasHydrated: false,
      setHydrated: () => set({ hasHydrated: true }),
      updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
      setVerboseLogging: (verboseLogging) => set({ verboseLogging }),
      setPlaybackSpeed: (playbackSpeed) => set((state) => ({
        audio: { ...state.audio, playbackSpeed }
      })),
      setSleepTimerEnabled: (sleepTimerEnabled) => set((state) => ({
        audio: { ...state.audio, sleepTimerEnabled }
      })),
      setSleepTimerDuration: (sleepTimerDuration) => set((state) => ({
        audio: { ...state.audio, sleepTimerDuration }
      })),
      setHifiAudioQuality: (hifiAudioQuality) => set((state) => ({
        audio: { ...state.audio, hifiAudioQuality }
      })),
      setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
      setDownloadWifiOnly: (downloadWifiOnly) => set({ downloadWifiOnly }),
      setOfflineMode: (offlineMode) => set({ offlineMode }),
      initialize: async () => {
        set({ hasHydrated: true });
      },
    }),
    {
      name: 'luma-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return DEFAULT_SETTINGS;
        if (version === 0) {
          // Normalize legacy values
          return {
            ...DEFAULT_SETTINGS,
            ...persistedState,
            audio: {
              ...DEFAULT_AUDIO_SETTINGS,
              ...(persistedState.audio ?? {}),
              // Map legacy quality if invalid
              hifiAudioQuality:
                persistedState.audio?.hifiAudioQuality === 'HI_RES_LOSSLESS'
                  ? 'LOSSLESS'
                  : (persistedState.audio?.hifiAudioQuality ?? 'LOSSLESS'),
            },
          };
        }
        return persistedState as SettingsState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated();
        }
      },
    }
  )
);
