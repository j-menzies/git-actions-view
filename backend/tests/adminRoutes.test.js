const express = require('express');
const session = require('express-session');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test-admin.sqlite');

jest.mock('../src/services/syncDispatcher', () => ({
  restart: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  syncSingleRepo: jest.fn(),
}));

function createApp() {
  let app;
  jest.isolateModules(() => {
    process.env.DB_PATH = testDbPath;
    const _express = require('express');
    const _session = require('express-session');
    app = _express();
    app.use(_express.json());
    app.use(_session({ secret: 'test', resave: false, saveUninitialized: false }));
    app.use(require('../src/routes/admin'));
  });
  return app;
}

function seedData() {
  jest.isolateModules(() => {
    process.env.DB_PATH = testDbPath;
    const { getDb } = require('../src/db/database');
    const db = getDb();
    db.prepare('INSERT INTO workflows (id, name, owner_name, repo_name) VALUES (?, ?, ?, ?)').run(1, 'CI', 'org', 'repo');
    db.prepare(`
      INSERT INTO workflow_runs (id, workflow_id, owner_name, repo_name, workflow_name,
        run_number, status, conclusion, event, branch, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(100, 1, 'org', 'repo', 'CI', 1, 'completed', 'success', 'push', 'main', '2026-01-01T10:00:00Z', '2026-01-01T10:05:00Z');
    db.prepare(`
      INSERT INTO workflow_jobs (id, run_id, name, status, conclusion, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(200, 100, 'build', 'completed', 'success', '2026-01-01T10:00:10Z', '2026-01-01T10:03:00Z');
  });
}

function getRowCounts() {
  let counts;
  jest.isolateModules(() => {
    process.env.DB_PATH = testDbPath;
    const { getDb } = require('../src/db/database');
    const db = getDb();
    counts = {
      workflows: db.prepare('SELECT COUNT(*) as c FROM workflows').get().c,
      runs: db.prepare('SELECT COUNT(*) as c FROM workflow_runs').get().c,
      jobs: db.prepare('SELECT COUNT(*) as c FROM workflow_jobs').get().c,
    };
  });
  return counts;
}

describe('admin routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    process.env.DB_PATH = testDbPath;
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  afterEach(() => {
    try {
      jest.isolateModules(() => {
        process.env.DB_PATH = testDbPath;
        require('../src/db/database').closeDb();
      });
    } catch { /* ignore */ }
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.env = { ...originalEnv };
  });

  describe('POST /api/v1/admin/db/rebuild', () => {
    test('clears all workflow data', async () => {
      const app = createApp();
      seedData();

      // Verify data exists
      const before = getRowCounts();
      expect(before.workflows).toBe(1);
      expect(before.runs).toBe(1);
      expect(before.jobs).toBe(1);

      const res = await request(app).post('/api/v1/admin/db/rebuild');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify data is cleared
      const after = getRowCounts();
      expect(after.workflows).toBe(0);
      expect(after.runs).toBe(0);
      expect(after.jobs).toBe(0);
    });

    test('returns success even when DB is already empty', async () => {
      const app = createApp();
      // Just init the DB without seeding
      jest.isolateModules(() => {
        process.env.DB_PATH = testDbPath;
        require('../src/db/database').getDb();
      });
      const res = await request(app).post('/api/v1/admin/db/rebuild');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
