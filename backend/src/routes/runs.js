const express = require('express');
const { getDb } = require('../db/database');
const { ensureAuthenticated } = require('../auth/middleware');
const { formatDuration } = require('../utils/duration');

const router = express.Router();

router.get('/api/v1/runs', ensureAuthenticated, (req, res) => {
  const db = getDb();
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
  const before = req.query.before || null;
  const repo = req.query.repo || null;
  const status = req.query.status || null;
  const branch = req.query.branch || null;
  const from = req.query.from || null;
  const to = req.query.to || null;

  let where = [];
  let params = {};

  if (before) {
    where.push('r.created_at < @before');
    params.before = before;
  }
  if (repo) {
    if (repo.includes('/')) {
      const [owner, name] = repo.split('/');
      where.push('r.owner_name = @owner AND r.repo_name = @repoName');
      params.owner = owner;
      params.repoName = name;
    } else {
      where.push('r.repo_name = @repoName');
      params.repoName = repo;
    }
  }
  if (status) {
    // Allow filtering by conclusion (success, failure, etc.) or status (in_progress, queued)
    if (['queued', 'in_progress', 'waiting'].includes(status)) {
      where.push('r.status = @statusFilter');
    } else {
      where.push('r.conclusion = @statusFilter');
    }
    params.statusFilter = status;
  }
  if (branch) {
    where.push('r.branch = @branch');
    params.branch = branch;
  }
  if (from) {
    where.push('r.created_at >= @fromDate');
    params.fromDate = from;
  }
  if (to) {
    where.push('r.created_at <= @toDate');
    params.toDate = to;
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const runs = db
    .prepare(
      `SELECT r.*
       FROM workflow_runs r
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT @limit`
    )
    .all({ ...params, limit: limit + 1 });

  const hasMore = runs.length > limit;
  const resultRuns = runs.slice(0, limit);

  // Get job summaries for these runs
  const runIds = resultRuns.map(r => r.id);
  let jobSummaries = {};
  if (runIds.length > 0) {
    const placeholders = runIds.map(() => '?').join(',');
    const jobRows = db
      .prepare(
        `SELECT run_id, conclusion, COUNT(*) as cnt
         FROM workflow_jobs
         WHERE run_id IN (${placeholders})
         GROUP BY run_id, conclusion`
      )
      .all(...runIds);

    for (const row of jobRows) {
      if (!jobSummaries[row.run_id]) {
        jobSummaries[row.run_id] = { total: 0, success: 0, failure: 0, in_progress: 0, other: 0 };
      }
      const summary = jobSummaries[row.run_id];
      summary.total += row.cnt;
      if (row.conclusion === 'success') summary.success += row.cnt;
      else if (row.conclusion === 'failure') summary.failure += row.cnt;
      else if (row.conclusion === null) summary.in_progress += row.cnt;
      else summary.other += row.cnt;
    }
  }

  const mapped = resultRuns.map(r => ({
    id: r.id,
    ownerName: r.owner_name,
    repoName: r.repo_name,
    workflowName: r.workflow_name,
    runNumber: r.run_number,
    status: r.status,
    conclusion: r.conclusion,
    event: r.event,
    branch: r.branch,
    actorLogin: r.actor_login,
    actorAvatarUrl: r.actor_avatar_url,
    htmlUrl: r.html_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pullRequestUrl: r.pull_request_url || null,
    duration: formatDuration(r.run_started_at || r.created_at, r.updated_at),
    jobSummary: jobSummaries[r.id] || { total: 0, success: 0, failure: 0, in_progress: 0, other: 0 },
  }));

  const nextCursor = hasMore && resultRuns.length > 0
    ? resultRuns[resultRuns.length - 1].created_at
    : null;

  res.json({
    runs: mapped,
    nextCursor,
    hasMore,
  });
});

module.exports = router;
