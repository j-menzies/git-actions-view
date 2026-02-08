describe('auth middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('ensureAuthenticated', () => {
    test('calls next() when auth not required', () => {
      delete process.env.GITHUB_OAUTH2_CLIENT_ID;
      delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
      delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
      const { ensureAuthenticated } = require('../src/auth/middleware');
      const next = jest.fn();
      const req = {};
      const res = {};
      ensureAuthenticated(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('calls next() when user is authenticated', () => {
      process.env.GITHUB_OAUTH2_CLIENT_ID = 'id';
      process.env.GITHUB_OAUTH2_CLIENT_SECRET = 'secret';
      const { ensureAuthenticated } = require('../src/auth/middleware');
      const next = jest.fn();
      const req = { isAuthenticated: () => true };
      const res = {};
      ensureAuthenticated(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 401 when auth required and not authenticated', () => {
      process.env.GITHUB_OAUTH2_CLIENT_ID = 'id';
      process.env.GITHUB_OAUTH2_CLIENT_SECRET = 'secret';
      const { ensureAuthenticated } = require('../src/auth/middleware');
      const next = jest.fn();
      const req = { isAuthenticated: () => false };
      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) };
      ensureAuthenticated(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('getAccessToken', () => {
    test('returns user token when available', () => {
      const { getAccessToken } = require('../src/auth/middleware');
      const req = { user: { accessToken: 'user-token' } };
      expect(getAccessToken(req)).toBe('user-token');
    });

    test('returns config token when user token not available', () => {
      process.env.GITHUB_ACCESS_TOKEN = 'config-token';
      const { getAccessToken } = require('../src/auth/middleware');
      const req = { user: {} };
      expect(getAccessToken(req)).toBe('config-token');
    });

    test('returns null when no token available', () => {
      delete process.env.GITHUB_ACCESS_TOKEN;
      const { getAccessToken } = require('../src/auth/middleware');
      const req = {};
      expect(getAccessToken(req)).toBeNull();
    });
  });
});
