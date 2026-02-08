const express = require('express');
const { ensureAuthenticated, getAccessToken } = require('../auth/middleware');
const { listUserRepos } = require('../services/githubApi');

const router = express.Router();

/**
 * GET /api/v1/github/repos — list GitHub repos accessible to the authenticated user.
 */
router.get('/api/v1/github/repos', ensureAuthenticated, async (req, res) => {
  const token = getAccessToken(req);
  if (!token) {
    return res.status(400).json({ error: 'No GitHub access token available' });
  }

  try {
    const repos = await listUserRepos(token);
    res.json({ repos });
  } catch (err) {
    console.error('Failed to list user repos:', err.message);
    res.status(502).json({ error: 'Failed to fetch repositories from GitHub' });
  }
});

module.exports = router;
