import { create } from 'zustand';
import { Track, StreamInfo } from '../providers/types';

interface PlaybackState {
  // Current playback
  currentTrack: Track | null;
  streamInfo: StreamInfo | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  positionMs: number;
  durationMs: number;
  
  // Actions
  setCurrentTrack: (track: Track | null) => void;
  setStreamInfo: (stream: StreamInfo | null) => void;
  setPlaying: (playing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (position: number, duration: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentTrack: null,
  streamInfo: null,
  isPlaying: false,
  isLoading: false,
  error: null,
  positionMs: 0,
  durationMs: 0,
  
  setCurrentTrack: (track) => set({ currentTrack: track, positionMs: 0 }),
  setStreamInfo: (streamInfo) => set({ streamInfo }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setProgress: (positionMs, durationMs) => set({ positionMs, durationMs }),
}));
