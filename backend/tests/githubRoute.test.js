const request = require('supertest');

describe('GET /api/v1/github/repos', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function createApp(mockToken, mockRepos) {
    let app;
    jest.isolateModules(() => {
      const middleware = require('../src/auth/middleware');
      jest.spyOn(middleware, 'getAccessToken').mockReturnValue(mockToken);

      const githubApi = require('../src/services/githubApi');
      jest.spyOn(githubApi, 'listUserRepos').mockResolvedValue(mockRepos || []);

      const express = require('express');
      const session = require('express-session');
      app = express();
      app.use(express.json());
      app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
      app.use(require('../src/routes/github'));
    });
    return app;
  }

  test('returns repos when token is available', async () => {
    const mockRepos = [
      { owner: 'org', name: 'repo1', fullName: 'org/repo1' },
      { owner: 'org', name: 'repo2', fullName: 'org/repo2' },
    ];
    const app = createApp('valid-token', mockRepos);
    const res = await request(app).get('/api/v1/github/repos');
    expect(res.status).toBe(200);
    expect(res.body.repos).toEqual(mockRepos);
  });

  test('returns 400 when no token available', async () => {
    const app = createApp(null, []);
    const res = await request(app).get('/api/v1/github/repos');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No GitHub access token');
  });

  test('returns 502 when GitHub API fails', async () => {
    let app;
    jest.isolateModules(() => {
      const middleware = require('../src/auth/middleware');
      jest.spyOn(middleware, 'getAccessToken').mockReturnValue('token');

      const githubApi = require('../src/services/githubApi');
      jest.spyOn(githubApi, 'listUserRepos').mockRejectedValue(new Error('API rate limit'));

      const express = require('express');
      const session = require('express-session');
      app = express();
      app.use(express.json());
      app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
      app.use(require('../src/routes/github'));
    });

    const res = await request(app).get('/api/v1/github/repos');
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('Failed to fetch repositories');
  });
});
