const express = require('express');
const session = require('express-session');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, 'test-repos-routes.sqlite');

jest.mock('../src/services/syncDispatcher', () => ({
  syncSingleRepo: jest.fn(),
  restart: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
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
    app.use(require('../src/routes/repos'));
  });
  return app;
}

describe('repos routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    process.env.DB_PATH = testDbPath;
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    // Initialise DB
    jest.isolateModules(() => {
      process.env.DB_PATH = testDbPath;
      require('../src/db/database').getDb();
    });
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

  describe('GET /api/v1/repos', () => {
    test('returns empty list initially', async () => {
      const app = createApp();
      const res = await request(app).get('/api/v1/repos');
      expect(res.status).toBe(200);
      expect(res.body.repos).toEqual([]);
    });
  });

  describe('POST /api/v1/repos', () => {
    test('adds a new repository', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/repos')
        .send({ owner: 'test-org', name: 'my-repo' });
      expect(res.status).toBe(201);
      expect(res.body.repo.owner).toBe('test-org');
      expect(res.body.repo.name).toBe('my-repo');
      expect(res.body.repo.hidden).toBe(0);
    });

    test('rejects missing owner', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/repos')
        .send({ name: 'my-repo' });
      expect(res.status).toBe(400);
    });

    test('rejects missing name', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/repos')
        .send({ owner: 'test-org' });
      expect(res.status).toBe(400);
    });

    test('adding duplicate repo is idempotent', async () => {
      const app = createApp();
      await request(app).post('/api/v1/repos').send({ owner: 'org', name: 'repo' });
      const res = await request(app).post('/api/v1/repos').send({ owner: 'org', name: 'repo' });
      expect(res.status).toBe(201);

      // Should still only have one entry
      const listRes = await request(app).get('/api/v1/repos');
      expect(listRes.body.repos).toHaveLength(1);
    });
  });

  describe('PUT /api/v1/repos/:id', () => {
    test('toggles hidden flag', async () => {
      const app = createApp();
      const addRes = await request(app)
        .post('/api/v1/repos')
        .send({ owner: 'org', name: 'repo' });
      const id = addRes.body.repo.id;

      const res = await request(app)
        .put(`/api/v1/repos/${id}`)
        .send({ hidden: true });
      expect(res.status).toBe(200);
      expect(res.body.repo.hidden).toBe(1);

      // Toggle back
      const res2 = await request(app)
        .put(`/api/v1/repos/${id}`)
        .send({ hidden: false });
      expect(res2.body.repo.hidden).toBe(0);
    });

    test('returns 404 for non-existent repo', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/v1/repos/9999')
        .send({ hidden: true });
      expect(res.status).toBe(404);
    });

    test('returns 400 if hidden not provided', async () => {
      const app = createApp();
      const addRes = await request(app)
        .post('/api/v1/repos')
        .send({ owner: 'org', name: 'repo' });
      const id = addRes.body.repo.id;

      const res = await request(app)
        .put(`/api/v1/repos/${id}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/repos/:id', () => {
    test('deletes a repository', async () => {
      const app = createApp();
      const addRes = await request(app)
        .post('/api/v1/repos')
        .send({ owner: 'org', name: 'repo' });
      const id = addRes.body.repo.id;

      const res = await request(app).delete(`/api/v1/repos/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const listRes = await request(app).get('/api/v1/repos');
      expect(listRes.body.repos).toHaveLength(0);
    });

    test('returns 404 for non-existent repo', async () => {
      const app = createApp();
      const res = await request(app).delete('/api/v1/repos/9999');
      expect(res.status).toBe(404);
    });
  });
});
