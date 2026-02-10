const express = require('express');
const axios = require('axios');
const { ensureAuthenticated, getAccessToken } = require('../auth/middleware');
const { listUserRepos } = require('../services/githubApi');

const router = express.Router();

// GitHub Status API cache
let statusCache = null;
let statusCacheTime = 0;
const STATUS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

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

/**
 * GET /api/v1/github/status — proxy GitHub's public status API with caching.
 */
router.get('/api/v1/github/status', ensureAuthenticated, async (req, res) => {
  const now = Date.now();
  if (statusCache && now - statusCacheTime < STATUS_CACHE_TTL_MS) {
    return res.json(statusCache);
  }

  try {
    const { data } = await axios.get('https://www.githubstatus.com/api/v2/summary.json', {
      timeout: 10000,
    });

    const result = {
      status: {
        indicator: data.status?.indicator || 'unknown',
        description: data.status?.description || 'Unknown',
      },
      components: (data.components || [])
        .filter(c => !c.group && c.name !== 'Visit www.githubstatus.com for more information')
        .map(c => ({
          name: c.name,
          status: c.status,
        })),
      incidents: (data.incidents || []).map(inc => ({
        name: inc.name,
        impact: inc.impact,
        status: inc.status,
        startedAt: inc.started_at,
        updatedAt: inc.updated_at,
        latestUpdate: inc.incident_updates?.[0]?.body || '',
      })),
    };

    statusCache = result;
    statusCacheTime = now;
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch GitHub status:', err.message);
    res.json({
      status: { indicator: 'unknown', description: 'Unable to fetch status' },
      components: [],
      incidents: [],
    });
  }
});

module.exports = router;
