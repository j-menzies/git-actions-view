const express = require('express');
const session = require('express-session');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test-settings.sqlite');

function createApp() {
  let app;
  jest.isolateModules(() => {
    process.env.DB_PATH = testDbPath;
    const _express = require('express');
    const _session = require('express-session');
    app = _express();
    app.use(_express.json());
    app.use(_session({ secret: 'test', resave: false, saveUninitialized: false }));
    app.use(require('../src/routes/settings'));
  });
  return app;
}

describe('settings routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    process.env.DB_PATH = testDbPath;
    process.env.DISCOVERY_POLL_SECONDS = '60';
    process.env.ACTIVE_POLL_SECONDS = '10';
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

  describe('GET /api/v1/settings', () => {
    test('returns default settings', async () => {
      const app = createApp();
      const res = await request(app).get('/api/v1/settings');
      expect(res.status).toBe(200);
      expect(res.body.discoveryPollSeconds).toBe(60);
      expect(res.body.activePollSeconds).toBe(10);
    });
  });

  describe('PUT /api/v1/settings', () => {
    test('updates polling intervals', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/v1/settings')
        .send({ discoveryPollSeconds: 90, activePollSeconds: 20 });
      expect(res.status).toBe(200);
      expect(res.body.discoveryPollSeconds).toBe(90);
      expect(res.body.activePollSeconds).toBe(20);
      expect(res.body.restarted).toBe(true);
    });

    test('rejects values below minimum', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/v1/settings')
        .send({ discoveryPollSeconds: 2 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('discoveryPollSeconds');
    });

    test('rejects invalid active poll seconds', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/v1/settings')
        .send({ activePollSeconds: 3 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('activePollSeconds');
    });

    test('persists settings to DB', async () => {
      const app = createApp();
      await request(app)
        .put('/api/v1/settings')
        .send({ discoveryPollSeconds: 120, activePollSeconds: 30 });

      // Re-fetch to verify persistence
      const res = await request(app).get('/api/v1/settings');
      expect(res.body.discoveryPollSeconds).toBe(120);
      expect(res.body.activePollSeconds).toBe(30);
    });

    test('partial update only changes specified fields', async () => {
      const app = createApp();
      await request(app)
        .put('/api/v1/settings')
        .send({ discoveryPollSeconds: 45 });

      const res = await request(app).get('/api/v1/settings');
      expect(res.body.discoveryPollSeconds).toBe(45);
      expect(res.body.activePollSeconds).toBe(10); // unchanged
    });
  });
});
