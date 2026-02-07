function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id          INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      owner_name  TEXT NOT NULL,
      repo_name   TEXT NOT NULL,
      path        TEXT,
      state       TEXT
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id               INTEGER PRIMARY KEY,
      workflow_id      INTEGER NOT NULL REFERENCES workflows(id),
      owner_name       TEXT NOT NULL,
      repo_name        TEXT NOT NULL,
      workflow_name    TEXT NOT NULL,
      run_number       INTEGER NOT NULL,
      status           TEXT NOT NULL,
      conclusion       TEXT,
      event            TEXT,
      branch           TEXT,
      actor_login      TEXT,
      actor_avatar_url TEXT,
      html_url         TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      run_started_at   TEXT,
      run_attempt      INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS workflow_jobs (
      id               INTEGER PRIMARY KEY,
      run_id           INTEGER NOT NULL REFERENCES workflow_runs(id),
      name             TEXT NOT NULL,
      status           TEXT NOT NULL,
      conclusion       TEXT,
      started_at       TEXT,
      completed_at     TEXT,
      html_url         TEXT,
      runner_name      TEXT,
      run_attempt      INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_runs_created_at ON workflow_runs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_repo ON workflow_runs(owner_name, repo_name);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON workflow_runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_conclusion ON workflow_runs(conclusion);
    CREATE INDEX IF NOT EXISTS idx_runs_branch ON workflow_runs(branch);
    CREATE INDEX IF NOT EXISTS idx_jobs_run_id ON workflow_jobs(run_id);
  `);
}

module.exports = { runMigrations };
