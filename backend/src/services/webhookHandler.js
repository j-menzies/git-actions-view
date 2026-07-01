const { upsertWorkflow, upsertRun, upsertJob } = require('./syncService');
const githubApi = require('./githubApi');
const reposService = require('./reposService');
const { broadcast } = require('./sseManager');
const config = require('../config');

/**
 * Check if a repo is being monitored (visible in the repos table).
 */
function isMonitoredRepo(owner, repo) {
  const repos = reposService.getVisibleRepos();
  return repos.some(r => r.owner === owner && r.name === repo);
}

/**
 * Handle a workflow_run webhook event.
 * Fires when a run is requested, starts, or completes.
 */
async function handleWorkflowRun(payload) {
  const { action, workflow_run: run, workflow, repository } = payload;
  if (!run || !repository) return;

  const owner = repository.owner?.login;
  const repo = repository.name;
  if (!owner || !repo) return;
  if (!isMonitoredRepo(owner, repo)) return;

  const repoFullName = `${owner}/${repo}`;
  console.log(`[webhook] workflow_run ${action} for ${repoFullName}#${run.id}`);

  // Ensure the workflow exists in DB
  if (workflow) {
    upsertWorkflow(workflow, owner, repo);
  }

  // Upsert the run
  const workflowName = workflow?.name || run.name || 'Unknown';
  upsertRun(run, owner, repo, workflowName);

  // When a run completes, fetch jobs via API (webhook payload doesn't include jobs)
  if (action === 'completed') {
    try {
      const token = config.githubAccessToken;
      const jobs = await githubApi.listRunJobs(owner, repo, run.id, token);
      for (const job of jobs) {
        upsertJob(job, run.id);
      }
      console.log(`[webhook] fetched ${jobs.length} job(s) for completed run ${repoFullName}#${run.id}`);
    } catch (err) {
      console.error(`[webhook] failed to fetch jobs for ${repoFullName}#${run.id}: ${err.message}`);
    }
  }

  broadcast('sync:complete', { repo: repoFullName, type: 'webhook' });
}

/**
 * Handle a workflow_job webhook event.
 * Fires when a job is queued, starts, or completes.
 */
function handleWorkflowJob(payload) {
  const { action, workflow_job: job, repository } = payload;
  if (!job || !repository) return;

  const owner = repository.owner?.login;
  const repo = repository.name;
  if (!owner || !repo) return;
  if (!isMonitoredRepo(owner, repo)) return;

  const repoFullName = `${owner}/${repo}`;
  console.log(`[webhook] workflow_job ${action} for ${repoFullName}#${job.run_id}/${job.name}`);

  upsertJob(job, job.run_id);
  broadcast('sync:complete', { repo: repoFullName, type: 'webhook' });
}

/**
 * Process a verified webhook payload.
 */
async function processWebhook(event, payload) {
  switch (event) {
    case 'workflow_run':
      await handleWorkflowRun(payload);
      break;
    case 'workflow_job':
      handleWorkflowJob(payload);
      break;
    default:
      console.log(`[webhook] ignoring event: ${event}`);
  }
}

module.exports = { processWebhook };
