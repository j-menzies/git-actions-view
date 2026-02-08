const express = require('express');
const { ensureAuthenticated } = require('../auth/middleware');
const reposService = require('../services/reposService');
const syncDispatcher = require('../services/syncDispatcher');

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

module.exports = router;
