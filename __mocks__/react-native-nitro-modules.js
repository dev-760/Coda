// Mock react-native-nitro-modules for Jest tests
class MockNitroModules {
  static createModule(spec) {
    return {};
  }

  static createHybridObject(specName) {
    // Return a mock implementation for PlaybackEngine
    return {
      init: jest.fn(async () => undefined),
      play: jest.fn(async () => undefined),
      pause: jest.fn(async () => undefined),
      resume: jest.fn(async () => undefined),
      seekTo: jest.fn(async () => undefined),
      getPosition: jest.fn(async () => 0),
      getDuration: jest.fn(async () => 0),
      setVolume: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
      preload: jest.fn(async () => undefined),
      dispose: jest.fn(async () => undefined),
      setPlaybackRate: jest.fn(async () => undefined),
      hasLoadedTrack: jest.fn(() => false),
      events: {
        onProgress: null,
        onTrackEnded: null,
        onPauseRequested: null,
        onPlayingChanged: null,
        onError: null,
        onNext: null,
        onPrevious: null,
      },
    };
  }
}

class MockNativeNitroModules {
  static register(spec) {
    // Do nothing in mock
  }
}

const mockModule = {
  NitroModules: MockNitroModules,
  NativeNitroModules: MockNativeNitroModules,
  default: {
    NitroModules: MockNitroModules,
    NativeNitroModules: MockNativeNitroModules,
  },
};

module.exports = mockModule;
