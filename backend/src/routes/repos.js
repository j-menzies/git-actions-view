const express = require('express');
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated } = require('../auth/middleware');
const { getDb } = require('../db/database');
const reposService = require('../services/reposService');
const syncDispatcher = require('../services/syncDispatcher');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/v1/repos — list all repos (including hidden).
 */
router.get('/api/v1/repos', ensureAuthenticated, (req, res) => {
  const repos = reposService.getAllRepos();
  res.json({ repos });
});

/**
 * POST /api/v1/repos — add a new repo and trigger immediate sync.
 */
router.post('/api/v1/repos', ensureAuthenticated, async (req, res) => {
  const { owner, name } = req.body;
  if (!owner || !name) {
    return res.status(400).json({ error: 'owner and name are required' });
  }

  const repo = reposService.addRepo(owner.trim(), name.trim());
  if (!repo) {
    return res.status(500).json({ error: 'Failed to add repository' });
  }

  // Trigger immediate sync for the new repo
  syncDispatcher.syncSingleRepo(repo.owner, repo.name);

  res.status(201).json({ repo });
});

/**
 * PUT /api/v1/repos/:id — update repo (toggle hidden).
 */
router.put('/api/v1/repos/:id', ensureAuthenticated, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { hidden } = req.body;

  if (hidden === undefined) {
    return res.status(400).json({ error: 'hidden field is required' });
  }

  const repo = reposService.updateRepo(id, { hidden });
  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repo });
});

/**
 * DELETE /api/v1/repos/:id — remove repo and all its data.
 */
router.delete('/api/v1/repos/:id', ensureAuthenticated, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const deleted = reposService.deleteRepo(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Repository not found' });
  }
  res.json({ success: true });
});

/**
 * GET /api/v1/repos/:id/stats — per-repo metrics.
 */
router.get('/api/v1/repos/:id/stats', ensureAuthenticated, (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id, 10);
  const repo = reposService.getAllRepos().find(r => r.id === id);
  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const { owner, name } = repo;

  try {
    const runCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM workflow_runs WHERE owner_name = ? AND repo_name = ?'
    ).get(owner, name).cnt;

    const workflowCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM workflows WHERE owner_name = ? AND repo_name = ?'
    ).get(owner, name).cnt;

    const jobCount = db.prepare(
      `SELECT COUNT(*) as cnt FROM workflow_jobs
       WHERE run_id IN (SELECT id FROM workflow_runs WHERE owner_name = ? AND repo_name = ?)`
    ).get(owner, name).cnt;

    const latestRun = db.prepare(
      'SELECT created_at FROM workflow_runs WHERE owner_name = ? AND repo_name = ? ORDER BY created_at DESC LIMIT 1'
    ).get(owner, name);

    // Estimate data size based on proportion of runs
    const totalRuns = db.prepare('SELECT COUNT(*) as cnt FROM workflow_runs').get().cnt;
    let estimatedSizeBytes = 0;
    try {
      const stat = fs.statSync(path.resolve(config.dbPath));
      estimatedSizeBytes = totalRuns > 0 ? Math.round((runCount / totalRuns) * stat.size) : 0;
    } catch {
      // ignore
    }

    res.json({
      runCount,
      workflowCount,
      jobCount,
      latestRun: latestRun?.created_at || null,
      estimatedSizeBytes,
    });
  } catch (err) {
    console.error('Repo stats error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve repo stats' });
  }
});

module.exports = router;
