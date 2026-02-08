const { getDb } = require('../db/database');
const config = require('../config');

/**
 * Get all repos (including hidden).
 * @returns {Array<{id: number, owner: string, name: string, hidden: number, created_at: string}>}
 */
function getAllRepos() {
  const db = getDb();
  return db.prepare('SELECT * FROM repos ORDER BY owner, name').all();
}

/**
 * Get only visible (non-hidden) repos.
 * @returns {Array<{id: number, owner: string, name: string}>}
 */
function getVisibleRepos() {
  const db = getDb();
  return db.prepare('SELECT * FROM repos WHERE hidden = 0 ORDER BY owner, name').all();
}

/**
 * Add a repo (INSERT OR IGNORE to avoid duplicates).
 * @param {string} owner
 * @param {string} name
 * @returns {{id: number, owner: string, name: string, hidden: number, created_at: string}|null}
 */
function addRepo(owner, name) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO repos (owner, name) VALUES (@owner, @name)').run({ owner, name });
  return db.prepare('SELECT * FROM repos WHERE owner = @owner AND name = @name').get({ owner, name });
}

/**
 * Update a repo's hidden flag.
 * @param {number} id
 * @param {{ hidden: number }} data
 */
function updateRepo(id, data) {
  const db = getDb();
  if (data.hidden !== undefined) {
    db.prepare('UPDATE repos SET hidden = @hidden WHERE id = @id').run({ id, hidden: data.hidden ? 1 : 0 });
  }
  return db.prepare('SELECT * FROM repos WHERE id = ?').get(id);
}

/**
 * Delete a repo and all its associated data.
 * @param {number} id
 */
function deleteRepo(id) {
  const db = getDb();
  const repo = db.prepare('SELECT * FROM repos WHERE id = ?').get(id);
  if (!repo) return false;

  // Delete associated data
  db.prepare(`
    DELETE FROM workflow_jobs WHERE run_id IN (
      SELECT id FROM workflow_runs WHERE owner_name = @owner AND repo_name = @name
    )
  `).run({ owner: repo.owner, name: repo.name });
  db.prepare('DELETE FROM workflow_runs WHERE owner_name = @owner AND repo_name = @name').run({ owner: repo.owner, name: repo.name });
  db.prepare('DELETE FROM workflows WHERE owner_name = @owner AND repo_name = @name').run({ owner: repo.owner, name: repo.name });
  db.prepare('DELETE FROM repos WHERE id = ?').run(id);
  return true;
}

/**
 * Seed repos table from environment config (INSERT OR IGNORE).
 * Called on startup so env var repos are always present.
 */
function syncReposFromConfig() {
  const db = getDb();
  const stmt = db.prepare('INSERT OR IGNORE INTO repos (owner, name) VALUES (@owner, @name)');
  const insertMany = db.transaction((repos) => {
    for (const repo of repos) {
      stmt.run({ owner: repo.owner, name: repo.name });
    }
  });
  insertMany(config.repos);
}

module.exports = { getAllRepos, getVisibleRepos, addRepo, updateRepo, deleteRepo, syncReposFromConfig };
