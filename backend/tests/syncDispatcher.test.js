jest.mock('../src/services/syncService');
jest.mock('../src/services/reposService');
jest.mock('../src/services/rateLimitTracker');

describe('syncDispatcher', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    process.env.GITHUB_ACCESS_TOKEN = 'test-token';
    process.env.GITHUB_REPOS = 'org/repo';
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  test('start() logs warning if no repos configured', () => {
    process.env.GITHUB_REPOS = '';
    delete process.env.REPO_OWNER_NAME;
    delete process.env.REPO_NAMES;
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([]);

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No repositories'));
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('start() calls syncRepoRuns immediately', () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();

    expect(syncService.syncRepoRuns).toHaveBeenCalledWith('org', 'repo', 'test-token');
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('start() logs correct poll intervals', () => {
    process.env.DISCOVERY_POLL_SECONDS = '45';
    process.env.ACTIVE_POLL_SECONDS = '15';
    jest.resetModules();
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();

    const logMessages = consoleSpy.mock.calls.map(c => c[0]);
    expect(logMessages.some(m => m.includes('45s'))).toBe(true);
    expect(logMessages.some(m => m.includes('15s'))).toBe(true);
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('stop() does not throw', () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();
    expect(() => dispatcher.stop()).not.toThrow();
    consoleSpy.mockRestore();
  });

  test('does not run discovery when no token and no OAuth', () => {
    delete process.env.GITHUB_ACCESS_TOKEN;
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    jest.resetModules();
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();

    expect(syncService.syncRepoRuns).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('restart() stops and starts again', () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();
    expect(() => dispatcher.restart()).not.toThrow();
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('pollActiveRuns removes stale runs after 30 minutes', async () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    // Return one active run from discovery
    syncService.syncRepoRuns.mockResolvedValue([{ id: 100, owner: 'org', repo: 'repo' }]);
    // syncActiveRun always returns false (never completes)
    syncService.syncActiveRun.mockResolvedValue(false);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();

    // Wait for discovery to complete
    await Promise.resolve();
    await Promise.resolve();

    // Advance time past the 30 minute timeout
    jest.advanceTimersByTime(31 * 60 * 1000);

    // The active poller should have run and removed the stale run
    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('timed out after 30 minutes'));
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    dispatcher.stop();
  });

  test('syncSingleRepo() calls syncRepoRuns for a specific repo', async () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    await dispatcher.syncSingleRepo('new-org', 'new-repo');

    expect(syncService.syncRepoRuns).toHaveBeenCalledWith('new-org', 'new-repo', 'test-token');
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('discovery skips when rate limited', () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(true);
    rateLimitTracker.getStatus.mockReturnValue({
      remaining: 10, limit: 5000, resetAt: 1700000000, isPaused: true,
    });
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();

    expect(syncService.syncRepoRuns).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('rate limited'));
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('syncSingleRepo skips when rate limited', async () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(true);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    await dispatcher.syncSingleRepo('org', 'repo');

    expect(syncService.syncRepoRuns).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('rate limited'));
    warnSpy.mockRestore();
    dispatcher.stop();
  });

  test('getLastPollTimes includes rateLimit status', () => {
    const rateLimitTracker = require('../src/services/rateLimitTracker');
    rateLimitTracker.shouldPause.mockReturnValue(false);
    rateLimitTracker.getStatus.mockReturnValue({
      remaining: 4500, limit: 5000, resetAt: 1700000000, isPaused: false,
    });
    const reposService = require('../src/services/reposService');
    reposService.getVisibleRepos.mockReturnValue([{ owner: 'org', name: 'repo' }]);
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();

    const pollTimes = dispatcher.getLastPollTimes();
    expect(pollTimes.rateLimit).toEqual({
      remaining: 4500, limit: 5000, resetAt: 1700000000, isPaused: false,
    });
    consoleSpy.mockRestore();
    dispatcher.stop();
  });
});
