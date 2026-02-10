const request = require('supertest');

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

function createReposApp(mockToken, mockRepos) {
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

describe('GET /api/v1/github/repos', () => {
  test('returns repos when token is available', async () => {
    const mockRepos = [
      { owner: 'org', name: 'repo1', fullName: 'org/repo1' },
      { owner: 'org', name: 'repo2', fullName: 'org/repo2' },
    ];
    const app = createReposApp('valid-token', mockRepos);
    const res = await request(app).get('/api/v1/github/repos');
    expect(res.status).toBe(200);
    expect(res.body.repos).toEqual(mockRepos);
  });

  test('returns 400 when no token available', async () => {
    const app = createReposApp(null, []);
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

describe('GET /api/v1/github/status', () => {
  const mockStatusResponse = {
    status: { indicator: 'minor', description: 'Minor Service Outage' },
    components: [
      { name: 'Git Operations', status: 'operational', group: false },
      { name: 'Actions', status: 'degraded_performance', group: false },
      { name: 'Visit www.githubstatus.com for more information', status: 'operational', group: false },
      { name: 'Grouped Component', status: 'operational', group: true },
    ],
    incidents: [
      {
        name: 'Actions degraded',
        impact: 'minor',
        status: 'investigating',
        started_at: '2026-02-08T18:00:00Z',
        updated_at: '2026-02-08T18:30:00Z',
        incident_updates: [{ body: 'We are investigating delays.' }],
      },
    ],
  };

  function createStatusApp(axiosMock) {
    let app;
    jest.isolateModules(() => {
      const axios = require('axios');
      jest.spyOn(axios, 'get').mockImplementation(axiosMock);

      const express = require('express');
      const session = require('express-session');
      app = express();
      app.use(express.json());
      app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
      app.use(require('../src/routes/github'));
    });
    return app;
  }

  test('returns transformed status data', async () => {
    const app = createStatusApp(() => Promise.resolve({ data: mockStatusResponse }));
    const res = await request(app).get('/api/v1/github/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toEqual({ indicator: 'minor', description: 'Minor Service Outage' });

    // Filters out grouped components and the info banner
    expect(res.body.components).toEqual([
      { name: 'Git Operations', status: 'operational' },
      { name: 'Actions', status: 'degraded_performance' },
    ]);

    // Transforms incidents
    expect(res.body.incidents).toHaveLength(1);
    expect(res.body.incidents[0]).toEqual({
      name: 'Actions degraded',
      impact: 'minor',
      status: 'investigating',
      startedAt: '2026-02-08T18:00:00Z',
      updatedAt: '2026-02-08T18:30:00Z',
      latestUpdate: 'We are investigating delays.',
    });
  });

  test('returns fallback when GitHub status API fails', async () => {
    const app = createStatusApp(() => Promise.reject(new Error('Network error')));
    const res = await request(app).get('/api/v1/github/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toEqual({ indicator: 'unknown', description: 'Unable to fetch status' });
    expect(res.body.components).toEqual([]);
    expect(res.body.incidents).toEqual([]);
  });

  test('returns cached data on subsequent requests', async () => {
    const axiosMock = jest.fn(() => Promise.resolve({ data: mockStatusResponse }));
    const app = createStatusApp(axiosMock);

    await request(app).get('/api/v1/github/status');
    await request(app).get('/api/v1/github/status');

    // axios should only be called once due to caching
    expect(axiosMock).toHaveBeenCalledTimes(1);
  });

  test('handles missing fields gracefully', async () => {
    const app = createStatusApp(() => Promise.resolve({ data: {} }));
    const res = await request(app).get('/api/v1/github/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toEqual({ indicator: 'unknown', description: 'Unknown' });
    expect(res.body.components).toEqual([]);
    expect(res.body.incidents).toEqual([]);
  });
});
