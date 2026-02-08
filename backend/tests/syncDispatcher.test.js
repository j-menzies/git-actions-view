jest.mock('../src/services/syncService');

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
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No repositories'));
    consoleSpy.mockRestore();
    dispatcher.stop();
  });

  test('start() calls syncRepoRuns immediately', () => {
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
    const syncService = require('../src/services/syncService');
    syncService.syncRepoRuns.mockResolvedValue([]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const dispatcher = require('../src/services/syncDispatcher');
    dispatcher.start();

    expect(syncService.syncRepoRuns).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    dispatcher.stop();
  });
});
