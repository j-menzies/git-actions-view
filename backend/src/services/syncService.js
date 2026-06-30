const { getDb } = require('../db/database');
const githubApi = require('./githubApi');

function upsertWorkflow(workflow, ownerName, repoName) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO workflows (id, name, owner_name, repo_name, path, state)
    VALUES (@id, @name, @owner_name, @repo_name, @path, @state)
    ON CONFLICT(id) DO UPDATE SET
      name = @name, state = @state, path = @path
  `);
  stmt.run({
    id: workflow.id,
    name: workflow.name,
    owner_name: ownerName,
    repo_name: repoName,
    path: workflow.path || null,
    state: workflow.state || null,
  });
}

function upsertRun(run, ownerName, repoName, workflowName) {
  const db = getDb();

  // Extract pull request URL if present
  const pullRequestUrl = run.pull_requests && run.pull_requests.length > 0
    ? `https://github.com/${ownerName}/${repoName}/pull/${run.pull_requests[0].number}`
    : null;

  const stmt = db.prepare(`
    INSERT INTO workflow_runs (id, workflow_id, owner_name, repo_name, workflow_name, run_number,
      status, conclusion, event, branch, actor_login, actor_avatar_url, actor_type, html_url,
      created_at, updated_at, run_started_at, run_attempt, pull_request_url)
    VALUES (@id, @workflow_id, @owner_name, @repo_name, @workflow_name, @run_number,
      @status, @conclusion, @event, @branch, @actor_login, @actor_avatar_url, @actor_type, @html_url,
      @created_at, @updated_at, @run_started_at, @run_attempt, @pull_request_url)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, conclusion = @conclusion, updated_at = @updated_at,
      run_started_at = @run_started_at, run_attempt = @run_attempt,
      pull_request_url = @pull_request_url, actor_type = @actor_type
  `);
  stmt.run({
    id: run.id,
    workflow_id: run.workflow_id,
    owner_name: ownerName,
    repo_name: repoName,
    workflow_name: workflowName,
    run_number: run.run_number,
    status: run.status,
    conclusion: run.conclusion || null,
    event: run.event || null,
    branch: run.head_branch || null,
    actor_login: run.actor?.login || null,
    actor_avatar_url: run.actor?.avatar_url || null,
    actor_type: run.actor?.type || null,
    html_url: run.html_url || null,
    created_at: run.created_at,
    updated_at: run.updated_at,
    run_started_at: run.run_started_at || null,
    run_attempt: run.run_attempt || 1,
    pull_request_url: pullRequestUrl,
  });
}

function upsertJob(job, runId) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO workflow_jobs (id, run_id, name, status, conclusion, started_at, completed_at,
      html_url, runner_name, run_attempt, labels)
    VALUES (@id, @run_id, @name, @status, @conclusion, @started_at, @completed_at,
      @html_url, @runner_name, @run_attempt, @labels)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, conclusion = @conclusion, started_at = @started_at,
      completed_at = @completed_at, runner_name = @runner_name, run_attempt = @run_attempt,
      labels = @labels
  `);
  stmt.run({
    id: job.id,
    run_id: runId,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion || null,
    started_at: job.started_at || null,
    completed_at: job.completed_at || null,
    html_url: job.html_url || null,
    runner_name: job.runner_name || null,
    run_attempt: job.run_attempt || 1,
    labels: job.labels ? JSON.stringify(job.labels) : null,
  });
}

// In-memory workflow cache to avoid re-fetching every cycle
const workflowCache = new Map();
const WORKFLOW_CACHE_CYCLES = 10;

async function syncRepoRuns(owner, repo, accessToken) {
  const repoFullName = `${owner}/${repo}`;
  try {
    const db = getDb();
    const cacheKey = repoFullName;
    let workflows;
    const cached = workflowCache.get(cacheKey);

    if (cached && cached.cyclesSince < WORKFLOW_CACHE_CYCLES) {
      workflows = cached.workflows;
      cached.cyclesSince++;
      console.log(`[sync] ${repoFullName}: using cached workflows (${workflows.length}), cycle ${cached.cyclesSince}/${WORKFLOW_CACHE_CYCLES}`);
    } else {
      workflows = await githubApi.listWorkflows(owner, repo, accessToken);
      for (const wf of workflows) {
        upsertWorkflow(wf, owner, repo);
      }
      workflowCache.set(cacheKey, { workflows, cyclesSince: 0 });
      console.log(`[sync] ${repoFullName}: fetched ${workflows.length} workflow(s) from API`);
    }

    // Build a name lookup for workflows
    const workflowNames = {};
    for (const wf of workflows) {
      workflowNames[wf.id] = wf.name;
    }

    // Fetch recent runs
    const runsData = await githubApi.listWorkflowRuns(owner, repo, { per_page: 30 }, accessToken);
    const runs = runsData.workflow_runs || [];
    const activeRuns = [];

    for (const run of runs) {
      const workflowName = workflowNames[run.workflow_id] || 'Unknown';
      upsertRun(run, owner, repo, workflowName);

      if (['queued', 'in_progress', 'waiting'].includes(run.status)) {
        activeRuns.push({ id: run.id, owner, repo });
      }
    }

    // Fetch jobs only for runs that need them
    const jobCountStmt = db.prepare(
      'SELECT COUNT(*) as cnt FROM workflow_jobs WHERE run_id = ? AND conclusion IS NOT NULL'
    );

    let jobsFetched = 0;
    let jobsSkipped = 0;

    for (const run of runs) {
      const isActive = ['queued', 'in_progress', 'waiting'].includes(run.status);

      if (isActive) {
        // Always fetch jobs for active runs
        try {
          const jobs = await githubApi.listRunJobs(owner, repo, run.id, accessToken);
          for (const job of jobs) {
            upsertJob(job, run.id);
          }
          jobsFetched += jobs.length;
        } catch (err) {
          console.error(`[sync] ${repoFullName}: failed to fetch jobs for active run ${run.id}: ${err.message}`);
        }
        continue;
      }

      // For completed runs, skip if we already have jobs with conclusions
      if (run.status === 'completed') {
        const existing = jobCountStmt.get(run.id);
        if (existing.cnt > 0) {
          jobsSkipped++;
          continue;
        }

        try {
          const jobs = await githubApi.listRunJobs(owner, repo, run.id, accessToken);
          for (const job of jobs) {
            upsertJob(job, run.id);
          }
          jobsFetched++;
        } catch (err) {
          console.error(`[sync] ${repoFullName}: failed to fetch jobs for run ${run.id}: ${err.message}`);
        }
      }
    }

    console.log(`[sync] ${repoFullName}: ${runs.length} runs, ${activeRuns.length} active, jobs fetched=${jobsFetched} skipped=${jobsSkipped}`);
    return activeRuns;
  } catch (err) {
    console.error(`[sync] ${repoFullName}: FAILED — ${err.message}`);
    return null;
  }
}

async function syncActiveRun(owner, repo, runId, accessToken) {
  try {
    const run = await githubApi.getWorkflowRun(owner, repo, runId, accessToken);
    const db = getDb();

    // Get workflow name from DB
    const existing = db.prepare('SELECT workflow_name FROM workflow_runs WHERE id = ?').get(runId);
    const workflowName = existing?.workflow_name || 'Unknown';

    upsertRun(run, owner, repo, workflowName);

    // Also refresh jobs (filter=latest ensures only current attempt)
    const jobs = await githubApi.listRunJobs(owner, repo, runId, accessToken);
    for (const job of jobs) {
      upsertJob(job, runId);
    }

    // If run is completed, clean up stale jobs from previous attempts
    if (run.status === 'completed' && jobs.length > 0) {
      const latestJobIds = jobs.map(j => j.id);
      const placeholders = latestJobIds.map(() => '?').join(',');
      db.prepare(
        `DELETE FROM workflow_jobs WHERE run_id = ? AND id NOT IN (${placeholders})`
      ).run(runId, ...latestJobIds);
    }

    // Only mark as done if run is completed AND all jobs have resolved
    const allJobsDone = jobs.every(j => j.conclusion !== null);
    return run.status === 'completed' && allJobsDone;
  } catch (err) {
    console.error(`Failed to sync active run ${runId}: ${err.message}`);
    return false;
  }
}

function _resetCache() {
  workflowCache.clear();
}

module.exports = { upsertWorkflow, upsertRun, upsertJob, syncRepoRuns, syncActiveRun, _resetCache };
