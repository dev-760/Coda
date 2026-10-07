import { useToastStore, showToast } from '../../src/store/toastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.getState().hideToast();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets and clears a toast message', () => {
    showToast('Track added to playlist', 'success', 2000);

    const toast = useToastStore.getState().currentToast;
    expect(toast).not.toBeNull();
    expect(toast?.message).toBe('Track added to playlist');
    expect(toast?.type).toBe('success');

    // Advance timers
    jest.advanceTimersByTime(2000);
    expect(useToastStore.getState().currentToast).toBeNull();
  });

  it('hides toast immediately when hideToast is called', () => {
    showToast('Temporary alert', 'info');
    expect(useToastStore.getState().currentToast).not.toBeNull();

    useToastStore.getState().hideToast();
    expect(useToastStore.getState().currentToast).toBeNull();
  });

  it('replaces active toast when a new toast is shown', () => {
    showToast('First toast', 'info', 5000);
    expect(useToastStore.getState().currentToast?.message).toBe('First toast');

    showToast('Second toast', 'error', 3000);
    expect(useToastStore.getState().currentToast?.message).toBe('Second toast');
    expect(useToastStore.getState().currentToast?.type).toBe('error');
  });
});
