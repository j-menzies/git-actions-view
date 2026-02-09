const express = require('express');
const fs = require('fs');
const path = require('path');
const { ensureAuthenticated } = require('../auth/middleware');
const { getDb } = require('../db/database');
const syncDispatcher = require('../services/syncDispatcher');
const config = require('../config');

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

/**
 * GET /api/v1/admin/db/stats — return database metrics.
 */
router.get('/api/v1/admin/db/stats', ensureAuthenticated, (req, res) => {
  const db = getDb();

  try {
    const resolvedPath = path.resolve(config.dbPath);
    const stat = fs.statSync(resolvedPath);
    const fileSizeBytes = stat.size;

    const workflowCount = db.prepare('SELECT COUNT(*) as cnt FROM workflows').get().cnt;
    const runCount = db.prepare('SELECT COUNT(*) as cnt FROM workflow_runs').get().cnt;
    const jobCount = db.prepare('SELECT COUNT(*) as cnt FROM workflow_jobs').get().cnt;
    const repoCount = db.prepare('SELECT COUNT(*) as cnt FROM repos').get().cnt;

    const oldest = db.prepare('SELECT MIN(created_at) as ts FROM workflow_runs').get().ts;
    const newest = db.prepare('SELECT MAX(created_at) as ts FROM workflow_runs').get().ts;

    res.json({
      fileSizeBytes,
      filePath: resolvedPath,
      rowCounts: {
        workflows: workflowCount,
        workflowRuns: runCount,
        workflowJobs: jobCount,
        repos: repoCount,
      },
      dataAge: {
        oldest: oldest || null,
        newest: newest || null,
      },
    });
  } catch (err) {
    console.error('DB stats error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve database stats' });
  }
});

module.exports = router;
