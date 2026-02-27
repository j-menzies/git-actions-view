const config = require('../config');
const { syncRepoRuns, syncActiveRun } = require('./syncService');
const reposService = require('./reposService');
const { broadcast } = require('./sseManager');
const rateLimitTracker = require('./rateLimitTracker');

// Set of active (in-flight) runs: { id, owner, repo, trackedSince }
const activeRuns = new Map();
let discoveryTimer = null;
let activeTimer = null;
let isSyncing = false;
const MAX_ACTIVE_TRACKING_MS = 30 * 60 * 1000; // 30 minutes

let lastDiscoveryPollTime = null;
let lastActivePollTime = null;
let prevActiveCount = 0;

async function runDiscovery() {
  if (isSyncing) return;
  if (rateLimitTracker.shouldPause()) {
    const status = rateLimitTracker.getStatus();
    const resetDate = status.resetAt ? new Date(status.resetAt * 1000).toISOString() : 'unknown';
    console.log(`Discovery skipped — rate limited (${status.remaining}/${status.limit}). Resumes at ${resetDate}`);
    broadcast('sync:rateLimited', { paused: true, ...status });
    return;
  }
  if (!config.githubAccessToken && !config.isOAuth2Enabled) {
    return; // No token available for background sync
  }

  isSyncing = true;
  const token = config.githubAccessToken;

  try {
    const repos = reposService.getVisibleRepos();
    let successCount = 0;
    let failCount = 0;

    for (const repo of repos) {
      const repoFullName = `${repo.owner}/${repo.name}`;
      broadcast('sync:start', { repo: repoFullName, type: 'discovery' });
      const newActive = await syncRepoRuns(repo.owner, repo.name, token);
      broadcast('sync:complete', { repo: repoFullName, type: 'discovery' });

      if (newActive === null) {
        failCount++;
        continue;
      }

      successCount++;
      for (const run of newActive) {
        const key = `${run.owner}/${run.repo}/${run.id}`;
        if (!activeRuns.has(key)) {
          activeRuns.set(key, { ...run, trackedSince: Date.now() });
        }
      }
    }

    const currentActive = activeRuns.size;
    if (failCount > 0) {
      console.warn(
        `Discovery sync: ${successCount}/${repos.length} repo(s) succeeded, ${failCount} failed. ${currentActive} active run(s) tracked.`
      );
    } else {
      console.log(
        `Discovery sync complete for ${repos.length} repo(s). ${currentActive} active run(s) tracked.`
      );
    }
    prevActiveCount = currentActive;

    // Only update last sync time if at least one repo succeeded
    if (successCount > 0) {
      lastDiscoveryPollTime = new Date().toISOString();
      broadcast('sync:poll', { lastPollTime: lastDiscoveryPollTime, type: 'discovery', repoCount: repos.length });
    }
  } catch (err) {
    console.error('Discovery sync error:', err.message);
  } finally {
    isSyncing = false;
  }
}

async function pollActiveRuns() {
  if (activeRuns.size === 0) return;
  if (rateLimitTracker.shouldPause()) return;
  const token = config.githubAccessToken;

  const entries = Array.from(activeRuns.entries());
  for (const [key, run] of entries) {
    try {
      const repoFullName = `${run.owner}/${run.repo}`;
      broadcast('sync:start', { repo: repoFullName, type: 'active' });
      const isCompleted = await syncActiveRun(run.owner, run.repo, run.id, token);
      broadcast('sync:complete', { repo: repoFullName, type: 'active' });
      const isStale = Date.now() - run.trackedSince > MAX_ACTIVE_TRACKING_MS;
      if (isCompleted || isStale) {
        if (isStale && !isCompleted) {
          console.warn(`Active run ${key} timed out after 30 minutes, removing from tracking.`);
        }
        activeRuns.delete(key);
      }
    } catch (err) {
      console.error(`Active poll error for ${key}: ${err.message}`);
    }
  }
  lastActivePollTime = new Date().toISOString();
  broadcast('sync:poll', { lastPollTime: lastActivePollTime, type: 'active' });
}

function start() {
  const repos = reposService.getVisibleRepos();
  if (repos.length === 0) {
    console.warn('No repositories configured. Sync dispatcher not started.');
    return;
  }

  // Run initial discovery immediately
  runDiscovery();

  // Schedule discovery poll
  const discoverySecs = config.discoveryPollSeconds;
  discoveryTimer = setInterval(runDiscovery, discoverySecs * 1000);
  console.log(`Discovery poll scheduled every ${discoverySecs}s`);

  // Schedule active run poll
  const activeSecs = config.activePollSeconds;
  activeTimer = setInterval(pollActiveRuns, activeSecs * 1000);
  console.log(`Active run poll scheduled every ${activeSecs}s`);
}

function stop() {
  if (discoveryTimer) clearInterval(discoveryTimer);
  if (activeTimer) clearInterval(activeTimer);
  discoveryTimer = null;
  activeTimer = null;
  activeRuns.clear();
}

/**
 * Restart the dispatcher (e.g. after polling interval changes).
 */
function restart() {
  stop();
  start();
}

/**
 * Run a one-time sync for a single repo (e.g. after adding a new repo).
 * @param {string} owner
 * @param {string} name
 */
async function syncSingleRepo(owner, name) {
  if (rateLimitTracker.shouldPause()) {
    console.warn(`Single repo sync skipped for ${owner}/${name} — rate limited`);
    return;
  }
  if (!config.githubAccessToken && !config.isOAuth2Enabled) {
    return;
  }
  const token = config.githubAccessToken;
  const repoFullName = `${owner}/${name}`;
  try {
    broadcast('sync:start', { repo: repoFullName, type: 'single' });
    const newActive = await syncRepoRuns(owner, name, token);
    broadcast('sync:complete', { repo: repoFullName, type: 'single' });
    for (const run of newActive) {
      const key = `${run.owner}/${run.repo}/${run.id}`;
      if (!activeRuns.has(key)) {
        activeRuns.set(key, { ...run, trackedSince: Date.now() });
      }
    }
    console.log(`Single repo sync complete for ${owner}/${name}`);
  } catch (err) {
    broadcast('sync:complete', { repo: repoFullName, type: 'single' });
    console.error(`Single repo sync error for ${owner}/${name}: ${err.message}`);
  }
}

function getLastPollTimes() {
  return { discovery: lastDiscoveryPollTime, active: lastActivePollTime, rateLimit: rateLimitTracker.getStatus() };
}

module.exports = { start, stop, restart, syncSingleRepo, getLastPollTimes };
