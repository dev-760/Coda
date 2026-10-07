import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
}

interface ToastState {
  currentToast: ToastMessage | null;
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  hideToast: () => void;
}

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  currentToast: null,
  showToast: (message, type = 'info', durationMs = 2500) => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    const toast: ToastMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      message,
      type,
      durationMs,
    };

    set({ currentToast: toast });

    dismissTimer = setTimeout(() => {
      set({ currentToast: null });
      dismissTimer = null;
    }, durationMs);
  },
  hideToast: () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    set({ currentToast: null });
  },
}));

export const showToast = (
  message: string,
  type?: ToastType,
  durationMs?: number,
): void => {
  useToastStore.getState().showToast(message, type, durationMs);
};
