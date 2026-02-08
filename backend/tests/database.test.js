const fs = require('fs');
const path = require('path');

describe('database', () => {
  const testDbPath = path.join(__dirname, 'test-db.sqlite');

  beforeEach(() => {
    jest.resetModules();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.env.DB_PATH = testDbPath;
  });

  afterEach(() => {
    try {
      const { closeDb } = require('../src/db/database');
      closeDb();
    } catch { /* ignore */ }
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  test('getDb initializes database and creates tables', () => {
    const { getDb } = require('../src/db/database');
    const db = getDb();
    expect(db).toBeDefined();

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('workflows');
    expect(tableNames).toContain('workflow_runs');
    expect(tableNames).toContain('workflow_jobs');
  });

  test('getDb enables WAL mode', () => {
    const { getDb } = require('../src/db/database');
    const db = getDb();
    const result = db.pragma('journal_mode');
    expect(result[0].journal_mode).toBe('wal');
  });

  test('getDb enables foreign keys', () => {
    const { getDb } = require('../src/db/database');
    const db = getDb();
    const result = db.pragma('foreign_keys');
    expect(result[0].foreign_keys).toBe(1);
  });

  test('getDb returns same instance on subsequent calls', () => {
    const { getDb } = require('../src/db/database');
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  test('closeDb closes connection and resets', () => {
    const { getDb, closeDb } = require('../src/db/database');
    getDb();
    closeDb();
    // After close, getDb should reinitialize
    const db = getDb();
    expect(db).toBeDefined();
  });

  test('creates db directory if not exists', () => {
    const nestedPath = path.join(__dirname, 'nested', 'dir', 'test.db');
    process.env.DB_PATH = nestedPath;
    jest.resetModules();
    const { getDb, closeDb } = require('../src/db/database');
    getDb();
    expect(fs.existsSync(path.dirname(nestedPath))).toBe(true);
    closeDb();
    fs.unlinkSync(nestedPath);
    fs.rmdirSync(path.join(__dirname, 'nested', 'dir'));
    fs.rmdirSync(path.join(__dirname, 'nested'));
  });

  test('can insert and query workflows', () => {
    const { getDb } = require('../src/db/database');
    const db = getDb();
    db.prepare(
      'INSERT INTO workflows (id, name, owner_name, repo_name) VALUES (?, ?, ?, ?)'
    ).run(1, 'CI', 'org', 'repo');
    const row = db.prepare('SELECT * FROM workflows WHERE id = 1').get();
    expect(row.name).toBe('CI');
    expect(row.owner_name).toBe('org');
  });

  test('can insert and query workflow_runs', () => {
    const { getDb } = require('../src/db/database');
    const db = getDb();
    db.prepare(
      'INSERT INTO workflows (id, name, owner_name, repo_name) VALUES (?, ?, ?, ?)'
    ).run(1, 'CI', 'org', 'repo');
    db.prepare(
      `INSERT INTO workflow_runs (id, workflow_id, owner_name, repo_name, workflow_name,
       run_number, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(100, 1, 'org', 'repo', 'CI', 42, 'completed', '2026-01-01T00:00:00Z', '2026-01-01T00:05:00Z');
    const row = db.prepare('SELECT * FROM workflow_runs WHERE id = 100').get();
    expect(row.workflow_name).toBe('CI');
    expect(row.run_number).toBe(42);
  });

  test('can insert and query workflow_jobs', () => {
    const { getDb } = require('../src/db/database');
    const db = getDb();
    db.prepare('INSERT INTO workflows (id, name, owner_name, repo_name) VALUES (?, ?, ?, ?)').run(1, 'CI', 'org', 'repo');
    db.prepare(
      `INSERT INTO workflow_runs (id, workflow_id, owner_name, repo_name, workflow_name,
       run_number, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(100, 1, 'org', 'repo', 'CI', 42, 'completed', '2026-01-01T00:00:00Z', '2026-01-01T00:05:00Z');
    db.prepare(
      'INSERT INTO workflow_jobs (id, run_id, name, status) VALUES (?, ?, ?, ?)'
    ).run(200, 100, 'build', 'completed');
    const row = db.prepare('SELECT * FROM workflow_jobs WHERE id = 200').get();
    expect(row.name).toBe('build');
  });

  test('indexes are created', () => {
    const { getDb } = require('../src/db/database');
    const db = getDb();
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
    ).all();
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_runs_created_at');
    expect(names).toContain('idx_runs_repo');
    expect(names).toContain('idx_runs_status');
    expect(names).toContain('idx_runs_conclusion');
    expect(names).toContain('idx_runs_branch');
    expect(names).toContain('idx_jobs_run_id');
  });
});
