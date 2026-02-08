const axios = require('axios');

jest.mock('axios');

describe('githubApi', () => {
  const originalEnv = process.env;
  let mockGet;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GITHUB_ACCESS_TOKEN;
    delete process.env.DOMAIN_NAME;
    mockGet = jest.fn();
    axios.create.mockReturnValue({ get: mockGet });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // We load the module once — don't use resetModules because it breaks the mock
  const githubApi = require('../src/services/githubApi');

  test('listWorkflows calls correct endpoint and returns workflows', async () => {
    mockGet.mockResolvedValue({ data: { workflows: [{ id: 1, name: 'CI' }] } });
    const result = await githubApi.listWorkflows('myorg', 'myrepo', 'token');
    expect(mockGet).toHaveBeenCalledWith('/repos/myorg/myrepo/actions/workflows');
    expect(result).toEqual([{ id: 1, name: 'CI' }]);
  });

  test('listWorkflows returns empty array when workflows undefined', async () => {
    mockGet.mockResolvedValue({ data: {} });
    const result = await githubApi.listWorkflows('org', 'repo', 'token');
    expect(result).toEqual([]);
  });

  test('listWorkflowRuns calls correct endpoint with params', async () => {
    mockGet.mockResolvedValue({ data: { workflow_runs: [{ id: 10 }] } });
    const result = await githubApi.listWorkflowRuns('org', 'repo', { page: 2 }, 'token');
    expect(mockGet).toHaveBeenCalledWith('/repos/org/repo/actions/runs', {
      params: { per_page: 30, page: 2 },
    });
    expect(result.workflow_runs).toHaveLength(1);
  });

  test('listWorkflowRuns uses default per_page 30', async () => {
    mockGet.mockResolvedValue({ data: { workflow_runs: [] } });
    await githubApi.listWorkflowRuns('org', 'repo', {}, 'token');
    expect(mockGet).toHaveBeenCalledWith('/repos/org/repo/actions/runs', {
      params: { per_page: 30 },
    });
  });

  test('getWorkflowRun calls correct endpoint', async () => {
    mockGet.mockResolvedValue({ data: { id: 123, status: 'completed' } });
    const result = await githubApi.getWorkflowRun('org', 'repo', 123, 'token');
    expect(mockGet).toHaveBeenCalledWith('/repos/org/repo/actions/runs/123');
    expect(result.id).toBe(123);
    expect(result.status).toBe('completed');
  });

  test('listRunJobs calls correct endpoint with per_page 100', async () => {
    mockGet.mockResolvedValue({ data: { jobs: [{ id: 1, name: 'build' }] } });
    const result = await githubApi.listRunJobs('org', 'repo', 123, 'token');
    expect(mockGet).toHaveBeenCalledWith('/repos/org/repo/actions/runs/123/jobs', {
      params: { per_page: 100 },
    });
    expect(result).toEqual([{ id: 1, name: 'build' }]);
  });

  test('listRunJobs returns empty array when jobs undefined', async () => {
    mockGet.mockResolvedValue({ data: {} });
    const result = await githubApi.listRunJobs('org', 'repo', 123, 'token');
    expect(result).toEqual([]);
  });

  test('creates client with Authorization header when token provided', async () => {
    mockGet.mockResolvedValue({ data: { workflows: [] } });
    await githubApi.listWorkflows('org', 'repo', 'my-token');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token my-token',
        }),
      })
    );
  });

  test('creates client without Authorization when no token', async () => {
    delete process.env.GITHUB_ACCESS_TOKEN;
    mockGet.mockResolvedValue({ data: { workflows: [] } });
    await githubApi.listWorkflows('org', 'repo', null);
    const callArgs = axios.create.mock.calls[axios.create.mock.calls.length - 1][0];
    expect(callArgs.headers).not.toHaveProperty('Authorization');
  });

  test('creates client with correct baseURL', async () => {
    mockGet.mockResolvedValue({ data: { workflows: [] } });
    await githubApi.listWorkflows('org', 'repo', 'token');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.github.com',
      })
    );
  });

  test('creates client with 30s timeout', async () => {
    mockGet.mockResolvedValue({ data: { workflows: [] } });
    await githubApi.listWorkflows('org', 'repo', 'token');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 30000,
      })
    );
  });

  test('listUserRepos fetches all pages of user repos', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      owner: { login: 'user' },
      name: `repo-${i}`,
      full_name: `user/repo-${i}`,
    }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({
      owner: { login: 'user' },
      name: `repo-${100 + i}`,
      full_name: `user/repo-${100 + i}`,
    }));

    mockGet
      .mockResolvedValueOnce({ data: page1 })
      .mockResolvedValueOnce({ data: page2 });

    const result = await githubApi.listUserRepos('token');
    expect(result).toHaveLength(150);
    expect(result[0]).toEqual({ owner: 'user', name: 'repo-0', fullName: 'user/repo-0' });
    expect(result[149]).toEqual({ owner: 'user', name: 'repo-149', fullName: 'user/repo-149' });

    expect(mockGet).toHaveBeenCalledWith('/user/repos', {
      params: { per_page: 100, sort: 'updated', direction: 'desc', page: 1 },
    });
    expect(mockGet).toHaveBeenCalledWith('/user/repos', {
      params: { per_page: 100, sort: 'updated', direction: 'desc', page: 2 },
    });
  });

  test('listUserRepos returns empty array when no repos', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const result = await githubApi.listUserRepos('token');
    expect(result).toEqual([]);
  });

  test('listUserRepos handles single page', async () => {
    mockGet.mockResolvedValue({
      data: [{ owner: { login: 'org' }, name: 'my-repo', full_name: 'org/my-repo' }],
    });
    const result = await githubApi.listUserRepos('token');
    expect(result).toEqual([{ owner: 'org', name: 'my-repo', fullName: 'org/my-repo' }]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
