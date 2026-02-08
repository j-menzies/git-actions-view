const express = require('express');
const { ensureAuthenticated } = require('../auth/middleware');
const { getDb } = require('../db/database');
const syncDispatcher = require('../services/syncDispatcher');

const router = express.Router();

/**
 * POST /api/v1/admin/db/rebuild — wipe all cached data and trigger full re-sync.
 */
router.post('/api/v1/admin/db/rebuild', ensureAuthenticated, (req, res) => {
  const db = getDb();

  try {
    db.exec('DELETE FROM workflow_jobs');
    db.exec('DELETE FROM workflow_runs');
    db.exec('DELETE FROM workflows');
    console.log('Database cache cleared — all workflow data deleted');

    // Restart the dispatcher to trigger a fresh discovery sync
    syncDispatcher.restart();

    res.json({ success: true, message: 'Database cache cleared. Re-sync started.' });
  } catch (err) {
    console.error('Database rebuild error:', err.message);
    res.status(500).json({ error: 'Failed to rebuild database' });
  }
});

module.exports = router;
