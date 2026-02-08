describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadConfig() {
    return require('../src/config');
  }

  test('port defaults to 9000', () => {
    delete process.env.PORT;
    expect(loadConfig().port).toBe(9000);
  });

  test('port reads from PORT env', () => {
    process.env.PORT = '3000';
    expect(loadConfig().port).toBe(3000);
  });

  test('domainName defaults to GitHub API', () => {
    delete process.env.DOMAIN_NAME;
    expect(loadConfig().domainName).toBe('https://api.github.com');
  });

  test('domainName reads from DOMAIN_NAME env', () => {
    process.env.DOMAIN_NAME = 'https://ghe.example.com/api/v3';
    expect(loadConfig().domainName).toBe('https://ghe.example.com/api/v3');
  });

  test('isOAuth2Enabled true when both ID and secret set', () => {
    process.env.GITHUB_OAUTH2_CLIENT_ID = 'id';
    process.env.GITHUB_OAUTH2_CLIENT_SECRET = 'secret';
    expect(loadConfig().isOAuth2Enabled).toBe(true);
  });

  test('isOAuth2Enabled false when ID missing', () => {
    process.env.GITHUB_OAUTH2_CLIENT_SECRET = 'secret';
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    expect(loadConfig().isOAuth2Enabled).toBe(false);
  });

  test('isOAuth2Enabled false when secret missing', () => {
    process.env.GITHUB_OAUTH2_CLIENT_ID = 'id';
    delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
    expect(loadConfig().isOAuth2Enabled).toBe(false);
  });

  test('isBasicAuthEnabled true when file path set', () => {
    process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH = '/tmp/htpasswd';
    expect(loadConfig().isBasicAuthEnabled).toBe(true);
  });

  test('isBasicAuthEnabled false when file path not set', () => {
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    expect(loadConfig().isBasicAuthEnabled).toBe(false);
  });

  test('isAuthRequired true when OAuth2 enabled', () => {
    process.env.GITHUB_OAUTH2_CLIENT_ID = 'id';
    process.env.GITHUB_OAUTH2_CLIENT_SECRET = 'secret';
    expect(loadConfig().isAuthRequired).toBe(true);
  });

  test('isAuthRequired false when nothing configured', () => {
    delete process.env.GITHUB_OAUTH2_CLIENT_ID;
    delete process.env.GITHUB_OAUTH2_CLIENT_SECRET;
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    expect(loadConfig().isAuthRequired).toBe(false);
  });

  test('repos parses GITHUB_REPOS multi-owner format', () => {
    process.env.GITHUB_REPOS = 'org1/repo-a,org2/repo-b';
    const repos = loadConfig().repos;
    expect(repos).toEqual([
      { owner: 'org1', name: 'repo-a' },
      { owner: 'org2', name: 'repo-b' },
    ]);
  });

  test('repos trims whitespace', () => {
    process.env.GITHUB_REPOS = ' org1/repo-a , org2/repo-b ';
    const repos = loadConfig().repos;
    expect(repos).toHaveLength(2);
    expect(repos[0]).toEqual({ owner: 'org1', name: 'repo-a' });
  });

  test('repos throws on invalid format', () => {
    process.env.GITHUB_REPOS = 'invalid-no-slash';
    expect(() => loadConfig().repos).toThrow('Invalid GITHUB_REPOS format');
  });

  test('repos parses legacy REPO_OWNER_NAME + REPO_NAMES', () => {
    delete process.env.GITHUB_REPOS;
    process.env.REPO_OWNER_NAME = 'myorg';
    process.env.REPO_NAMES = 'repo-a,repo-b';
    const repos = loadConfig().repos;
    expect(repos).toEqual([
      { owner: 'myorg', name: 'repo-a' },
      { owner: 'myorg', name: 'repo-b' },
    ]);
  });

  test('repos returns empty array when nothing configured', () => {
    delete process.env.GITHUB_REPOS;
    delete process.env.REPO_OWNER_NAME;
    delete process.env.REPO_NAMES;
    expect(loadConfig().repos).toEqual([]);
  });

  test('discoveryPollSeconds defaults to 60', () => {
    delete process.env.DISCOVERY_POLL_SECONDS;
    expect(loadConfig().discoveryPollSeconds).toBe(60);
  });

  test('activePollSeconds defaults to 10', () => {
    delete process.env.ACTIVE_POLL_SECONDS;
    expect(loadConfig().activePollSeconds).toBe(10);
  });

  test('sessionSecret defaults to change-me-in-production', () => {
    delete process.env.SESSION_SECRET;
    expect(loadConfig().sessionSecret).toBe('change-me-in-production');
  });
});
