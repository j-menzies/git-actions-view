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
  const stmt = db.prepare(`
    INSERT INTO workflow_runs (id, workflow_id, owner_name, repo_name, workflow_name, run_number,
      status, conclusion, event, branch, actor_login, actor_avatar_url, html_url,
      created_at, updated_at, run_started_at, run_attempt)
    VALUES (@id, @workflow_id, @owner_name, @repo_name, @workflow_name, @run_number,
      @status, @conclusion, @event, @branch, @actor_login, @actor_avatar_url, @html_url,
      @created_at, @updated_at, @run_started_at, @run_attempt)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, conclusion = @conclusion, updated_at = @updated_at,
      run_started_at = @run_started_at, run_attempt = @run_attempt
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
    html_url: run.html_url || null,
    created_at: run.created_at,
    updated_at: run.updated_at,
    run_started_at: run.run_started_at || null,
    run_attempt: run.run_attempt || 1,
  });
}

function upsertJob(job, runId) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO workflow_jobs (id, run_id, name, status, conclusion, started_at, completed_at,
      html_url, runner_name, run_attempt)
    VALUES (@id, @run_id, @name, @status, @conclusion, @started_at, @completed_at,
      @html_url, @runner_name, @run_attempt)
    ON CONFLICT(id) DO UPDATE SET
      status = @status, conclusion = @conclusion, started_at = @started_at,
      completed_at = @completed_at, runner_name = @runner_name, run_attempt = @run_attempt
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
  });
}

async function syncRepoRuns(owner, repo, accessToken) {
  try {
    // Fetch workflows
    const workflows = await githubApi.listWorkflows(owner, repo, accessToken);
    for (const wf of workflows) {
      upsertWorkflow(wf, owner, repo);
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

    // Fetch jobs for new/recent runs
    for (const run of runs.slice(0, 10)) {
      try {
        const jobs = await githubApi.listRunJobs(owner, repo, run.id, accessToken);
        for (const job of jobs) {
          upsertJob(job, run.id);
        }
      } catch (err) {
        console.error(`Failed to fetch jobs for run ${run.id}: ${err.message}`);
      }
    }

    return activeRuns;
  } catch (err) {
    console.error(`Failed to sync ${owner}/${repo}: ${err.message}`);
    return [];
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

    // Also refresh jobs
    const jobs = await githubApi.listRunJobs(owner, repo, runId, accessToken);
    for (const job of jobs) {
      upsertJob(job, runId);
    }

    return run.status === 'completed';
  } catch (err) {
    console.error(`Failed to sync active run ${runId}: ${err.message}`);
    return false;
  }
}

module.exports = { syncRepoRuns, syncActiveRun };
