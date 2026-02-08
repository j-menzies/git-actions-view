const express = require('express');
const session = require('express-session');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test-routes.sqlite');

function createApp() {
  // Use jest.isolateModules to get fresh modules with current env vars
  let app;
  jest.isolateModules(() => {
    process.env.DB_PATH = testDbPath;

    const _express = require('express');
    const _session = require('express-session');
    app = _express();
    app.use(_express.json());
    app.use(_session({ secret: 'test', resave: false, saveUninitialized: false }));

    app.use(require('../src/routes/config'));
    app.use(require('../src/routes/runs'));
    app.use(require('../src/routes/jobs'));
  });
  return app;
}

function seedData() {
  jest.isolateModules(() => {
    process.env.DB_PATH = testDbPath;
    const { getDb } = require('../src/db/database');
    const db = getDb();

    db.prepare('INSERT INTO workflows (id, name, owner_name, repo_name) VALUES (?, ?, ?, ?)').run(1, 'CI Build', 'org1', 'repo-a');
    db.prepare('INSERT INTO workflows (id, name, owner_name, repo_name) VALUES (?, ?, ?, ?)').run(2, 'Deploy', 'org2', 'repo-b');

    const insertRun = db.prepare(`
      INSERT INTO workflow_runs (id, workflow_id, owner_name, repo_name, workflow_name,
        run_number, status, conclusion, event, branch, actor_login, html_url, created_at, updated_at, run_started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRun.run(100, 1, 'org1', 'repo-a', 'CI Build', 1, 'completed', 'success', 'push', 'main', 'dev1', 'https://github.com/org1/repo-a/actions/runs/100', '2026-01-01T10:00:00Z', '2026-01-01T10:05:00Z', '2026-01-01T10:00:05Z');
    insertRun.run(101, 1, 'org1', 'repo-a', 'CI Build', 2, 'completed', 'failure', 'push', 'feature', 'dev2', 'https://github.com/org1/repo-a/actions/runs/101', '2026-01-01T11:00:00Z', '2026-01-01T11:03:00Z', '2026-01-01T11:00:02Z');
    insertRun.run(102, 2, 'org2', 'repo-b', 'Deploy', 1, 'in_progress', null, 'push', 'main', 'dev1', 'https://github.com/org2/repo-b/actions/runs/102', '2026-01-01T12:00:00Z', '2026-01-01T12:01:00Z', '2026-01-01T12:00:01Z');

    const insertJob = db.prepare(`
      INSERT INTO workflow_jobs (id, run_id, name, status, conclusion, started_at, completed_at, runner_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertJob.run(200, 100, 'build', 'completed', 'success', '2026-01-01T10:00:10Z', '2026-01-01T10:03:00Z', 'ubuntu-latest');
    insertJob.run(201, 100, 'test', 'completed', 'success', '2026-01-01T10:03:05Z', '2026-01-01T10:04:30Z', 'ubuntu-latest');
    insertJob.run(202, 101, 'build', 'completed', 'failure', '2026-01-01T11:00:05Z', '2026-01-01T11:02:00Z', 'ubuntu-latest');
    insertJob.run(203, 102, 'deploy', 'in_progress', null, '2026-01-01T12:00:05Z', null, 'ubuntu-latest');
  });
}

describe('routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to clean env
    process.env = { ...originalEnv };
    // No auth required by default
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    process.env.GITHUB_REPOS = 'org1/repo-a,org2/repo-b';
    process.env.DB_PATH = testDbPath;
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  afterEach(() => {
    // Close any open DB connections
    try {
      jest.isolateModules(() => {
        process.env.DB_PATH = testDbPath;
        const { closeDb } = require('../src/db/database');
        closeDb();
      });
    } catch { /* ignore */ }
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.env = { ...originalEnv };
  });

  describe('GET /api/config', () => {
    test('returns config with no auth', async () => {
      const app = createApp();
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.authMechanisms).toEqual([]);
      expect(res.body.authRequired).toBe(false);
      expect(res.body.repositories).toEqual(['org1/repo-a', 'org2/repo-b']);
    });

    test('returns OAUTH2 when configured', async () => {
      process.env.GITHUB_OAUTH2_CLIENT_ID = 'id';
      process.env.GITHUB_OAUTH2_CLIENT_SECRET = 'secret';
      const app = createApp();
      const res = await request(app).get('/api/config');
      expect(res.body.authMechanisms).toContain('OAUTH2');
      expect(res.body.authRequired).toBe(true);
    });
  });

  describe('GET /api/me', () => {
    test('returns anonymous when auth not required', async () => {
      const app = createApp();
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(200);
      expect(res.body.login).toBe('anonymous');
    });

    test('returns 401 when auth required and not logged in', async () => {
      process.env.GITHUB_OAUTH2_CLIENT_ID = 'id';
      process.env.GITHUB_OAUTH2_CLIENT_SECRET = 'secret';
      const app = createApp();
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/runs', () => {
    test('returns runs in chronological order', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs');
      expect(res.status).toBe(200);
      expect(res.body.runs).toHaveLength(3);
      // Newest first
      expect(res.body.runs[0].id).toBe(102);
      expect(res.body.runs[1].id).toBe(101);
      expect(res.body.runs[2].id).toBe(100);
    });

    test('respects limit parameter', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?limit=2');
      expect(res.body.runs).toHaveLength(2);
      expect(res.body.hasMore).toBe(true);
      expect(res.body.nextCursor).toBeDefined();
    });

    test('caps limit at 100', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?limit=999');
      expect(res.status).toBe(200);
      // Should not crash; limit capped internally
    });

    test('cursor pagination with before parameter', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?before=2026-01-01T11:30:00Z');
      expect(res.body.runs).toHaveLength(2);
      expect(res.body.runs[0].id).toBe(101);
      expect(res.body.runs[1].id).toBe(100);
    });

    test('filters by repo (owner/name)', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?repo=org1/repo-a');
      expect(res.body.runs).toHaveLength(2);
      expect(res.body.runs.every(r => r.repoName === 'repo-a')).toBe(true);
    });

    test('filters by repo (name only)', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?repo=repo-b');
      expect(res.body.runs).toHaveLength(1);
      expect(res.body.runs[0].repoName).toBe('repo-b');
    });

    test('filters by conclusion status', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?status=success');
      expect(res.body.runs).toHaveLength(1);
      expect(res.body.runs[0].conclusion).toBe('success');
    });

    test('filters by active status (in_progress)', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?status=in_progress');
      expect(res.body.runs).toHaveLength(1);
      expect(res.body.runs[0].status).toBe('in_progress');
    });

    test('filters by branch', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?branch=feature');
      expect(res.body.runs).toHaveLength(1);
      expect(res.body.runs[0].branch).toBe('feature');
    });

    test('includes job summaries', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs');
      const run100 = res.body.runs.find(r => r.id === 100);
      expect(run100.jobSummary.total).toBe(2);
      expect(run100.jobSummary.success).toBe(2);
    });

    test('includes duration', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs');
      const run100 = res.body.runs.find(r => r.id === 100);
      expect(run100.duration).toBeDefined();
      expect(run100.duration).toContain('m');
    });

    test('hasMore false when no more results', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs?limit=50');
      expect(res.body.hasMore).toBe(false);
      expect(res.body.nextCursor).toBeNull();
    });

    test('empty results', async () => {
      const app = createApp();
      // No seed data — just initialize the DB
      jest.isolateModules(() => {
        process.env.DB_PATH = testDbPath;
        require('../src/db/database').getDb();
      });
      const res = await request(app).get('/api/v1/runs');
      expect(res.body.runs).toEqual([]);
      expect(res.body.hasMore).toBe(false);
    });
  });

  describe('GET /api/v1/runs/:runId/jobs', () => {
    test('returns jobs for a run', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs/100/jobs');
      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(2);
      expect(res.body.jobs[0].name).toBe('build');
      expect(res.body.jobs[1].name).toBe('test');
    });

    test('returns 400 for invalid runId', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs/abc/jobs');
      expect(res.status).toBe(400);
    });

    test('returns empty for non-existent run', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs/9999/jobs');
      expect(res.body.jobs).toEqual([]);
    });

    test('includes duration and runner name', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs/100/jobs');
      const buildJob = res.body.jobs.find(j => j.name === 'build');
      expect(buildJob.duration).toBeDefined();
      expect(buildJob.runnerName).toBe('ubuntu-latest');
    });

    test('handles in-progress jobs with null completed_at', async () => {
      const app = createApp();
      seedData();
      const res = await request(app).get('/api/v1/runs/102/jobs');
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].conclusion).toBeNull();
      expect(res.body.jobs[0].duration).toBeNull();
    });
  });
});
