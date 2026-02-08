const fs = require('fs');
const path = require('path');

// Mock githubApi BEFORE any require of syncService
jest.mock('../src/services/githubApi');

const testDbPath = path.join(__dirname, 'test-sync.sqlite');

// Set DB_PATH before loading any modules that use it
process.env.DB_PATH = testDbPath;

describe('syncService', () => {
  let getDb, closeDb, githubApi, syncService;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.env.DB_PATH = testDbPath;

    // Clear cached modules so we get fresh DB + fresh service
    delete require.cache[require.resolve('../src/db/database')];
    delete require.cache[require.resolve('../src/services/syncService')];
    delete require.cache[require.resolve('../src/config')];

    // Re-require fresh instances
    const db = require('../src/db/database');
    getDb = db.getDb;
    closeDb = db.closeDb;

    githubApi = require('../src/services/githubApi');
    syncService = require('../src/services/syncService');

    // Reset mock call history
    jest.clearAllMocks();
  });

  afterEach(() => {
    try {
      closeDb();
    } catch { /* ignore */ }
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  test('upsertWorkflow inserts new workflow', () => {
    const db = getDb();

    syncService.upsertWorkflow({ id: 1, name: 'CI Build', path: '.github/workflows/ci.yml', state: 'active' }, 'org', 'repo');

    const row = db.prepare('SELECT * FROM workflows WHERE id = 1').get();
    expect(row.name).toBe('CI Build');
    expect(row.owner_name).toBe('org');
    expect(row.repo_name).toBe('repo');
    expect(row.path).toBe('.github/workflows/ci.yml');
  });

  test('upsertWorkflow updates existing workflow', () => {
    const db = getDb();

    syncService.upsertWorkflow({ id: 1, name: 'CI', state: 'active' }, 'org', 'repo');
    syncService.upsertWorkflow({ id: 1, name: 'CI Updated', state: 'disabled' }, 'org', 'repo');

    const row = db.prepare('SELECT * FROM workflows WHERE id = 1').get();
    expect(row.name).toBe('CI Updated');
    expect(row.state).toBe('disabled');
  });

  test('upsertRun inserts new run', () => {
    const db = getDb();

    syncService.upsertWorkflow({ id: 1, name: 'CI' }, 'org', 'repo');
    syncService.upsertRun({
      id: 100, workflow_id: 1, run_number: 42, status: 'completed', conclusion: 'success',
      event: 'push', head_branch: 'main', actor: { login: 'dev', avatar_url: 'https://avatar' },
      html_url: 'https://github.com/org/repo/actions/runs/100',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:05:00Z',
      run_started_at: '2026-01-01T00:00:10Z', run_attempt: 1,
    }, 'org', 'repo', 'CI');

    const row = db.prepare('SELECT * FROM workflow_runs WHERE id = 100').get();
    expect(row.status).toBe('completed');
    expect(row.conclusion).toBe('success');
    expect(row.branch).toBe('main');
    expect(row.actor_login).toBe('dev');
  });

  test('upsertRun updates existing run', () => {
    const db = getDb();

    syncService.upsertWorkflow({ id: 1, name: 'CI' }, 'org', 'repo');
    const baseRun = {
      id: 100, workflow_id: 1, run_number: 42, status: 'in_progress', conclusion: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:01:00Z',
    };
    syncService.upsertRun(baseRun, 'org', 'repo', 'CI');
    syncService.upsertRun({ ...baseRun, status: 'completed', conclusion: 'failure', updated_at: '2026-01-01T00:05:00Z' }, 'org', 'repo', 'CI');

    const row = db.prepare('SELECT * FROM workflow_runs WHERE id = 100').get();
    expect(row.status).toBe('completed');
    expect(row.conclusion).toBe('failure');
  });

  test('upsertRun handles null optional fields', () => {
    const db = getDb();

    syncService.upsertWorkflow({ id: 1, name: 'CI' }, 'org', 'repo');
    syncService.upsertRun({
      id: 100, workflow_id: 1, run_number: 1, status: 'queued',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }, 'org', 'repo', 'CI');

    const row = db.prepare('SELECT * FROM workflow_runs WHERE id = 100').get();
    expect(row.conclusion).toBeNull();
    expect(row.event).toBeNull();
    expect(row.branch).toBeNull();
    expect(row.actor_login).toBeNull();
  });

  test('upsertJob inserts new job', () => {
    const db = getDb();

    syncService.upsertWorkflow({ id: 1, name: 'CI' }, 'org', 'repo');
    syncService.upsertRun({
      id: 100, workflow_id: 1, run_number: 1, status: 'completed',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:05:00Z',
    }, 'org', 'repo', 'CI');
    syncService.upsertJob({
      id: 200, name: 'build', status: 'completed', conclusion: 'success',
      started_at: '2026-01-01T00:00:05Z', completed_at: '2026-01-01T00:03:00Z',
      html_url: 'https://example.com/job/200', runner_name: 'ubuntu-latest',
    }, 100);

    const row = db.prepare('SELECT * FROM workflow_jobs WHERE id = 200').get();
    expect(row.name).toBe('build');
    expect(row.conclusion).toBe('success');
    expect(row.runner_name).toBe('ubuntu-latest');
  });

  test('syncRepoRuns fetches workflows and runs', async () => {
    githubApi.listWorkflows.mockResolvedValue([{ id: 1, name: 'CI', path: '.github/workflows/ci.yml', state: 'active' }]);
    githubApi.listWorkflowRuns.mockResolvedValue({
      workflow_runs: [{
        id: 100, workflow_id: 1, run_number: 1, status: 'completed', conclusion: 'success',
        event: 'push', head_branch: 'main', actor: { login: 'dev' },
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:05:00Z',
      }],
    });
    githubApi.listRunJobs.mockResolvedValue([
      { id: 200, name: 'build', status: 'completed', conclusion: 'success' },
    ]);

    const active = await syncService.syncRepoRuns('org', 'repo', 'token');

    expect(githubApi.listWorkflows).toHaveBeenCalledWith('org', 'repo', 'token');
    expect(active).toEqual([]); // no active runs since status is completed

    const db = getDb();
    const runs = db.prepare('SELECT * FROM workflow_runs').all();
    expect(runs).toHaveLength(1);
  });

  test('syncRepoRuns returns active runs for in-flight statuses', async () => {
    githubApi.listWorkflows.mockResolvedValue([{ id: 1, name: 'CI' }]);
    githubApi.listWorkflowRuns.mockResolvedValue({
      workflow_runs: [{
        id: 100, workflow_id: 1, run_number: 1, status: 'in_progress', conclusion: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:01:00Z',
      }],
    });
    githubApi.listRunJobs.mockResolvedValue([]);

    const active = await syncService.syncRepoRuns('org', 'repo', 'token');

    expect(active).toEqual([{ id: 100, owner: 'org', repo: 'repo' }]);
  });

  test('syncRepoRuns handles API error gracefully', async () => {
    githubApi.listWorkflows.mockRejectedValue(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const active = await syncService.syncRepoRuns('org', 'repo', 'token');

    expect(active).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('syncActiveRun returns true when completed', async () => {
    syncService.upsertWorkflow({ id: 1, name: 'CI' }, 'org', 'repo');
    syncService.upsertRun({
      id: 100, workflow_id: 1, run_number: 1, status: 'in_progress',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:01:00Z',
    }, 'org', 'repo', 'CI');

    githubApi.getWorkflowRun.mockResolvedValue({
      id: 100, workflow_id: 1, run_number: 1, status: 'completed', conclusion: 'success',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:05:00Z',
    });
    githubApi.listRunJobs.mockResolvedValue([]);

    const isCompleted = await syncService.syncActiveRun('org', 'repo', 100, 'token');
    expect(isCompleted).toBe(true);
  });

  test('syncActiveRun returns false when still running', async () => {
    syncService.upsertWorkflow({ id: 1, name: 'CI' }, 'org', 'repo');
    syncService.upsertRun({
      id: 100, workflow_id: 1, run_number: 1, status: 'in_progress',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:01:00Z',
    }, 'org', 'repo', 'CI');

    githubApi.getWorkflowRun.mockResolvedValue({
      id: 100, workflow_id: 1, run_number: 1, status: 'in_progress',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:02:00Z',
    });
    githubApi.listRunJobs.mockResolvedValue([]);

    const isCompleted = await syncService.syncActiveRun('org', 'repo', 100, 'token');
    expect(isCompleted).toBe(false);
  });
});
