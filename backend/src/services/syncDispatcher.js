const cron = require('node-cron');
const config = require('../config');
const { syncRepoRuns, syncActiveRun } = require('./syncService');

// Set of active (in-flight) runs: { id, owner, repo }
const activeRuns = new Map();
let discoveryTimer = null;
let activeTimer = null;
let isSyncing = false;

async function runDiscovery() {
  if (isSyncing) return;
  if (!config.githubAccessToken && !config.isOAuth2Enabled) {
    return; // No token available for background sync
  }

  isSyncing = true;
  const token = config.githubAccessToken;

  try {
    for (const repo of config.repos) {
      const newActive = await syncRepoRuns(repo.owner, repo.name, token);
      for (const run of newActive) {
        const key = `${run.owner}/${run.repo}/${run.id}`;
        if (!activeRuns.has(key)) {
          activeRuns.set(key, run);
        }
      }
    }
    console.log(
      `Discovery sync complete. ${activeRuns.size} active run(s) tracked.`
    );
  } catch (err) {
    console.error('Discovery sync error:', err.message);
  } finally {
    isSyncing = false;
  }
}

async function pollActiveRuns() {
  if (activeRuns.size === 0) return;
  const token = config.githubAccessToken;

  const entries = Array.from(activeRuns.entries());
  for (const [key, run] of entries) {
    try {
      const isCompleted = await syncActiveRun(run.owner, run.repo, run.id, token);
      if (isCompleted) {
        activeRuns.delete(key);
      }
    } catch (err) {
      console.error(`Active poll error for ${key}: ${err.message}`);
    }
  }
}

function start() {
  if (config.repos.length === 0) {
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
  activeRuns.clear();
}

module.exports = { start, stop };
