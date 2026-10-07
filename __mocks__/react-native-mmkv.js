// Mock MMKV for Jest tests
const mockStorage = new Map();

class MockMMKV {
  constructor(config) {
    // Config is ignored in mock
  }

  set(key, value) {
    mockStorage.set(key, value);
  }

  getString(key) {
    return mockStorage.get(key);
  }

  delete(key) {
    mockStorage.delete(key);
  }

  clearAll() {
    mockStorage.clear();
  }
}

const mockModule = MockMMKV;
mockModule.MMKV = MockMMKV;

module.exports = mockModule;
module.exports.default = mockModule;

// Reset mock storage between tests
beforeEach(() => {
  mockStorage.clear();
});
