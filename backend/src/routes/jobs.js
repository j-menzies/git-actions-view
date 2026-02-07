const express = require('express');
const { getDb } = require('../db/database');
const { ensureAuthenticated } = require('../auth/middleware');
const { formatDuration } = require('../utils/duration');

const router = express.Router();

router.get('/api/v1/runs/:runId/jobs', ensureAuthenticated, (req, res) => {
  const db = getDb();
  const runId = parseInt(req.params.runId, 10);
  if (isNaN(runId)) {
    return res.status(400).json({ error: 'Invalid run ID' });
  }

  const jobs = db
    .prepare(
      `SELECT * FROM workflow_jobs
       WHERE run_id = ?
       ORDER BY started_at ASC, id ASC`
    )
    .all(runId);

  const mapped = jobs.map(j => ({
    id: j.id,
    name: j.name,
    status: j.status,
    conclusion: j.conclusion,
    startedAt: j.started_at,
    completedAt: j.completed_at,
    duration: formatDuration(j.started_at, j.completed_at),
    htmlUrl: j.html_url,
    runnerName: j.runner_name,
  }));

  res.json({ jobs: mapped });
});

module.exports = router;
