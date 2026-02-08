#!/usr/bin/env node
/**
 * Seed the GitActionsView database with realistic mock data for screenshots and demos.
 *
 * Usage:
 *   node backend/scripts/seed-mock-data.js
 *
 * This creates (or overwrites) the SQLite database at the configured DB_PATH
 * with sample workflows, runs, and jobs across multiple repos.
 */

const path = require('path');

// Allow override via env, default to project data dir
process.env.DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'gitactionsview.db');

const { getDb, closeDb } = require('../src/db/database');
const db = getDb();

// --- Helper ---
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isoDate(daysAgo, hoursAgo = 0, minutesAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.toISOString();
}

// --- Clear existing data ---
db.exec('DELETE FROM workflow_jobs');
db.exec('DELETE FROM workflow_runs');
db.exec('DELETE FROM workflows');

// --- Workflows ---
const workflows = [
  { id: 1, name: 'CI Build', owner: 'acme-corp', repo: 'web-app', path: '.github/workflows/ci.yml', state: 'active' },
  { id: 2, name: 'Deploy Production', owner: 'acme-corp', repo: 'web-app', path: '.github/workflows/deploy.yml', state: 'active' },
  { id: 3, name: 'Lint & Format', owner: 'acme-corp', repo: 'web-app', path: '.github/workflows/lint.yml', state: 'active' },
  { id: 4, name: 'CI', owner: 'acme-corp', repo: 'api-service', path: '.github/workflows/ci.yml', state: 'active' },
  { id: 5, name: 'Release', owner: 'acme-corp', repo: 'api-service', path: '.github/workflows/release.yml', state: 'active' },
  { id: 6, name: 'Nightly Tests', owner: 'acme-corp', repo: 'api-service', path: '.github/workflows/nightly.yml', state: 'active' },
  { id: 7, name: 'Build & Test', owner: 'open-source', repo: 'ui-toolkit', path: '.github/workflows/build.yml', state: 'active' },
  { id: 8, name: 'Publish NPM', owner: 'open-source', repo: 'ui-toolkit', path: '.github/workflows/publish.yml', state: 'active' },
];

const insertWorkflow = db.prepare(
  'INSERT INTO workflows (id, name, owner_name, repo_name, path, state) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const wf of workflows) {
  insertWorkflow.run(wf.id, wf.name, wf.owner, wf.repo, wf.path, wf.state);
}

// --- Runs ---
const actors = [
  { login: 'alice', avatar: 'https://avatars.githubusercontent.com/u/1?v=4' },
  { login: 'bob', avatar: 'https://avatars.githubusercontent.com/u/2?v=4' },
  { login: 'charlie', avatar: 'https://avatars.githubusercontent.com/u/3?v=4' },
  { login: 'diana', avatar: 'https://avatars.githubusercontent.com/u/4?v=4' },
  { login: 'dependabot[bot]', avatar: 'https://avatars.githubusercontent.com/in/29110?v=4' },
];

const branches = ['main', 'develop', 'feature/auth', 'fix/memory-leak', 'release/v2.0', 'dependabot/npm'];
const events = ['push', 'pull_request', 'schedule', 'workflow_dispatch'];

const insertRun = db.prepare(`
  INSERT INTO workflow_runs (id, workflow_id, owner_name, repo_name, workflow_name,
    run_number, status, conclusion, event, branch, actor_login, actor_avatar_url,
    html_url, created_at, updated_at, run_started_at, run_attempt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertJob = db.prepare(`
  INSERT INTO workflow_jobs (id, run_id, name, status, conclusion, started_at, completed_at,
    html_url, runner_name, run_attempt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let runId = 1000;
let jobId = 5000;

// Generate runs for each workflow
const runConfigs = [
  // Recent in-progress run
  { wfIdx: 0, status: 'in_progress', conclusion: null, daysAgo: 0, hoursAgo: 0, minutesAgo: 2, branch: 'feature/auth', event: 'push', actor: 0 },
  // Recent queued run
  { wfIdx: 3, status: 'queued', conclusion: null, daysAgo: 0, hoursAgo: 0, minutesAgo: 1, branch: 'main', event: 'push', actor: 1 },
  // Recent successes
  { wfIdx: 0, status: 'completed', conclusion: 'success', daysAgo: 0, hoursAgo: 0, minutesAgo: 15, branch: 'main', event: 'push', actor: 0 },
  { wfIdx: 2, status: 'completed', conclusion: 'success', daysAgo: 0, hoursAgo: 0, minutesAgo: 18, branch: 'main', event: 'push', actor: 0 },
  { wfIdx: 1, status: 'completed', conclusion: 'success', daysAgo: 0, hoursAgo: 0, minutesAgo: 25, branch: 'main', event: 'workflow_dispatch', actor: 2 },
  // A failure
  { wfIdx: 0, status: 'completed', conclusion: 'failure', daysAgo: 0, hoursAgo: 1, minutesAgo: 10, branch: 'fix/memory-leak', event: 'pull_request', actor: 3 },
  // More mixed results
  { wfIdx: 3, status: 'completed', conclusion: 'success', daysAgo: 0, hoursAgo: 2, minutesAgo: 0, branch: 'main', event: 'push', actor: 1 },
  { wfIdx: 4, status: 'completed', conclusion: 'success', daysAgo: 0, hoursAgo: 3, minutesAgo: 30, branch: 'release/v2.0', event: 'push', actor: 2 },
  { wfIdx: 6, status: 'completed', conclusion: 'success', daysAgo: 0, hoursAgo: 4, minutesAgo: 0, branch: 'main', event: 'pull_request', actor: 0 },
  { wfIdx: 5, status: 'completed', conclusion: 'failure', daysAgo: 0, hoursAgo: 8, minutesAgo: 0, branch: 'main', event: 'schedule', actor: 4 },
  // Yesterday
  { wfIdx: 0, status: 'completed', conclusion: 'success', daysAgo: 1, hoursAgo: 2, minutesAgo: 0, branch: 'develop', event: 'push', actor: 1 },
  { wfIdx: 3, status: 'completed', conclusion: 'success', daysAgo: 1, hoursAgo: 5, minutesAgo: 0, branch: 'main', event: 'push', actor: 3 },
  { wfIdx: 7, status: 'completed', conclusion: 'success', daysAgo: 1, hoursAgo: 6, minutesAgo: 0, branch: 'main', event: 'push', actor: 2 },
  { wfIdx: 0, status: 'completed', conclusion: 'cancelled', daysAgo: 1, hoursAgo: 8, minutesAgo: 0, branch: 'feature/auth', event: 'push', actor: 0 },
  // Older
  { wfIdx: 0, status: 'completed', conclusion: 'success', daysAgo: 2, hoursAgo: 0, minutesAgo: 0, branch: 'main', event: 'push', actor: 4 },
  { wfIdx: 6, status: 'completed', conclusion: 'failure', daysAgo: 2, hoursAgo: 3, minutesAgo: 0, branch: 'develop', event: 'pull_request', actor: 3 },
  { wfIdx: 3, status: 'completed', conclusion: 'success', daysAgo: 2, hoursAgo: 7, minutesAgo: 0, branch: 'main', event: 'push', actor: 1 },
  { wfIdx: 1, status: 'completed', conclusion: 'success', daysAgo: 3, hoursAgo: 0, minutesAgo: 0, branch: 'main', event: 'workflow_dispatch', actor: 2 },
  { wfIdx: 5, status: 'completed', conclusion: 'success', daysAgo: 3, hoursAgo: 8, minutesAgo: 0, branch: 'main', event: 'schedule', actor: 4 },
  { wfIdx: 0, status: 'completed', conclusion: 'success', daysAgo: 4, hoursAgo: 0, minutesAgo: 0, branch: 'dependabot/npm', event: 'push', actor: 4 },
];

// Job templates per workflow
const jobTemplates = {
  0: [{ name: 'lint', dur: 45 }, { name: 'build', dur: 120 }, { name: 'test', dur: 90 }, { name: 'e2e', dur: 180 }],
  1: [{ name: 'build', dur: 60 }, { name: 'deploy-staging', dur: 45 }, { name: 'smoke-test', dur: 30 }, { name: 'deploy-prod', dur: 45 }],
  2: [{ name: 'eslint', dur: 30 }, { name: 'prettier', dur: 15 }],
  3: [{ name: 'build', dur: 90 }, { name: 'unit-tests', dur: 120 }, { name: 'integration-tests', dur: 200 }],
  4: [{ name: 'build', dur: 60 }, { name: 'publish', dur: 45 }],
  5: [{ name: 'setup', dur: 30 }, { name: 'nightly-suite', dur: 600 }, { name: 'report', dur: 15 }],
  6: [{ name: 'build', dur: 45 }, { name: 'test', dur: 60 }, { name: 'storybook', dur: 30 }],
  7: [{ name: 'build', dur: 45 }, { name: 'publish-npm', dur: 30 }],
};

const runners = ['ubuntu-latest', 'ubuntu-22.04', 'macos-latest'];

for (const cfg of runConfigs) {
  const wf = workflows[cfg.wfIdx];
  const actor = actors[cfg.actor];
  const createdAt = isoDate(cfg.daysAgo, cfg.hoursAgo, cfg.minutesAgo);
  const startedAt = isoDate(cfg.daysAgo, cfg.hoursAgo, cfg.minutesAgo - 0.1);
  const durationMinutes = cfg.status === 'completed' ? Math.floor(Math.random() * 8 + 2) : 0;
  const updatedAt = cfg.status === 'completed'
    ? isoDate(cfg.daysAgo, cfg.hoursAgo, cfg.minutesAgo - durationMinutes)
    : isoDate(cfg.daysAgo, cfg.hoursAgo, cfg.minutesAgo);

  const id = runId++;
  const runNumber = Math.floor(Math.random() * 200) + 1;

  insertRun.run(
    id, wf.id, wf.owner, wf.repo, wf.name,
    runNumber, cfg.status, cfg.conclusion, cfg.event, cfg.branch,
    actor.login, actor.avatar,
    `https://github.com/${wf.owner}/${wf.repo}/actions/runs/${id}`,
    createdAt, updatedAt, startedAt, 1
  );

  // Generate jobs
  const jobs = jobTemplates[cfg.wfIdx] || [];
  let jobStartTime = new Date(startedAt);

  for (let i = 0; i < jobs.length; i++) {
    const jt = jobs[i];
    const jId = jobId++;
    let jobStatus, jobConclusion, jobCompletedAt;

    if (cfg.status === 'in_progress') {
      if (i < jobs.length - 2) {
        jobStatus = 'completed';
        jobConclusion = 'success';
      } else if (i === jobs.length - 2) {
        jobStatus = 'in_progress';
        jobConclusion = null;
      } else {
        jobStatus = 'queued';
        jobConclusion = null;
      }
    } else if (cfg.status === 'queued') {
      jobStatus = 'queued';
      jobConclusion = null;
    } else if (cfg.conclusion === 'failure' && i === jobs.length - 1) {
      jobStatus = 'completed';
      jobConclusion = 'failure';
    } else if (cfg.conclusion === 'cancelled' && i >= jobs.length - 1) {
      jobStatus = 'completed';
      jobConclusion = 'cancelled';
    } else {
      jobStatus = 'completed';
      jobConclusion = 'success';
    }

    const jobStarted = new Date(jobStartTime);
    const jobDurationSecs = jt.dur + Math.floor(Math.random() * 30);
    const jobFinished = jobConclusion ? new Date(jobStarted.getTime() + jobDurationSecs * 1000) : null;
    jobStartTime = jobFinished || jobStartTime;

    insertJob.run(
      jId, id, jt.name, jobStatus, jobConclusion,
      jobStarted.toISOString(),
      jobFinished ? jobFinished.toISOString() : null,
      `https://github.com/${wf.owner}/${wf.repo}/actions/runs/${id}/job/${jId}`,
      randomItem(runners), 1
    );
  }
}

console.log(`Seeded ${workflows.length} workflows, ${runConfigs.length} runs, and jobs.`);
console.log(`Database: ${process.env.DB_PATH}`);

closeDb();
