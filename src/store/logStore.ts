import { create } from 'zustand';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  tag: string;
  message: string;
  data?: any;
}

interface LogStore {
  entries: LogEntry[];
  addEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 500;

export const useLogStore = create<LogStore>((set) => ({
  entries: [],
  addEntry: (entry) => set((state) => {
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    const newEntries = [newEntry, ...state.entries];
    if (newEntries.length > MAX_LOGS) {
      newEntries.length = MAX_LOGS;
    }
    return { entries: newEntries };
  }),
  clearLogs: () => set({ entries: [] }),
}));
