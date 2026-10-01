import * as Network from 'expo-network';

type Listener = (isOnline: boolean) => void;

let currentState: boolean | null = null;
const listeners = new Set<Listener>();
let subscription: { remove(): void } | null = null;

function publish(isOnline: boolean): void {
  if (currentState === isOnline) return;
  currentState = isOnline;
  for (const listener of listeners) listener(isOnline);
}

export function isOnline(): boolean {
  // Unknown until the first check is treated as online so the app is usable
  // on a first launch before the network query resolves.
  return currentState !== false;
}

export async function refreshConnectivity(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    publish(state.isInternetReachable !== false);
  } catch {
    publish(true);
  }
  return isOnline();
}

export function subscribeToConnectivity(listener: Listener): () => void {
  listeners.add(listener);
  void refreshConnectivity();

  if (!subscription) {
    subscription = Network.addNetworkStateListener((state) => {
      publish(state.isInternetReachable !== false);
    }) as unknown as { remove(): void };
  }

  return () => {
    listeners.delete(listener);
  };
}

export function startConnectivityMonitoring(): () => void {
  void refreshConnectivity();
  return subscribeToConnectivity(() => {
    // Listeners do the reacting; this keeps the state fresh for everyone.
  });
}