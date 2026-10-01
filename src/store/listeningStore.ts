import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../providers/types';
import { SUGGESTION_WEIGHTS } from '../services/suggestionWeights';

/** A play shorter than this counts as a skip, not a listen. */
export const SKIP_THRESHOLD_MS = 30_000;

const MAX_TRACK_STATS = 2000;
const MAX_HISTORY = 200;

export interface TrackStats {
  trackId: string;
  artist: string;
  album?: string;
  playCount: number;
  completedPlays: number;
  skips: number;
  lastPlayedAt: number;
}

interface ListeningState {
  stats: Record<string, TrackStats>;
  /** Most recent first. Drives the "played recently" penalty. */
  history: string[];
  autoQueueEnabled: boolean;
  /** Whether the user cleared listening data, so the UI can explain it. */
  clearedAt: number | null;

  recordPlay: (track: Track, positionMs: number) => void;
  setAutoQueueEnabled: (enabled: boolean) => void;
  clearListeningData: () => void;
  hasHistory: () => boolean;
  recentTrackIds: (limit: number) => string[];
  artistAffinity: (artist: string) => { score: number; lastPlayedAt: number };
  albumAffinity: (album: string) => { score: number; lastPlayedAt: number };
}

function blankStats(track: Track): TrackStats {
  return {
    trackId: track.id,
    artist: track.artist,
    album: track.album,
    playCount: 0,
    completedPlays: 0,
    skips: 0,
    lastPlayedAt: 0,
  };
}

function capStats(stats: Record<string, TrackStats>): Record<string, TrackStats> {
  const entries = Object.values(stats);
  if (entries.length <= MAX_TRACK_STATS) return stats;
  entries.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  return Object.fromEntries(entries.slice(0, MAX_TRACK_STATS).map((s) => [s.trackId, s]));
}

/** Weighted average of an affinity, decayed by how long ago it was played. */
function affinityScore(
  stats: Record<string, TrackStats>,
  key: 'artist' | 'album',
  value: string,
  halfLifeDays: number,
  minMultiplier: number,
): { score: number; lastPlayedAt: number } {
  const now = Date.now();
  let score = 0;
  let lastPlayedAt = 0;

  for (const entry of Object.values(stats)) {
    if (!entry[key] || entry[key] !== value) continue;
    const ageDays = (now - entry.lastPlayedAt) / 86_400_000;
    const multiplier = Math.max(
      minMultiplier,
      Math.pow(0.5, ageDays / halfLifeDays),
    );
    const weight = entry.completedPlays > 0 ? entry.completedPlays : entry.playCount * 0.25;
    score += weight * multiplier;
    lastPlayedAt = Math.max(lastPlayedAt, entry.lastPlayedAt);
  }

  return { score, lastPlayedAt };
}

export const useListeningStore = create<ListeningState>()(
  persist(
    (set, get) => ({
      stats: {},
      history: [],
      autoQueueEnabled: false,
      clearedAt: null,

      recordPlay: (track, positionMs) => {
        if (!track) return;
        const now = Date.now();
        const isSkip = positionMs < SKIP_THRESHOLD_MS;

        set((state) => {
          const previous = state.stats[track.id] ?? blankStats(track);
          const next: TrackStats = {
            ...previous,
            trackId: track.id,
            artist: track.artist,
            album: track.album ?? previous.album,
            playCount: previous.playCount + 1,
            completedPlays: previous.completedPlays + (isSkip ? 0 : 1),
            skips: previous.skips + (isSkip ? 1 : 0),
            lastPlayedAt: now,
          };

          return {
            stats: capStats({ ...state.stats, [track.id]: next }),
            history: [track.id, ...state.history.filter((id) => id !== track.id)].slice(0, MAX_HISTORY),
          };
        });
      },

      setAutoQueueEnabled: (autoQueueEnabled) => set({ autoQueueEnabled }),

      clearListeningData: () =>
        set({ stats: {}, history: [], clearedAt: Date.now() }),

      hasHistory: () => Object.keys(get().stats).length > 0,

      recentTrackIds: (limit) => get().history.slice(0, limit),

      artistAffinity: (artist) =>
        affinityScore(
          get().stats,
          'artist',
          artist,
          SUGGESTION_WEIGHTS.recencyHalfLifeDays,
          SUGGESTION_WEIGHTS.minRecencyMultiplier,
        ),

      albumAffinity: (album) =>
        affinityScore(
          get().stats,
          'album',
          album,
          SUGGESTION_WEIGHTS.recencyHalfLifeDays,
          SUGGESTION_WEIGHTS.minRecencyMultiplier,
        ),
    }),
    {
      name: 'luma-listening-data',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Records a completed play. Kept separate so the queue stays pure. */
export function recordCompletedPlay(track: Track | null, positionMs: number): void {
  if (!track) return;
  useListeningStore.getState().recordPlay(track, positionMs);
}
