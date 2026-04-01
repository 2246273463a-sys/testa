import { getAnalyticsQueue, trackEvent } from './analytics';

describe('analytics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores events in a bounded queue', () => {
    for (let i = 0; i < 520; i += 1) {
      trackEvent('evt', { i });
    }
    const q = getAnalyticsQueue();
    expect(Array.isArray(q)).toBe(true);
    expect(q.length).toBeLessThanOrEqual(500);
    expect(q[q.length - 1].props.i).toBe(519);
  });
});

