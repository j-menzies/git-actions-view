const express = require('express');
const { ensureAuthenticated } = require('../auth/middleware');
const settingsService = require('../services/settingsService');
const syncDispatcher = require('../services/syncDispatcher');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/v1/settings — returns current settings with defaults.
 */
router.get('/api/v1/settings', ensureAuthenticated, (req, res) => {
  const intervals = settingsService.getPollingIntervals();
  const pollTimes = syncDispatcher.getLastPollTimes();
  res.json({
    discoveryPollSeconds: intervals.discoveryPollSeconds,
    activePollSeconds: intervals.activePollSeconds,
    lastDiscoveryPoll: pollTimes.discovery,
    lastActivePoll: pollTimes.active,
    rateLimit: pollTimes.rateLimit,
  });
});

/**
 * PUT /api/v1/settings — update settings. Restarts dispatcher if polling changed.
 */
router.put('/api/v1/settings', ensureAuthenticated, (req, res) => {
  const { discoveryPollSeconds, activePollSeconds } = req.body;

  let pollingChanged = false;

  if (discoveryPollSeconds !== undefined) {
    const val = parseInt(discoveryPollSeconds, 10);
    if (isNaN(val) || val < 5) {
      return res.status(400).json({ error: 'discoveryPollSeconds must be >= 5' });
    }
    settingsService.setSetting('discovery_poll_seconds', val);
    config.discoveryPollSeconds = val;
    pollingChanged = true;
  }

  if (activePollSeconds !== undefined) {
    const val = parseInt(activePollSeconds, 10);
    if (isNaN(val) || val < 5) {
      return res.status(400).json({ error: 'activePollSeconds must be >= 5' });
    }
    settingsService.setSetting('active_poll_seconds', val);
    config.activePollSeconds = val;
    pollingChanged = true;
  }

  if (pollingChanged) {
    syncDispatcher.restart();
  }

  const intervals = settingsService.getPollingIntervals();
  res.json({
    discoveryPollSeconds: intervals.discoveryPollSeconds,
    activePollSeconds: intervals.activePollSeconds,
    restarted: pollingChanged,
  });
});

module.exports = router;
