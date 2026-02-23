describe('rateLimitTracker', () => {
  let tracker;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    tracker = require('../src/services/rateLimitTracker');
    tracker._reset();
  });

  afterEach(() => {
    tracker._reset();
    jest.useRealTimers();
  });

  test('initial state is not paused', () => {
    expect(tracker.shouldPause()).toBe(false);
    expect(tracker.getStatus()).toEqual({
      remaining: null,
      limit: null,
      resetAt: null,
      isPaused: false,
    });
  });

  test('update() parses rate limit headers', () => {
    tracker.update({
      'x-ratelimit-remaining': '4500',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
    });

    const status = tracker.getStatus();
    expect(status.remaining).toBe(4500);
    expect(status.limit).toBe(5000);
    expect(status.resetAt).toBe(1700000000);
    expect(status.isPaused).toBe(false);
  });

  test('update() pauses when remaining drops below threshold', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const resetAt = Math.floor(Date.now() / 1000) + 3600;

    tracker.update({
      'x-ratelimit-remaining': '50',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(resetAt),
    });

    expect(tracker.shouldPause()).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('rate limit low'));
    warnSpy.mockRestore();
  });

  test('update() does not pause when remaining is above threshold', () => {
    tracker.update({
      'x-ratelimit-remaining': '200',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': '1700000000',
    });

    expect(tracker.shouldPause()).toBe(false);
  });

  test('update() only logs once when already paused', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const resetAt = Math.floor(Date.now() / 1000) + 3600;
    const headers = {
      'x-ratelimit-remaining': '50',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(resetAt),
    };

    tracker.update(headers);
    tracker.update(headers);
    tracker.update(headers);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  test('auto-resumes after reset window', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const resetAt = Math.floor(Date.now() / 1000) + 60;

    tracker.update({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(resetAt),
    });

    expect(tracker.shouldPause()).toBe(true);

    // Advance past reset + 5s buffer
    jest.advanceTimersByTime(65 * 1000);

    expect(tracker.shouldPause()).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Resuming sync'));
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('resume() clears paused state', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const resetAt = Math.floor(Date.now() / 1000) + 3600;

    tracker.update({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(resetAt),
    });

    expect(tracker.shouldPause()).toBe(true);
    tracker.resume();
    expect(tracker.shouldPause()).toBe(false);
    expect(tracker.getStatus().remaining).toBeNull();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('update() handles missing headers gracefully', () => {
    expect(() => tracker.update(null)).not.toThrow();
    expect(() => tracker.update({})).not.toThrow();
    expect(tracker.getStatus().remaining).toBeNull();
  });

  test('_reset() clears all state', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    tracker.update({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
    });

    tracker._reset();
    expect(tracker.shouldPause()).toBe(false);
    expect(tracker.getStatus()).toEqual({
      remaining: null,
      limit: null,
      resetAt: null,
      isPaused: false,
    });
    warnSpy.mockRestore();
  });
});
