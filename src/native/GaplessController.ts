import { PlaybackEngine } from './PlaybackEngine';

export class GaplessPlaybackController {
  private engine = PlaybackEngine;
  private preloadQueue: string[] = [];

  async enableGapless(): Promise<void> {
    await this.engine.init();
  }

  async preloadNext(trackUrl: string): Promise<void> {
    this.preloadQueue.push(trackUrl);
    await this.engine.preload(trackUrl);
  }

  async playWithGapless(trackUrl: string, trackId: string): Promise<void> {
    await this.engine.play(trackUrl, trackId);
  }
}
