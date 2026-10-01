import { MusicProvider } from './types';
import { hifiApiProvider } from './HifiApiProvider';

const providers: Record<string, MusicProvider> = {
  'hifi-api': hifiApiProvider,
};

/**
 * The registry exists so another catalog can be added later, but there is only
 * one entry today and no runtime selection yet.
 */
export function getActiveProvider(): MusicProvider {
  return providers['hifi-api'];
}

export function getProvider(id: string): MusicProvider | undefined {
  return providers[id];
}